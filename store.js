/**
 * NovaStore State Management
 * Connects frontend to backend REST APIs, manages authenticated sessions,
 * shopping cart, wishlist, orders, and reactive UI events.
 */

class Store {
  constructor() {
    this.storagePrefix = "novastore_";
    this.products = this.loadInitialProducts();
    this.cart = this.loadFromStorage("cart", []);
    this.wishlist = this.loadFromStorage("wishlist", []);
    this.userOrders = [];
    this.activeCurrency = this.loadFromStorage("currency", "USD");
    this.activeCoupon = null;
    this.currentUser = this.loadFromStorage("current_user", null);

    this.filters = {
      search: "",
      category: "all",
      minPrice: 0,
      maxPrice: 2000,
      minRating: 0,
      inStockOnly: false,
      sortBy: "featured"
    };
  }

  loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(this.storagePrefix + key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Error loading ${key} from storage:`, e);
      return fallback;
    }
  }

  saveToStorage(key, data) {
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Error saving ${key} to storage:`, e);
    }
  }

  loadInitialProducts() {
    const saved = this.loadFromStorage("products", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return typeof INITIAL_PRODUCTS !== "undefined" ? INITIAL_PRODUCTS : [];
  }

  emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(`novastore:${eventName}`, { detail }));
  }

  // ==========================================
  //  REST API: PRODUCTS & INVENTORY
  // ==========================================

  async fetchProducts() {
    try {
      const data = await window.api.get('/products');
      if (data && data.success && Array.isArray(data.products)) {
        this.products = data.products;
        this.saveToStorage("products", this.products);
        this.emit("products-updated", this.products);
        return this.products;
      }
    } catch (err) {
      console.warn("Could not fetch products from backend REST API, using cached data:", err);
      // Keep cached products
      this.emit("products-updated", this.products);
    }
    return this.products;
  }

  async addProduct(newProduct) {
    try {
      const data = await window.api.post('/products', newProduct);
      if (data && data.success) {
        await this.fetchProducts();
        return data.product;
      }
    } catch (err) {
      console.error("Failed to add product:", err);
      throw err;
    }
  }

  async updateStock(productId, newStock) {
    try {
      const data = await window.api.put(`/products/${productId}/stock`, { stock: newStock });
      if (data && data.success) {
        await this.fetchProducts();
        return data.product;
      }
    } catch (err) {
      console.error("Failed to update stock:", err);
      throw err;
    }
  }

  async deleteProduct(productId) {
    try {
      const data = await window.api.delete(`/products/${productId}`);
      if (data && data.success) {
        await this.fetchProducts();
        return true;
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
      throw err;
    }
  }

  // ==========================================
  //  REST API: USER AUTHENTICATION & SESSIONS
  // ==========================================

  async register(name, email, password) {
    try {
      const data = await window.api.post('/auth/register', { name, email, password });
      if (data && data.success) {
        window.api.setToken(data.token);
        this.currentUser = data.user;
        this.saveToStorage("current_user", this.currentUser);
        this.emit("auth-changed", this.currentUser);
        await this.fetchOrders();
        return { success: true, user: data.user };
      }
      throw new Error(data.error || "Registration failed");
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
  }

  async login(email, password) {
    try {
      const data = await window.api.post('/auth/login', { email, password });
      if (data && data.success) {
        window.api.setToken(data.token);
        this.currentUser = data.user;
        this.saveToStorage("current_user", this.currentUser);
        this.emit("auth-changed", this.currentUser);
        await this.fetchOrders();
        return { success: true, user: data.user };
      }
      throw new Error(data.error || "Invalid credentials");
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  }

  async logout() {
    try {
      await window.api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      window.api.clearToken();
      this.currentUser = null;
      this.userOrders = [];
      this.saveToStorage("current_user", null);
      this.emit("auth-changed", null);
      this.emit("orders-updated", []);
    }
  }

  async checkAuth() {
    const token = window.api.getToken();
    if (!token) {
      this.currentUser = null;
      this.saveToStorage("current_user", null);
      this.emit("auth-changed", null);
      return null;
    }

    try {
      const data = await window.api.get('/auth/me');
      if (data && data.success && data.user) {
        this.currentUser = data.user;
        this.saveToStorage("current_user", this.currentUser);
        this.emit("auth-changed", this.currentUser);
        await this.fetchOrders();
        return this.currentUser;
      }
    } catch (err) {
      console.warn("Session expired or invalid, logging out:", err);
      window.api.clearToken();
      this.currentUser = null;
      this.saveToStorage("current_user", null);
      this.emit("auth-changed", null);
    }
    return null;
  }

  isAuthenticated() {
    return Boolean(this.currentUser && window.api.getToken());
  }

  // ==========================================
  //  REST API: USER ORDERS & CHECKOUT
  // ==========================================

  async fetchOrders() {
    if (!this.isAuthenticated()) {
      this.userOrders = [];
      this.emit("orders-updated", []);
      return [];
    }

    try {
      const data = await window.api.get('/orders');
      if (data && data.success && Array.isArray(data.orders)) {
        this.userOrders = data.orders;
        this.emit("orders-updated", this.userOrders);
        return this.userOrders;
      }
    } catch (err) {
      console.error("Failed to fetch user orders:", err);
    }
    return [];
  }

  async createOrder(shippingDetails, paymentMethod) {
    if (!this.isAuthenticated()) {
      throw new Error("Authentication required. Please sign in to complete your order.");
    }

    if (this.cart.length === 0) {
      throw new Error("Your cart is empty.");
    }

    const payload = {
      items: this.cart,
      shippingDetails,
      paymentMethod,
      totals: this.getCartTotals()
    };

    try {
      const data = await window.api.post('/orders', payload);
      if (data && data.success && data.order) {
        // Clear cart on successful order placement
        this.clearCart();
        // Refresh products stock from server
        await this.fetchProducts();
        // Refresh user orders list
        await this.fetchOrders();
        return data.order;
      }
      throw new Error(data.error || "Failed to create order");
    } catch (err) {
      console.error("Order creation failed:", err);
      throw err;
    }
  }

  // ==========================================
  //  COUPONS & PROMOTIONS
  // ==========================================

  async applyCoupon(code) {
    try {
      const data = await window.api.post('/coupons/validate', { code });
      if (data && data.valid && data.coupon) {
        this.activeCoupon = data.coupon;
        this.emit("cart-updated", this.cart);
        return { success: true, message: `Coupon ${data.coupon.code} applied! ${data.coupon.desc}` };
      }
    } catch (err) {
      const msg = (err.data && err.data.error) || "Invalid promo code. Try NOVA20 or FREESHIP";
      return { success: false, message: msg };
    }
    return { success: false, message: "Invalid promo code" };
  }

  removeCoupon() {
    this.activeCoupon = null;
    this.emit("cart-updated", this.cart);
  }

  // ==========================================
  //  FILTERS & SEARCH
  // ==========================================

  setFilter(key, value) {
    this.filters[key] = value;
    this.emit("filter-changed", this.filters);
  }

  resetFilters() {
    this.filters = {
      search: "",
      category: "all",
      minPrice: 0,
      maxPrice: 2000,
      minRating: 0,
      inStockOnly: false,
      sortBy: "featured"
    };
    this.emit("filter-changed", this.filters);
  }

  getFilteredProducts() {
    let list = [...this.products];

    // Search query
    if (this.filters.search.trim() !== "") {
      const q = this.filters.search.toLowerCase();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.tagline && p.tagline.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    // Category
    if (this.filters.category && this.filters.category !== "all") {
      list = list.filter(p => p.category === this.filters.category);
    }

    // Price range
    list = list.filter(p => p.price >= this.filters.minPrice && p.price <= this.filters.maxPrice);

    // Rating
    if (this.filters.minRating > 0) {
      list = list.filter(p => p.rating >= this.filters.minRating);
    }

    // In Stock Only
    if (this.filters.inStockOnly) {
      list = list.filter(p => p.stock > 0);
    }

    // Sorting
    switch (this.filters.sortBy) {
      case "price-low":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "newest":
        list.sort((a, b) => (b.badge === "New Arrival" ? 1 : 0) - (a.badge === "New Arrival" ? 1 : 0));
        break;
      case "featured":
      default:
        list.sort((a, b) => (b.badge === "Best Seller" ? 1 : 0) - (a.badge === "Best Seller" ? 1 : 0));
        break;
    }

    return list;
  }

  getProductById(id) {
    return this.products.find(p => p.id === id) || null;
  }

  // ==========================================
  //  SHOPPING CART
  // ==========================================

  addToCart(productId, quantity = 1, selectedColor = null, selectedSize = null) {
    const product = this.getProductById(productId);
    if (!product) return { success: false, message: "Product not found" };

    if (product.stock <= 0) {
      return { success: false, message: "Sorry, this item is out of stock!" };
    }

    const color = selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : null);
    const size = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);

    const cartKey = `${productId}-${color || ""}-${size || ""}`;
    const existingIndex = this.cart.findIndex(item => item.cartKey === cartKey);

    if (existingIndex > -1) {
      const newQty = this.cart[existingIndex].quantity + quantity;
      if (newQty > product.stock) {
        return { success: false, message: `Only ${product.stock} units available in stock.` };
      }
      this.cart[existingIndex].quantity = newQty;
    } else {
      if (quantity > product.stock) {
        return { success: false, message: `Only ${product.stock} units available in stock.` };
      }
      this.cart.push({
        cartKey,
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        selectedColor: color,
        selectedSize: size,
        quantity: quantity,
        maxStock: product.stock
      });
    }

    this.saveToStorage("cart", this.cart);
    this.emit("cart-updated", this.cart);
    return { success: true, message: `Added ${product.name} to cart!` };
  }

  updateCartQuantity(cartKey, quantity) {
    const item = this.cart.find(i => i.cartKey === cartKey);
    if (!item) return;

    if (quantity <= 0) {
      this.removeFromCart(cartKey);
      return;
    }

    const product = this.getProductById(item.productId);
    const maxStock = product ? product.stock : 99;

    item.quantity = Math.min(quantity, maxStock);
    this.saveToStorage("cart", this.cart);
    this.emit("cart-updated", this.cart);
  }

  removeFromCart(cartKey) {
    this.cart = this.cart.filter(item => item.cartKey !== cartKey);
    this.saveToStorage("cart", this.cart);
    this.emit("cart-updated", this.cart);
  }

  clearCart() {
    this.cart = [];
    this.activeCoupon = null;
    this.saveToStorage("cart", this.cart);
    this.emit("cart-updated", this.cart);
  }

  getCartCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  getCartTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeShippingThreshold = 100.0;
    
    let shipping = subtotal > 0 ? (subtotal >= freeShippingThreshold ? 0.0 : 15.0) : 0.0;
    let discount = 0.0;

    if (this.activeCoupon) {
      if (this.activeCoupon.type === "percent") {
        discount = (subtotal * this.activeCoupon.discount) / 100;
      } else if (this.activeCoupon.type === "fixed") {
        discount = Math.min(this.activeCoupon.discount, subtotal);
      } else if (this.activeCoupon.type === "shipping") {
        shipping = 0.0;
      }
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const estimatedTax = taxableAmount > 0 ? taxableAmount * 0.08 : 0.0; // 8% sales tax
    const finalTotal = Math.max(0, taxableAmount + shipping + estimatedTax);

    return {
      subtotal,
      discount,
      shipping,
      freeShippingThreshold,
      progressToFreeShipping: Math.min(100, (subtotal / freeShippingThreshold) * 100),
      remainingForFreeShipping: Math.max(0, freeShippingThreshold - subtotal),
      estimatedTax,
      finalTotal,
      coupon: this.activeCoupon
    };
  }

  // ==========================================
  //  WISHLIST
  // ==========================================

  toggleWishlist(productId) {
    const index = this.wishlist.indexOf(productId);
    let added = false;
    if (index > -1) {
      this.wishlist.splice(index, 1);
      added = false;
    } else {
      this.wishlist.push(productId);
      added = true;
    }
    this.saveToStorage("wishlist", this.wishlist);
    this.emit("wishlist-updated", this.wishlist);
    return added;
  }

  isWishlisted(productId) {
    return this.wishlist.includes(productId);
  }

  getWishlistItems() {
    return this.products.filter(p => this.wishlist.includes(p.id));
  }

  // ==========================================
  //  CURRENCIES
  // ==========================================

  setCurrency(code) {
    if (CURRENCIES[code]) {
      this.activeCurrency = code;
      this.saveToStorage("currency", code);
      this.emit("currency-changed", code);
    }
  }

  formatPrice(usdAmount) {
    const config = CURRENCIES[this.activeCurrency] || CURRENCIES.USD;
    const converted = usdAmount * config.rate;
    return `${config.symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Instantiate global store
window.store = new Store();
