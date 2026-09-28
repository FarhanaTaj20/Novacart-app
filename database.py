# -*- coding: utf-8 -*-
"""
NovaStore Database Layer (Python)
Embedded SQLite3 relational database with PBKDF2 password hashing,
cryptographic session tokens, user-isolated orders, and product stock management.
"""

import sqlite3
import hashlib
import secrets
import json
import os
import re
from datetime import datetime, timedelta, timezone


class Database:
    def __init__(self, db_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.db_path = db_path or os.path.join(base_dir, 'db', 'ecommerce.sqlite')
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON;")
        self.setup_tables()
        self.seed_products_if_needed()

    def setup_tables(self):
        schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schema.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            self.conn.executescript(schema_sql)

    # ==========================================
    #  PASSWORD HASHING & AUTHENTICATION
    # ==========================================

    def hash_password(self, password: str, salt: str) -> str:
        iterations = 20000
        return hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        ).hex()

    def register_user(self, name: str, email: str, password: str, role: str = 'customer'):
        cleaned_email = (email or '').strip().lower()
        cleaned_name = (name or '').strip()

        if not cleaned_name:
            raise ValueError('Name is required')
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', cleaned_email):
            raise ValueError('Valid email address is required')
        if len(password or '') < 6:
            raise ValueError('Password must be at least 6 characters')

        cursor = self.conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (cleaned_email,))
        if cursor.fetchone():
            raise ValueError('An account with this email already exists')

        salt = secrets.token_hex(16)
        password_hash = self.hash_password(password, salt)
        created_at = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            'INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (cleaned_name, cleaned_email, password_hash, salt, role, created_at)
        )
        self.conn.commit()

        user_id = cursor.lastrowid
        user = self.find_user_by_id(user_id)
        token = self.create_session(user_id)

        return {'user': self.sanitize_user(user), 'token': token}

    def authenticate_user(self, email: str, password: str):
        cleaned_email = (email or '').strip().lower()
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (cleaned_email,))
        user = cursor.fetchone()

        if not user:
            raise ValueError('Invalid email or password')

        expected_hash = self.hash_password(password, user['salt'])
        if not secrets.compare_digest(expected_hash, user['password_hash']):
            raise ValueError('Invalid email or password')

        token = self.create_session(user['id'])
        return {'user': self.sanitize_user(user), 'token': token}

    def create_session(self, user_id: int) -> str:
        token = secrets.token_hex(32)
        created_at = datetime.now(timezone.utc).isoformat()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
            (token, user_id, created_at, expires_at)
        )
        self.conn.commit()
        return token

    def find_user_by_session(self, token: str):
        if not token or not token.strip():
            return None

        now = datetime.now(timezone.utc).isoformat()
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
            (token.strip(), now)
        )
        user = cursor.fetchone()
        return self.sanitize_user(user)

    def delete_session(self, token: str) -> bool:
        if not token:
            return False
        cursor = self.conn.cursor()
        cursor.execute('DELETE FROM sessions WHERE token = ?', (token.strip(),))
        self.conn.commit()
        return True

    def find_user_by_id(self, user_id: int):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        return cursor.fetchone()

    def sanitize_user(self, user_row):
        if not user_row:
            return None
        return {
            'id': user_row['id'],
            'name': user_row['name'],
            'email': user_row['email'],
            'role': user_row['role'] or 'customer',
            'created_at': user_row['created_at']
        }

    # ==========================================
    #  PRODUCTS MANAGEMENT
    # ==========================================

    def all_products(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM products ORDER BY id ASC')
        rows = cursor.fetchall()
        return [self.format_product(r) for r in rows]

    def find_product(self, product_id: str):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM products WHERE id = ?', (product_id,))
        row = cursor.fetchone()
        return self.format_product(row)

    def create_product(self, data: dict):
        prod_id = data.get('id') or f"prod-{int(datetime.now(timezone.utc).timestamp())}"
        name = (data.get('name') or '').strip()
        if not name:
            raise ValueError('Product name is required')

        price = float(data.get('price', 0.0))
        stock = int(data.get('stock', 0))

        images = data.get('images') or ([data.get('image')] if data.get('image') else [])

        cursor = self.conn.cursor()
        cursor.execute(
            '''
            INSERT INTO products (
                id, name, tagline, category, category_name, price, original_price,
                discount_percent, rating, review_count, stock, badge, image,
                images_json, description, features_json, colors_json, sizes_json, specs_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                prod_id,
                name,
                data.get('tagline', ''),
                data.get('category', 'general'),
                data.get('categoryName') or data.get('category_name') or 'General',
                price,
                float(data.get('originalPrice') or data.get('original_price', 0)) if (data.get('originalPrice') or data.get('original_price')) else None,
                int(data.get('discountPercent') or data.get('discount_percent') or 0),
                float(data.get('rating', 5.0)),
                int(data.get('reviewCount') or data.get('review_count', 1)),
                stock,
                data.get('badge', 'New'),
                data.get('image', ''),
                json.dumps(images),
                data.get('description', ''),
                json.dumps(data.get('features', [])),
                json.dumps(data.get('colors', [])),
                json.dumps(data.get('sizes', [])),
                json.dumps(data.get('specs', {}))
            )
        )
        self.conn.commit()
        return self.find_product(prod_id)

    def update_product_stock(self, product_id: str, new_stock: int):
        cursor = self.conn.cursor()
        cursor.execute('UPDATE products SET stock = ? WHERE id = ?', (int(new_stock), product_id))
        self.conn.commit()
        return self.find_product(product_id)

    def delete_product(self, product_id: str) -> bool:
        cursor = self.conn.cursor()
        cursor.execute('DELETE FROM products WHERE id = ?', (product_id,))
        self.conn.commit()
        return True

    def format_product(self, row):
        if not row:
            return None
        return {
            'id': row['id'],
            'name': row['name'],
            'tagline': row['tagline'],
            'category': row['category'],
            'categoryName': row['category_name'],
            'price': float(row['price']),
            'originalPrice': float(row['original_price']) if row['original_price'] is not None else None,
            'discountPercent': int(row['discount_percent'] or 0),
            'rating': float(row['rating'] or 5.0),
            'reviewCount': int(row['review_count'] or 0),
            'stock': int(row['stock'] or 0),
            'badge': row['badge'],
            'image': row['image'],
            'images': self.parse_json(row['images_json'], [row['image']] if row['image'] else []),
            'description': row['description'],
            'features': self.parse_json(row['features_json'], []),
            'colors': self.parse_json(row['colors_json'], []),
            'sizes': self.parse_json(row['sizes_json'], []),
            'specs': self.parse_json(row['specs_json'], {})
        }

    # ==========================================
    #  ORDERS & CHECKOUT
    # ==========================================

    def create_order(self, user_id: int, items: list, shipping_details: dict, payment_method: str, totals: dict):
        if not user_id:
            raise ValueError('User authentication required')
        if not items:
            raise ValueError('Cart items are required')

        order_id = f"ORD-{secrets.randbelow(900000) + 100000}"
        created_at = datetime.now(timezone.utc).isoformat()

        cursor = self.conn.cursor()

        # 1. Verify and decrement stock
        for item in items:
            prod_id = item.get('productId') or item.get('id')
            qty = int(item.get('quantity', 1))
            if qty < 1:
                qty = 1

            cursor.execute('SELECT stock FROM products WHERE id = ?', (prod_id,))
            prod_row = cursor.fetchone()
            if prod_row:
                cur_stock = int(prod_row['stock'] or 0)
                new_stock = max(0, cur_stock - qty)
                cursor.execute('UPDATE products SET stock = ? WHERE id = ?', (new_stock, prod_id))

        # 2. Insert order
        cursor.execute(
            '''
            INSERT INTO orders (
                id, user_id, items_json, shipping_details_json, payment_method, totals_json, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                order_id,
                user_id,
                json.dumps(items),
                json.dumps(shipping_details),
                payment_method or 'Credit Card',
                json.dumps(totals),
                'Processing',
                created_at
            )
        )
        self.conn.commit()
        return self.find_order(order_id)

    def find_order(self, order_id: str):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        row = cursor.fetchone()
        return self.format_order(row)

    def user_orders(self, user_id: int):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
        rows = cursor.fetchall()
        return [self.format_order(r) for r in rows]

    def all_orders(self):
        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            '''
        )
        rows = cursor.fetchall()
        results = []
        for r in rows:
            order = self.format_order(r)
            order['userName'] = r['user_name']
            order['userEmail'] = r['user_email']
            results.append(order)
        return results

    def format_order(self, row):
        if not row:
            return None
        return {
            'orderId': row['id'],
            'userId': row['user_id'],
            'items': self.parse_json(row['items_json'], []),
            'shippingDetails': self.parse_json(row['shipping_details_json'], {}),
            'paymentMethod': row['payment_method'],
            'totals': self.parse_json(row['totals_json'], {}),
            'status': row['status'],
            'date': row['created_at']
        }

    def parse_json(self, raw_str, fallback):
        if not raw_str:
            return fallback
        try:
            return json.loads(raw_str)
        except Exception:
            return fallback

    def seed_products_if_needed(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) as cnt FROM products')
        count = cursor.fetchone()['cnt']
        if count > 0:
            return

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_js = os.path.join(base_dir, 'js', 'data.js')
        if os.path.exists(data_js):
            try:
                with open(data_js, 'r', encoding='utf-8') as f:
                    content = f.read()
                m = re.search(r'const INITIAL_PRODUCTS = (\[[\s\S]*?\]);', content)
                if m:
                    products = json.loads(m.group(1))
                    for p in products:
                        self.create_product(p)
                    return
            except Exception:
                pass

        for p in self.fallback_seed():
            self.create_product(p)

    def fallback_seed(self):
        return [
            {
                'id': 'prod-1',
                'name': 'Aura Noise-Canceling Wireless Headphones',
                'tagline': 'Studio acoustics with active hybrid cancellation',
                'category': 'audio',
                'categoryName': 'Audio & Sound',
                'price': 279.99,
                'originalPrice': 349.99,
                'discountPercent': 20,
                'rating': 4.9,
                'reviewCount': 428,
                'stock': 24,
                'badge': 'Best Seller',
                'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
                'description': 'Immerse yourself in crystal clear sound with 40mm titanium drivers and 45 hours of battery life.'
            },
            {
                'id': 'prod-2',
                'name': 'Titan Chrono Smartwatch Ultra',
                'tagline': 'Aerospace titanium with sapphire crystal OLED',
                'category': 'wearables',
                'categoryName': 'Wearables & Watches',
                'price': 389.00,
                'originalPrice': 449.00,
                'discountPercent': 13,
                'rating': 4.8,
                'reviewCount': 312,
                'stock': 15,
                'badge': 'Trending',
                'image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
                'description': 'Engineered for endurance athletes with dual-band GPS, ECG monitor, and 14 days of power.'
            },
            {
                'id': 'prod-3',
                'name': 'Luminary Mechanical Minimalist Keyboard',
                'tagline': 'Hot-swappable tactile switches with RGB backlighting',
                'category': 'electronics',
                'categoryName': 'Electronics & Gadgets',
                'price': 139.50,
                'originalPrice': 179.00,
                'discountPercent': 22,
                'rating': 4.7,
                'reviewCount': 189,
                'stock': 38,
                'badge': 'Staff Pick',
                'image': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
                'description': 'Crafted with CNC aluminum case, pre-lubed switches, and triple-mode wireless connectivity.'
            },
            {
                'id': 'prod-4',
                'name': 'Minimalist Italian Leather Everyday Backpack',
                'tagline': 'Water-resistant top-grain leather with padded 16" laptop pocket',
                'category': 'fashion',
                'categoryName': 'Fashion & Lifestyle',
                'price': 189.00,
                'originalPrice': 240.00,
                'discountPercent': 21,
                'rating': 4.9,
                'reviewCount': 215,
                'stock': 19,
                'badge': 'New Arrival',
                'image': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
                'description': 'Expertly crafted in Florence using vegetable-tanned Italian leather with RFID protection.'
            },
            {
                'id': 'prod-5',
                'name': 'Apex 4K Cinematic Mirrorless Camera',
                'tagline': 'Full-frame 33MP sensor with 5-axis IBIS and 4K60p video',
                'category': 'electronics',
                'categoryName': 'Electronics & Gadgets',
                'price': 1699.00,
                'originalPrice': 1899.00,
                'discountPercent': 10,
                'rating': 5.0,
                'reviewCount': 94,
                'stock': 8,
                'badge': 'Top Rated',
                'image': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
                'description': 'Capture breathtaking still photography and cinematic 4K 60p 10-bit footage.'
            },
            {
                'id': 'prod-6',
                'name': 'Nordic Ceramic Pour-Over & Kettle Set',
                'tagline': 'Handcrafted matte stoneware with precision gooseneck spout',
                'category': 'home',
                'categoryName': 'Home & Living',
                'price': 84.99,
                'originalPrice': 109.99,
                'discountPercent': 22,
                'rating': 4.8,
                'reviewCount': 167,
                'stock': 45,
                'badge': 'Sale',
                'image': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
                'description': 'Brew barista-quality coffee every morning with ceramic stoneware and walnut collar.'
            },
            {
                'id': 'prod-7',
                'name': 'Merino Wool Oversized Knit Sweater',
                'tagline': '100% extra-fine Australian merino wool with ribbed trims',
                'category': 'fashion',
                'categoryName': 'Fashion & Lifestyle',
                'price': 119.00,
                'originalPrice': 159.00,
                'discountPercent': 25,
                'rating': 4.7,
                'reviewCount': 142,
                'stock': 28,
                'badge': 'Trending',
                'image': 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
                'description': 'Luxuriously soft and temperature-regulating Australian merino wool.'
            },
            {
                'id': 'prod-8',
                'name': 'Horizon Smart Ambient Light Bar',
                'tagline': 'Dynamic sync backlighting with 16 million colors & music mode',
                'category': 'electronics',
                'categoryName': 'Electronics & Gadgets',
                'price': 69.99,
                'originalPrice': 89.99,
                'discountPercent': 22,
                'rating': 4.6,
                'reviewCount': 278,
                'stock': 50,
                'badge': 'Popular',
                'image': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
                'description': 'Transform your entertainment setup with reactive RGBIC audio sync lighting.'
            }
        ]
