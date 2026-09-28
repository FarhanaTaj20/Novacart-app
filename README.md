# 🛍️ NovaStore — Full-Stack E-Commerce Platform

A production-ready, responsive Full-Stack E-Commerce web application featuring a **Python REST API backend**, an **embedded SQLite relational database**, **cryptographic PBKDF2 user authentication**, and a modern **HTML5, CSS3, and JavaScript storefront**.

---

## 🏗️ Architecture

- **Frontend**: Pure **HTML5**, **CSS3 (Tailwind CSS)**, and modern **Vanilla JavaScript (ES6+)**.
- **Backend**: **Python 3 REST API Server** (`server.py`) using Python standard libraries (`http.server`, `sqlite3`, `hashlib`, `secrets`).
- **Database**: **SQLite3** relational database (`db/ecommerce.sqlite`) with tables for `users`, `sessions`, `products`, and `orders`.
- **Zero External Dependencies**: Runs out of the box on Python 3.9+ without needing any `pip install` commands.

---

## ✨ Features

- 🔐 **Complete User Authentication System**:
  - Secure Registration (`POST /api/auth/register`) and Login (`POST /api/auth/login`).
  - Passwords hashed using **PBKDF2-HMAC-SHA256** with 20,000 iterations and a 16-byte cryptographic salt (`secrets.token_hex(16)`). Passwords are never stored in plain text.
  - Authenticated sessions using 32-byte secure bearer tokens with automatic session persistence.
  - Sign Out (`POST /api/auth/logout`) and active session verification (`GET /api/auth/me`).
- 🛡️ **User Data & Order Protection**:
  - Protected checkout requires an authenticated user.
  - **Account Isolation**: Each user can only query and view their own personal orders (`GET /api/orders`).
  - Personal Order History modal with itemized receipts and status tracking.
- 🗄️ **Persistent Relational Database (SQLite3)**:
  - Database stored in `db/ecommerce.sqlite`.
  - Tables for `users`, `sessions`, `products`, and `orders`.
  - Automatic table creation and product catalog seeding on first boot.
- 🌐 **Robust REST API & CORS Ready**:
  - Full CORS headers configured (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.) with preflight `OPTIONS` support for decoupled deployments.
  - Configurable via environment variables (`PORT`, `HOST`, `CORS_ORIGIN`).
  - Dynamic API Base URL resolution in `js/config.js` with **zero hardcoded localhost URLs** in application code.
- 📱 **Storefront & Interactive Catalog**:
  - Real-time search with debounce, category filtering, price slider, and rating filters.
  - Multi-image product quick-view modal with variant selection.
  - Slide-over Cart drawer with real-time tax/shipping calculations and free shipping progress bar.
  - Interactive credit card checkout preview with dynamic formatting.
  - Merchant admin inventory dashboard with live stock updates and order tracking.

---

## 🚀 Quickstart

### 1. Launch the Python REST & Web Server
From the project directory, run:
```bash
./run.sh
```
Or directly with Python:
```bash
python3 server.py
```
Or specify custom environment variables:
```bash
PORT=8080 HOST=0.0.0.0 CORS_ORIGIN="*" python3 server.py
```
The application will be live at **`http://localhost:8080`**.

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:8080
```

---

## 📡 REST API Reference

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | System health and database status |
| `POST` | `/api/auth/register` | No | Register new user account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticate user & return session token |
| `POST` | `/api/auth/logout` | No | Invalidate session token |
| `GET` | `/api/auth/me` | **Bearer Token** | Get current logged-in user profile |
| `GET` | `/api/products` | No | Fetch product catalog from SQLite database |
| `GET` | `/api/products/:id` | No | Fetch single product |
| `POST` | `/api/products` | Admin | Add new product to database |
| `PUT` | `/api/products/:id/stock` | Admin | Update product stock |
| `DELETE` | `/api/products/:id` | Admin | Delete product from database |
| `GET` | `/api/orders` | **Bearer Token** | Fetch orders (strictly filtered by current user ID) |
| `POST` | `/api/orders` | **Bearer Token** | Create order linked to current user & decrement inventory |
| `POST` | `/api/coupons/validate` | No | Validate promo code (`NOVA20`, `FREESHIP`, `SAVE10`) |

---

## 🌍 Environment Variables & Deployment

### Backend Environment Variables
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the HTTP and API server |
| `HOST` | `0.0.0.0` | Bind host (use `0.0.0.0` for cloud deployment) |
| `CORS_ORIGIN` | `*` | Allowed origin for frontend CORS requests |

### Decoupled Frontend Deployment (e.g. Vercel, Netlify)
If your frontend is hosted separately from your backend, you can specify the backend URL in `index.html` or runtime:
```html
<script>
  window.__APP_ENV__ = {
    API_BASE_URL: "https://your-backend-api.example.com/api"
  };
</script>
```
Or store it in browser storage:
```js
localStorage.setItem('novastore_api_url', 'https://your-backend-api.example.com/api');
```

---

## 🗂️ Project Directory Layout

```
ecommerce-store/
├── index.html         # Frontend HTML5 storefront with UI modals
├── css/
│   └── styles.css     # Frontend CSS3 styling & animations
├── js/
│   ├── config.js      # Dynamic API base URL & unified ApiClient with bearer auth
│   ├── data.js        # Seed catalog data & currency conversion table
│   ├── store.js       # Frontend state manager with REST API calls & session persistence
│   ├── ui.js          # Dynamic DOM rendering (products, cart, auth UI, user orders)
│   └── app.js         # Frontend controller, auth workflows & checkout wizard
├── db/
│   ├── schema.sql     # SQLite schema for users, sessions, products, and orders
│   ├── database.py    # Python SQLite database driver & PBKDF2 hashing
│   └── ecommerce.sqlite # Persistent SQLite database file
├── server.py          # Python REST API & static asset HTTP server
├── run.sh             # Python server launcher script
└── README.md          # Documentation & API reference
```
