#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NovaStore Full-Stack Web & REST API Server (Python)
Zero-dependency HTTP server delivering:
  1. REST API endpoints (/api/*) with SQLite persistence, PBKDF2 authentication, and CORS
  2. Static file serving (HTML, CSS, JS) for the frontend
"""

import os
import sys
import json
import re
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, SimpleHTTPRequestHandler
from database import Database

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')
CORS_ORIGIN = os.environ.get('CORS_ORIGIN', '*')
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

db = Database()


class NovaStoreRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    # ==========================================
    #  CORS & RESPONSE HELPERS
    # ==========================================

    def set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', CORS_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '86400')

    def send_json(self, status_code: int, data: dict):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.set_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self) -> dict:
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def get_current_user(self):
        auth_header = self.headers.get('Authorization') or self.headers.get('authorization', '')
        if not auth_header:
            return None
        match = re.match(r'^Bearer\s+(.+)$', auth_header, re.IGNORECASE)
        if not match:
            return None
        token = match.group(1).strip()
        return db.find_user_by_session(token)

    # ==========================================
    #  HTTP METHOD DISPATCHERS
    # ==========================================

    def do_OPTIONS(self):
        self.send_response(200)
        self.set_cors_headers()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api'):
            self.handle_api_get(parsed.path, parse_qs(parsed.query))
        else:
            # Fallback to serving static HTML/CSS/JS files
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api'):
            self.handle_api_post(parsed.path, self.parse_body())
        else:
            self.send_error(404, "Not Found")

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api'):
            self.handle_api_put(parsed.path, self.parse_body())
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api'):
            self.handle_api_delete(parsed.path)
        else:
            self.send_error(404, "Not Found")

    # ==========================================
    #  REST API ROUTE HANDLERS
    # ==========================================

    def handle_api_get(self, path: str, query: dict):
        rel_path = path[4:] or '/'

        if rel_path == '/health':
            self.send_json(200, {'status': 'healthy', 'backend': 'python', 'database': 'sqlite'})
            return

        elif rel_path == '/auth/me':
            user = self.get_current_user()
            if user:
                self.send_json(200, {'success': True, 'user': user})
            else:
                self.send_json(401, {'success': False, 'error': 'Unauthorized: Session invalid or expired'})
            return

        elif rel_path == '/products':
            products = db.all_products()
            self.send_json(200, {'success': True, 'products': products})
            return

        elif rel_path == '/orders':
            user = self.get_current_user()
            if not user:
                self.send_json(401, {'success': False, 'error': 'Please sign in to view your orders'})
                return

            is_admin = user.get('role') == 'admin'
            want_all = 'true' in query.get('all', [])

            if is_admin and want_all:
                orders = db.all_orders()
            else:
                # Strictly isolate orders by user_id
                orders = db.user_orders(user['id'])

            self.send_json(200, {'success': True, 'orders': orders})
            return

        # Dynamic /products/<id>
        m_prod = re.match(r'^/products/([^/]+)$', rel_path)
        if m_prod:
            prod_id = m_prod.group(1)
            product = db.find_product(prod_id)
            if product:
                self.send_json(200, {'success': True, 'product': product})
            else:
                self.send_json(404, {'success': False, 'error': 'Product not found'})
            return

        self.send_json(404, {'success': False, 'error': f"Route not found: GET {path}"})

    def handle_api_post(self, path: str, body: dict):
        rel_path = path[4:] or '/'

        if rel_path == '/auth/register':
            try:
                res = db.register_user(
                    name=body.get('name'),
                    email=body.get('email'),
                    password=body.get('password')
                )
                self.send_json(201, {'success': True, 'message': 'Registration successful', **res})
            except Exception as e:
                self.send_json(400, {'success': False, 'error': str(e)})
            return

        elif rel_path == '/auth/login':
            try:
                res = db.authenticate_user(
                    email=body.get('email'),
                    password=body.get('password')
                )
                self.send_json(200, {'success': True, 'message': 'Login successful', **res})
            except Exception as e:
                self.send_json(401, {'success': False, 'error': str(e)})
            return

        elif rel_path == '/auth/logout':
            auth_header = self.headers.get('Authorization') or self.headers.get('authorization', '')
            match = re.match(r'^Bearer\s+(.+)$', auth_header, re.IGNORECASE)
            if match:
                db.delete_session(match.group(1).strip())
            self.send_json(200, {'success': True, 'message': 'Logged out successfully'})
            return

        elif rel_path == '/products':
            try:
                product = db.create_product(body)
                self.send_json(201, {'success': True, 'product': product})
            except Exception as e:
                self.send_json(400, {'success': False, 'error': str(e)})
            return

        elif rel_path == '/orders':
            user = self.get_current_user()
            if not user:
                self.send_json(401, {'success': False, 'error': 'Authentication required to place an order'})
                return

            try:
                order = db.create_order(
                    user_id=user['id'],
                    items=body.get('items', []),
                    shipping_details=body.get('shippingDetails', {}),
                    payment_method=body.get('paymentMethod', 'Credit Card'),
                    totals=body.get('totals', {})
                )
                self.send_json(201, {'success': True, 'message': 'Order placed successfully', 'order': order})
            except Exception as e:
                self.send_json(400, {'success': False, 'error': str(e)})
            return

        elif rel_path == '/coupons/validate':
            code = (body.get('code') or '').strip().upper()
            coupons = {
                'NOVA20': {'code': 'NOVA20', 'discount': 20, 'type': 'percent', 'desc': '20% off your entire order'},
                'FREESHIP': {'code': 'FREESHIP', 'discount': 15, 'type': 'shipping', 'desc': 'Free standard shipping'},
                'SAVE10': {'code': 'SAVE10', 'discount': 10, 'type': 'fixed', 'desc': '$10 off orders above $50'},
                'LUXE50': {'code': 'LUXE50', 'discount': 50, 'type': 'fixed', 'desc': '$50 off luxury orders over $250'}
            }
            if code in coupons:
                self.send_json(200, {'success': True, 'valid': True, 'coupon': coupons[code]})
            else:
                self.send_json(404, {'success': False, 'valid': False, 'error': 'Invalid or expired promo code'})
            return

        self.send_json(404, {'success': False, 'error': f"Route not found: POST {path}"})

    def handle_api_put(self, path: str, body: dict):
        rel_path = path[4:] or '/'

        m_stock = re.match(r'^/products/([^/]+)/stock$', rel_path)
        if m_stock:
            prod_id = m_stock.group(1)
            stock = body.get('stock', 0)
            product = db.update_product_stock(prod_id, stock)
            self.send_json(200, {'success': True, 'product': product})
            return

        self.send_json(404, {'success': False, 'error': f"Route not found: PUT {path}"})

    def handle_api_delete(self, path: str):
        rel_path = path[4:] or '/'

        m_del = re.match(r'^/products/([^/]+)$', rel_path)
        if m_del:
            prod_id = m_del.group(1)
            db.delete_product(prod_id)
            self.send_json(200, {'success': True, 'message': 'Product deleted'})
            return

        self.send_json(404, {'success': False, 'error': f"Route not found: DELETE {path}"})


def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, NovaStoreRequestHandler)

    print('==================================================')
    print('  NovaStore Python Full-Stack & REST Server Running!')
    print(f'  Host: {HOST} | Port: {PORT}')
    print(f'  CORS Origin: {CORS_ORIGIN}')
    print(f"  API Base: http://{'localhost' if HOST == '0.0.0.0' else HOST}:{PORT}/api")
    print(f"  Storefront: http://{'localhost' if HOST == '0.0.0.0' else HOST}:{PORT}")
    print('  Press Ctrl+C to stop the server.')
    print('==================================================')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == '__main__':
    run_server()
