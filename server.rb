#!/usr/bin/env ruby
# frozen_string_literal: true

require 'webrick'
require 'json'
require_relative 'db/database'

port = (ENV['PORT'] || 8080).to_i
host = ENV['HOST'] || '0.0.0.0'
cors_origin = ENV['CORS_ORIGIN'] || '*'
root = File.expand_path(File.dirname(__FILE__))

db = Database.new

class ApiServlet < WEBrick::HTTPServlet::AbstractServlet
  def initialize(server, database, cors_origin)
    super(server)
    @db = database
    @cors_origin = cors_origin
  end

  def do_OPTIONS(req, res)
    set_cors_headers(res)
    res.status = 200
    res.body = ''
  end

  def do_GET(req, res)
    handle_request(req, res)
  end

  def do_POST(req, res)
    handle_request(req, res)
  end

  def do_PUT(req, res)
    handle_request(req, res)
  end

  def do_DELETE(req, res)
    handle_request(req, res)
  end

  private

  def set_cors_headers(res)
    res['Access-Control-Allow-Origin'] = @cors_origin
    res['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    res['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    res['Access-Control-Max-Age'] = '86400'
  end

  def json_response(res, status_code, data)
    set_cors_headers(res)
    res.status = status_code
    res['Content-Type'] = 'application/json'
    res.body = JSON.generate(data)
  end

  def parse_body(req)
    return {} if req.body.nil? || req.body.strip.empty?
    JSON.parse(req.body)
  rescue StandardError
    {}
  end

  def current_user(req)
    auth_header = req['Authorization'] || req['authorization']
    return nil unless auth_header

    token = auth_header.sub(/^Bearer\s+/i, '').strip
    return nil if token.empty?

    @db.find_user_by_session(token)
  end

  def handle_request(req, res)
    path = req.path.sub(%r{^/api}, '')
    path = '/' if path.empty?
    method = req.request_method.upcase
    body = parse_body(req)

    case [method, path]
    # ------------------------------------------
    # Health check
    # ------------------------------------------
    when ['GET', '/health']
      json_response(res, 200, { status: 'healthy', time: Time.now.utc.iso8601, database: 'sqlite' })

    # ------------------------------------------
    # Authentication routes
    # ------------------------------------------
    when ['POST', '/auth/register']
      begin
        result = @db.register_user(body['name'], body['email'], body['password'])
        json_response(res, 201, { success: true, message: 'Registration successful', **result })
      rescue StandardError => e
        json_response(res, 400, { success: false, error: e.message })
      end

    when ['POST', '/auth/login']
      begin
        result = @db.authenticate_user(body['email'], body['password'])
        json_response(res, 200, { success: true, message: 'Login successful', **result })
      rescue StandardError => e
        json_response(res, 401, { success: false, error: e.message })
      end

    when ['POST', '/auth/logout']
      auth_header = req['Authorization'] || req['authorization']
      token = auth_header ? auth_header.sub(/^Bearer\s+/i, '').strip : nil
      @db.delete_session(token) if token
      json_response(res, 200, { success: true, message: 'Logged out successfully' })

    when ['GET', '/auth/me']
      user = current_user(req)
      if user
        json_response(res, 200, { success: true, user: user })
      else
        json_response(res, 401, { success: false, error: 'Unauthorized: Session invalid or expired' })
      end

    # ------------------------------------------
    # Products routes
    # ------------------------------------------
    when ['GET', '/products']
      products = @db.all_products
      json_response(res, 200, { success: true, products: products })

    when ['POST', '/products']
      begin
        product = @db.create_product(body)
        json_response(res, 201, { success: true, product: product })
      rescue StandardError => e
        json_response(res, 400, { success: false, error: e.message })
      end

    # ------------------------------------------
    # Orders routes (Strictly user-protected)
    # ------------------------------------------
    when ['GET', '/orders']
      user = current_user(req)
      unless user
        return json_response(res, 401, { success: false, error: 'Please login to view your orders' })
      end

      # Admin users can see all orders if requested with ?all=true
      if user[:role] == 'admin' && req.query['all'] == 'true'
        orders = @db.all_orders
      else
        orders = @db.user_orders(user[:id])
      end

      json_response(res, 200, { success: true, orders: orders })

    when ['POST', '/orders']
      user = current_user(req)
      unless user
        return json_response(res, 401, { success: false, error: 'Authentication required to place an order' })
      end

      begin
        order = @db.create_order(
          user[:id],
          body['items'] || [],
          body['shippingDetails'] || {},
          body['paymentMethod'] || 'Credit Card',
          body['totals'] || {}
        )
        json_response(res, 201, { success: true, message: 'Order placed successfully', order: order })
      rescue StandardError => e
        json_response(res, 400, { success: false, error: e.message })
      end

    # ------------------------------------------
    # Coupon validation route
    # ------------------------------------------
    when ['POST', '/coupons/validate']
      code = (body['code'] || '').to_s.strip.upcase
      coupons = {
        'NOVA20'   => { code: 'NOVA20', discount: 20, type: 'percent', desc: '20% off your entire order' },
        'FREESHIP' => { code: 'FREESHIP', discount: 15, type: 'shipping', desc: 'Free standard shipping' },
        'SAVE10'   => { code: 'SAVE10', discount: 10, type: 'fixed', desc: '$10 off orders above $50' },
        'LUXE50'   => { code: 'LUXE50', discount: 50, type: 'fixed', desc: '$50 off luxury orders over $250' }
      }

      if coupons.key?(code)
        json_response(res, 200, { success: true, valid: true, coupon: coupons[code] })
      else
        json_response(res, 404, { success: false, valid: false, error: 'Invalid or expired promo code' })
      end

    else
      # Dynamic path matching: /products/:id or /products/:id/stock
      if path =~ %r{^/products/([^/]+)/stock$} && method == 'PUT'
        prod_id = Regexp.last_match(1)
        product = @db.update_product_stock(prod_id, body['stock'])
        return json_response(res, 200, { success: true, product: product })
      elsif path =~ %r{^/products/([^/]+)$} && method == 'DELETE'
        prod_id = Regexp.last_match(1)
        @db.delete_product(prod_id)
        return json_response(res, 200, { success: true, message: 'Product deleted' })
      elsif path =~ %r{^/products/([^/]+)$} && method == 'GET'
        prod_id = Regexp.last_match(1)
        product = @db.find_product(prod_id)
        if product
          return json_response(res, 200, { success: true, product: product })
        else
          return json_response(res, 404, { success: false, error: 'Product not found' })
        end
      end

      json_response(res, 404, { success: false, error: "API route not found: #{method} /api#{path}" })
    end
  end
end

if __FILE__ == $PROGRAM_NAME
  server = WEBrick::HTTPServer.new(
    Port: port,
    BindAddress: host,
    DocumentRoot: root,
    AccessLog: [],
    Logger: WEBrick::Log.new(nil, WEBrick::BasicLog::WARN)
  )

  server.mount('/api', ApiServlet, db, cors_origin)

  trap('INT') { server.shutdown }
  trap('TERM') { server.shutdown }

  puts '=================================================='
  puts '  NovaStore Full-Stack Web & REST Server Running!'
  puts "  Host: #{host} | Port: #{port}"
  puts "  CORS Origin: #{cors_origin}"
  puts "  API Base: http://#{host == '0.0.0.0' ? 'localhost' : host}:#{port}/api"
  puts "  Storefront: http://#{host == '0.0.0.0' ? 'localhost' : host}:#{port}"
  puts '  Press Ctrl+C to stop the server.'
  puts '=================================================='

  server.start
end
