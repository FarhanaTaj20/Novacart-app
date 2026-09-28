# frozen_string_literal: true

require 'sqlite3'
require 'openssl'
require 'securerandom'
require 'json'
require 'time'

class Database
  attr_reader :db

  def initialize(db_path = nil)
    root = File.expand_path('..', File.dirname(__FILE__))
    @db_path = db_path || File.join(root, 'db', 'ecommerce.sqlite')
    @db = SQLite3::Database.new(@db_path)
    @db.results_as_hash = true
    @db.execute('PRAGMA foreign_keys = ON;')
    setup_tables
    seed_products_if_needed
  end

  def setup_tables
    schema_path = File.join(File.dirname(__FILE__), 'schema.sql')
    schema = File.read(schema_path)
    @db.execute_batch(schema)
  end

  # ==========================================
  #  PASSWORD HASHING & AUTHENTICATION
  # ==========================================

  def hash_password(password, salt)
    iterations = 20_000
    key_length = 32
    digest = OpenSSL::Digest::SHA256.new
    OpenSSL::PKCS5.pbkdf2_hmac(password, salt, iterations, key_length, digest).unpack1('H*')
  end

  def register_user(name, email, password, role = 'customer')
    cleaned_email = email.to_s.strip.downcase
    cleaned_name = name.to_s.strip

    raise 'Name is required' if cleaned_name.empty?
    raise 'Valid email is required' unless cleaned_email =~ /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
    raise 'Password must be at least 6 characters' if password.to_s.length < 6

    existing = @db.get_first_row('SELECT id FROM users WHERE email = ?', cleaned_email)
    raise 'An account with this email already exists' if existing

    salt = SecureRandom.hex(16)
    password_hash = hash_password(password, salt)
    created_at = Time.now.utc.iso8601

    @db.execute(
      'INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cleaned_name, cleaned_email, password_hash, salt, role, created_at]
    )

    user_id = @db.last_insert_row_id
    user = find_user_by_id(user_id)
    token = create_session(user_id)

    { user: sanitize_user(user), token: token }
  end

  def authenticate_user(email, password)
    cleaned_email = email.to_s.strip.downcase
    user = @db.get_first_row('SELECT * FROM users WHERE email = ?', cleaned_email)
    raise 'Invalid email or password' unless user

    expected_hash = hash_password(password, user['salt'])
    # Constant-time comparison to prevent timing attacks
    matches = Rack::Utils.secure_compare(expected_hash, user['password_hash']) rescue (expected_hash == user['password_hash'])
    raise 'Invalid email or password' unless matches

    token = create_session(user['id'])
    { user: sanitize_user(user), token: token }
  end

  def create_session(user_id)
    token = SecureRandom.hex(32)
    created_at = Time.now.utc.iso8601
    expires_at = (Time.now.utc + (30 * 86400)).iso8601 # 30 days validity

    @db.execute(
      'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [token, user_id, created_at, expires_at]
    )
    token
  end

  def find_user_by_session(token)
    return nil if token.nil? || token.to_s.strip.empty?

    row = @db.get_first_row(
      'SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
      [token.strip, Time.now.utc.iso8601]
    )
    sanitize_user(row)
  end

  def delete_session(token)
    return false if token.nil?
    @db.execute('DELETE FROM sessions WHERE token = ?', [token.strip])
    true
  end

  def find_user_by_id(id)
    @db.get_first_row('SELECT * FROM users WHERE id = ?', [id])
  end

  def sanitize_user(user_hash)
    return nil unless user_hash
    {
      id: user_hash['id'],
      name: user_hash['name'],
      email: user_hash['email'],
      role: user_hash['role'] || 'customer',
      created_at: user_hash['created_at']
    }
  end

  # ==========================================
  #  PRODUCTS MANAGEMENT
  # ==========================================

  def all_products
    rows = @db.execute('SELECT * FROM products ORDER BY id ASC')
    rows.map { |r| format_product(r) }
  end

  def find_product(id)
    row = @db.get_first_row('SELECT * FROM products WHERE id = ?', [id])
    format_product(row)
  end

  def create_product(data)
    id = data['id'] || "prod-#{Time.now.to_i}"
    name = data['name'].to_s.strip
    raise 'Product name is required' if name.empty?

    price = data['price'].to_f
    stock = data['stock'].to_i

    @db.execute(
      '''
      INSERT INTO products (
        id, name, tagline, category, category_name, price, original_price,
        discount_percent, rating, review_count, stock, badge, image,
        images_json, description, features_json, colors_json, sizes_json, specs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        id,
        name,
        data['tagline'],
        data['category'] || 'general',
        data['categoryName'] || data['category_name'] || 'General',
        price,
        data['originalPrice'] || data['original_price'],
        data['discountPercent'] || data['discount_percent'] || 0,
        data['rating'] || 5.0,
        data['reviewCount'] || data['review_count'] || 1,
        stock,
        data['badge'] || 'New',
        data['image'],
        JSON.generate(data['images'] || [data['image']]),
        data['description'],
        JSON.generate(data['features'] || []),
        JSON.generate(data['colors'] || []),
        JSON.generate(data['sizes'] || []),
        JSON.generate(data['specs'] || {})
      ]
    )

    find_product(id)
  end

  def update_product_stock(id, new_stock)
    @db.execute('UPDATE products SET stock = ? WHERE id = ?', [new_stock.to_i, id])
    find_product(id)
  end

  def delete_product(id)
    @db.execute('DELETE FROM products WHERE id = ?', [id])
    true
  end

  def format_product(row)
    return nil unless row
    {
      id: row['id'],
      name: row['name'],
      tagline: row['tagline'],
      category: row['category'],
      categoryName: row['category_name'],
      price: row['price'].to_f,
      originalPrice: row['original_price'] ? row['original_price'].to_f : nil,
      discountPercent: row['discount_percent'].to_i,
      rating: row['rating'].to_f,
      reviewCount: row['review_count'].to_i,
      stock: row['stock'].to_i,
      badge: row['badge'],
      image: row['image'],
      images: parse_json(row['images_json'], [row['image']]),
      description: row['description'],
      features: parse_json(row['features_json'], []),
      colors: parse_json(row['colors_json'], []),
      sizes: parse_json(row['sizes_json'], []),
      specs: parse_json(row['specs_json'], {})
    }
  end

  # ==========================================
  #  ORDERS & CHECKOUT
  # ==========================================

  def create_order(user_id, items, shipping_details, payment_method, totals)
    raise 'User authentication required' if user_id.nil?
    raise 'Cart items required' if items.nil? || items.empty?

    order_id = "ORD-#{rand(100_000..999_999)}"
    created_at = Time.now.utc.iso8601

    @db.transaction do
      # 1. Verify and decrement stock
      items.each do |item|
        prod_id = item['productId'] || item['id']
        qty = item['quantity'].to_i
        qty = 1 if qty < 1

        product = @db.get_first_row('SELECT stock, name FROM products WHERE id = ?', [prod_id])
        if product
          current_stock = product['stock'].to_i
          new_stock = [0, current_stock - qty].max
          @db.execute('UPDATE products SET stock = ? WHERE id = ?', [new_stock, prod_id])
        end
      end

      # 2. Insert order
      @db.execute(
        '''
        INSERT INTO orders (
          id, user_id, items_json, shipping_details_json, payment_method, totals_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        [
          order_id,
          user_id,
          JSON.generate(items),
          JSON.generate(shipping_details),
          payment_method,
          JSON.generate(totals),
          'Processing',
          created_at
        ]
      )
    end

    find_order(order_id)
  end

  def find_order(id)
    row = @db.get_first_row('SELECT * FROM orders WHERE id = ?', [id])
    format_order(row)
  end

  def user_orders(user_id)
    rows = @db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user_id])
    rows.map { |r| format_order(r) }
  end

  def all_orders
    rows = @db.execute('SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC')
    rows.map do |r|
      order = format_order(r)
      order[:userName] = r['user_name']
      order[:userEmail] = r['user_email']
      order
    end
  end

  def format_order(row)
    return nil unless row
    {
      orderId: row['id'],
      userId: row['user_id'],
      items: parse_json(row['items_json'], []),
      shippingDetails: parse_json(row['shipping_details_json'], {}),
      paymentMethod: row['payment_method'],
      totals: parse_json(row['totals_json'], {}),
      status: row['status'],
      date: row['created_at']
    }
  end

  private

  def parse_json(str, default)
    return default if str.nil? || str.empty?
    JSON.parse(str)
  rescue StandardError
    default
  end

  def seed_products_if_needed
    count = @db.get_first_value('SELECT COUNT(*) FROM products')
    return if count.to_i.positive?

    seed_file = File.join(File.expand_path('..', File.dirname(__FILE__)), 'js', 'data.js')
    if File.exist?(seed_file)
      content = File.read(seed_file)
      # Extract INITIAL_PRODUCTS array JSON snippet
      if content =~ /const INITIAL_PRODUCTS = (\[[\s\S]*?\]);/
        raw_json = Regexp.last_match(1)
        begin
          products = JSON.parse(raw_json)
          products.each { |p| create_product(p) }
          return
        rescue JSON::ParserError
          # Fallback to hardcoded list if regex parse fails
        end
      end
    end

    # Built-in fallback seed
    fallback_seed.each { |p| create_product(p) }
  end

  def fallback_seed
    [
      {
        'id' => 'prod-1',
        'name' => 'Aura Noise-Canceling Wireless Headphones',
        'tagline' => 'Studio acoustics with active hybrid cancellation',
        'category' => 'audio',
        'categoryName' => 'Audio & Sound',
        'price' => 279.99,
        'originalPrice' => 349.99,
        'discountPercent' => 20,
        'rating' => 4.9,
        'reviewCount' => 428,
        'stock' => 24,
        'badge' => 'Best Seller',
        'image' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        'description' => 'Immerse yourself in crystal clear sound with 40mm titanium drivers and 45 hours of battery life.'
      },
      {
        'id' => 'prod-2',
        'name' => 'Titan Chrono Smartwatch Ultra',
        'tagline' => 'Aerospace titanium with sapphire crystal OLED',
        'category' => 'wearables',
        'categoryName' => 'Wearables & Watches',
        'price' => 389.00,
        'originalPrice' => 449.00,
        'discountPercent' => 13,
        'rating' => 4.8,
        'reviewCount' => 312,
        'stock' => 15,
        'badge' => 'Trending',
        'image' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        'description' => 'Engineered for endurance athletes with dual-band GPS, ECG monitor, and 14 days of power.'
      },
      {
        'id' => 'prod-3',
        'name' => 'Luminary Mechanical Minimalist Keyboard',
        'tagline' => 'Hot-swappable tactile switches with RGB backlighting',
        'category' => 'electronics',
        'categoryName' => 'Electronics & Gadgets',
        'price' => 139.50,
        'originalPrice' => 179.00,
        'discountPercent' => 22,
        'rating' => 4.7,
        'reviewCount' => 189,
        'stock' => 38,
        'badge' => 'Staff Pick',
        'image' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        'description' => 'Crafted with CNC aluminum case, pre-lubed switches, and triple-mode wireless connectivity.'
      },
      {
        'id' => 'prod-4',
        'name' => 'Minimalist Italian Leather Everyday Backpack',
        'tagline' => 'Water-resistant top-grain leather with padded 16" laptop pocket',
        'category' => 'fashion',
        'categoryName' => 'Fashion & Lifestyle',
        'price' => 189.00,
        'originalPrice' => 240.00,
        'discountPercent' => 21,
        'rating' => 4.9,
        'reviewCount' => 215,
        'stock' => 19,
        'badge' => 'New Arrival',
        'image' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        'description' => 'Expertly crafted in Florence using vegetable-tanned Italian leather with RFID protection.'
      },
      {
        'id' => 'prod-5',
        'name' => 'Apex 4K Cinematic Mirrorless Camera',
        'tagline' => 'Full-frame 33MP sensor with 5-axis IBIS and 4K60p video',
        'category' => 'electronics',
        'categoryName' => 'Electronics & Gadgets',
        'price' => 1699.00,
        'originalPrice' => 1899.00,
        'discountPercent' => 10,
        'rating' => 5.0,
        'reviewCount' => 94,
        'stock' => 8,
        'badge' => 'Top Rated',
        'image' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        'description' => 'Capture breathtaking still photography and cinematic 4K 60p 10-bit footage.'
      },
      {
        'id' => 'prod-6',
        'name' => 'Nordic Ceramic Pour-Over & Kettle Set',
        'tagline' => 'Handcrafted matte stoneware with precision gooseneck spout',
        'category' => 'home',
        'categoryName' => 'Home & Living',
        'price' => 84.99,
        'originalPrice' => 109.99,
        'discountPercent' => 22,
        'rating' => 4.8,
        'reviewCount' => 167,
        'stock' => 45,
        'badge' => 'Sale',
        'image' => 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        'description' => 'Brew barista-quality coffee every morning with ceramic stoneware and walnut collar.'
      },
      {
        'id' => 'prod-7',
        'name' => 'Merino Wool Oversized Knit Sweater',
        'tagline' => '100% extra-fine Australian merino wool with ribbed trims',
        'category' => 'fashion',
        'categoryName' => 'Fashion & Lifestyle',
        'price' => 119.00,
        'originalPrice' => 159.00,
        'discountPercent' => 25,
        'rating' => 4.7,
        'reviewCount' => 142,
        'stock' => 28,
        'badge' => 'Trending',
        'image' => 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
        'description' => 'Luxuriously soft and temperature-regulating Australian merino wool.'
      },
      {
        'id' => 'prod-8',
        'name' => 'Horizon Smart Ambient Light Bar',
        'tagline' => 'Dynamic sync backlighting with 16 million colors & music mode',
        'category' => 'electronics',
        'categoryName' => 'Electronics & Gadgets',
        'price' => 69.99,
        'originalPrice' => 89.99,
        'discountPercent' => 22,
        'rating' => 4.6,
        'reviewCount' => 278,
        'stock' => 50,
        'badge' => 'Popular',
        'image' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
        'description' => 'Transform your entertainment setup with reactive RGBIC audio sync lighting.'
      }
    ]
  end
end
