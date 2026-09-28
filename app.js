/**
 * NovaStore Application Controller
 * Handles user interactions, REST API integration, authentication modal,
 * protected checkout workflow, filters, theme toggles, and modal states.
 */

const app = {
  activeView: "grid",
  selectedVariant: { color: null, size: null },
  currentProductInModal: null,
  currentCheckoutStep: 1,
  authRedirectAction: null,

  async init() {
    this.initTheme();
    this.bindEvents();
    this.initLucide();
    
    // Check authenticated session and fetch fresh products from backend REST API
    try {
      await window.store.checkAuth();
    } catch (e) {
      console.warn("Auth check error:", e);
    }

    try {
      await window.store.fetchProducts();
    } catch (e) {
      console.warn("Products fetch error:", e);
    }

    this.render();
    UI.renderAuthUI();
    console.log("NovaStore initialized with REST API & Auth successfully!");
  },

  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem("novastore_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("novastore_theme", isDark ? "dark" : "light");
    UI.showToast(isDark ? "Dark mode enabled" : "Light mode enabled", "info");
    this.initLucide();
  },

  bindEvents() {
    // Reactive store updates
    window.addEventListener("novastore:products-updated", () => {
      this.render();
      UI.renderAdminTable();
    });

    window.addEventListener("novastore:cart-updated", () => {
      UI.renderCart();
    });

    window.addEventListener("novastore:wishlist-updated", () => {
      UI.renderWishlist();
      this.render();
    });

    window.addEventListener("novastore:currency-changed", () => {
      this.render();
      UI.renderCart();
      UI.renderWishlist();
    });

    window.addEventListener("novastore:filter-changed", () => {
      this.renderProducts();
    });

    window.addEventListener("novastore:auth-changed", () => {
      UI.renderAuthUI();
      // Auto-fill checkout fields if user is logged in
      const user = window.store.currentUser;
      if (user) {
        const nameInput = document.getElementById("checkout-name");
        const emailInput = document.getElementById("checkout-email");
        if (nameInput && !nameInput.value) nameInput.value = user.name;
        if (emailInput && !emailInput.value) emailInput.value = user.email;
      }
    });

    window.addEventListener("novastore:orders-updated", (e) => {
      UI.renderUserOrders(e.detail || window.store.userOrders);
    });

    // Close user dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const userMenu = document.getElementById("user-dropdown-menu");
      const authContainer = document.getElementById("header-auth-container");
      if (userMenu && authContainer && !authContainer.contains(e.target)) {
        userMenu.classList.add("hidden");
      }
    });

    // Search input with debounce
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          window.store.setFilter("search", e.target.value);
        }, 200);
      });
    }

    // Price range slider
    const priceSlider = document.getElementById("price-range");
    const priceDisplay = document.getElementById("price-range-display");
    if (priceSlider && priceDisplay) {
      priceSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        priceDisplay.textContent = `$${val}`;
        window.store.setFilter("maxPrice", val);
      });
    }

    // Sort select
    const sortSelect = document.getElementById("sort-by");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        window.store.setFilter("sortBy", e.target.value);
      });
    }

    // In Stock Only checkbox
    const inStockCheckbox = document.getElementById("in-stock-only");
    if (inStockCheckbox) {
      inStockCheckbox.addEventListener("change", (e) => {
        window.store.setFilter("inStockOnly", e.target.checked);
      });
    }

    // Rating filter radios
    const ratingRadios = document.querySelectorAll("input[name='min-rating']");
    ratingRadios.forEach(radio => {
      radio.addEventListener("change", (e) => {
        window.store.setFilter("minRating", parseFloat(e.target.value));
      });
    });

    // Checkout card formatting helpers
    this.bindCardInputs();
  },

  render() {
    this.renderProducts();
    UI.renderCart();
    UI.renderWishlist();
  },

  renderProducts() {
    const products = window.store.getFilteredProducts();
    UI.renderProducts(products, this.activeView);
  },

  setViewMode(mode) {
    this.activeView = mode;
    const gridBtn = document.getElementById("view-grid-btn");
    const listBtn = document.getElementById("view-list-btn");
    
    if (gridBtn && listBtn) {
      if (mode === "grid") {
        gridBtn.classList.add("bg-white", "dark:bg-slate-700", "shadow-xs", "text-indigo-600", "dark:text-indigo-400");
        gridBtn.classList.remove("text-slate-400");
        listBtn.classList.remove("bg-white", "dark:bg-slate-700", "shadow-xs", "text-indigo-600", "dark:text-indigo-400");
        listBtn.classList.add("text-slate-400");
      } else {
        listBtn.classList.add("bg-white", "dark:bg-slate-700", "shadow-xs", "text-indigo-600", "dark:text-indigo-400");
        listBtn.classList.remove("text-slate-400");
        gridBtn.classList.remove("bg-white", "dark:bg-slate-700", "shadow-xs", "text-indigo-600", "dark:text-indigo-400");
        gridBtn.classList.add("text-slate-400");
      }
    }
    this.renderProducts();
  },

  setCategory(categoryKey) {
    window.store.setFilter("category", categoryKey);

    // Update category pills active state
    document.querySelectorAll(".category-pill").forEach(pill => {
      const match = pill.dataset.category === categoryKey;
      if (match) {
        pill.classList.add("bg-indigo-600", "text-white");
        pill.classList.remove("bg-white", "dark:bg-slate-800", "text-slate-700", "dark:text-slate-300");
      } else {
        pill.classList.remove("bg-indigo-600", "text-white");
        pill.classList.add("bg-white", "dark:bg-slate-800", "text-slate-700", "dark:text-slate-300");
      }
    });
  },

  // ==========================================
  //  USER AUTHENTICATION MODAL & ACTIONS
  // ==========================================

  openAuthModal(defaultTab = 'login', redirectAction = null) {
    this.authRedirectAction = redirectAction;
    this.switchAuthTab(defaultTab);
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
    // Clear error message
    const errEl = document.getElementById("auth-error-msg");
    if (errEl) errEl.classList.add("hidden");
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById("auth-login-form");
    const registerForm = document.getElementById("auth-register-form");
    const loginTabBtn = document.getElementById("tab-btn-login");
    const registerTabBtn = document.getElementById("tab-btn-register");
    const errEl = document.getElementById("auth-error-msg");
    if (errEl) errEl.classList.add("hidden");

    if (tab === 'login') {
      if (loginForm) loginForm.classList.remove("hidden");
      if (registerForm) registerForm.classList.add("hidden");
      if (loginTabBtn) {
        loginTabBtn.className = "flex-1 py-2.5 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400";
      }
      if (registerTabBtn) {
        registerTabBtn.className = "flex-1 py-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300";
      }
    } else {
      if (loginForm) loginForm.classList.add("hidden");
      if (registerForm) registerForm.classList.remove("hidden");
      if (registerTabBtn) {
        registerTabBtn.className = "flex-1 py-2.5 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400";
      }
      if (loginTabBtn) {
        loginTabBtn.className = "flex-1 py-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300";
      }
    }
    this.initLucide();
  },

  async handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const errEl = document.getElementById("auth-error-msg");

    if (!email || !password) {
      if (errEl) {
        errEl.textContent = "Please fill in all fields.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    try {
      const res = await window.store.login(email, password);
      UI.showToast(`Welcome back, ${res.user.name}!`, "success");
      this.closeAuthModal();

      if (typeof this.authRedirectAction === "function") {
        const action = this.authRedirectAction;
        this.authRedirectAction = null;
        action();
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || "Invalid email or password.";
        errEl.classList.remove("hidden");
      }
      UI.showToast(err.message || "Login failed", "error");
    }
  },

  async handleRegister(e) {
    if (e) e.preventDefault();
    const name = document.getElementById("register-name")?.value.trim();
    const email = document.getElementById("register-email")?.value.trim();
    const password = document.getElementById("register-password")?.value;
    const confirm = document.getElementById("register-confirm")?.value;
    const errEl = document.getElementById("auth-error-msg");

    if (!name || !email || !password) {
      if (errEl) {
        errEl.textContent = "Please fill in all required fields.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    if (password.length < 6) {
      if (errEl) {
        errEl.textContent = "Password must be at least 6 characters.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    if (password !== confirm) {
      if (errEl) {
        errEl.textContent = "Passwords do not match.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    try {
      const res = await window.store.register(name, email, password);
      UI.showToast(`Welcome to NovaStore, ${res.user.name}!`, "success");
      this.closeAuthModal();

      if (typeof this.authRedirectAction === "function") {
        const action = this.authRedirectAction;
        this.authRedirectAction = null;
        action();
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || "Registration failed.";
        errEl.classList.remove("hidden");
      }
      UI.showToast(err.message || "Registration failed", "error");
    }
  },

  async handleLogout() {
    await window.store.logout();
    UI.showToast("Signed out successfully.", "info");
    this.closeProfileModal();
    this.closeUserOrdersModal();
  },

  toggleUserMenu(forceState = null) {
    const menu = document.getElementById("user-dropdown-menu");
    if (!menu) return;

    if (forceState === false) {
      menu.classList.add("hidden");
    } else if (forceState === true) {
      menu.classList.remove("hidden");
    } else {
      menu.classList.toggle("hidden");
    }
  },

  openProfileModal() {
    const user = window.store.currentUser;
    if (!user) {
      this.openAuthModal('login');
      return;
    }

    const nameEl = document.getElementById("profile-name");
    const emailEl = document.getElementById("profile-email");
    const roleEl = document.getElementById("profile-role");
    const joinedEl = document.getElementById("profile-joined");

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (roleEl) roleEl.textContent = user.role || 'customer';
    if (joinedEl) joinedEl.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member';

    const modal = document.getElementById("profile-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeProfileModal() {
    const modal = document.getElementById("profile-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  async openUserOrdersModal() {
    if (!window.store.isAuthenticated()) {
      this.openAuthModal('login', () => this.openUserOrdersModal());
      return;
    }

    const modal = document.getElementById("user-orders-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    try {
      const orders = await window.store.fetchOrders();
      UI.renderUserOrders(orders);
    } catch (e) {
      console.error("Error loading user orders:", e);
    }
  },

  closeUserOrdersModal() {
    const modal = document.getElementById("user-orders-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  // ==========================================
  //  CART & WISHLIST
  // ==========================================

  openCart() {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-backdrop");
    if (drawer && backdrop) {
      backdrop.classList.remove("hidden");
      requestAnimationFrame(() => {
        backdrop.classList.remove("opacity-0");
        drawer.classList.remove("translate-x-full");
      });
    }
  },

  closeCart() {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-backdrop");
    if (drawer && backdrop) {
      drawer.classList.add("translate-x-full");
      backdrop.classList.add("opacity-0");
      setTimeout(() => backdrop.classList.add("hidden"), 300);
    }
  },

  handleAddToCart(productId, qty = 1, color = null, size = null) {
    const result = window.store.addToCart(productId, qty, color, size);
    if (result.success) {
      UI.showToast(result.message, "success");
      const cartBtn = document.getElementById("header-cart-btn");
      if (cartBtn) {
        cartBtn.classList.add("scale-125");
        setTimeout(() => cartBtn.classList.remove("scale-125"), 250);
      }
    } else {
      UI.showToast(result.message, "error");
    }
  },

  handleWishlistToggle(productId, buttonEl) {
    const added = window.store.toggleWishlist(productId);
    const p = window.store.getProductById(productId);
    const title = p ? p.name : "Product";
    UI.showToast(added ? `Saved ${title} to wishlist` : `Removed ${title} from wishlist`, "info");
  },

  // ==========================================
  //  QUICK VIEW MODAL
  // ==========================================

  openQuickView(productId) {
    const product = window.store.getProductById(productId);
    if (!product) return;

    this.currentProductInModal = product;
    this.selectedVariant = {
      color: product.colors && product.colors.length > 0 ? product.colors[0] : null,
      size: product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
    };

    UI.renderProductModal(product);

    const modal = document.getElementById("product-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeQuickView() {
    const modal = document.getElementById("product-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
    this.currentProductInModal = null;
  },

  selectModalVariant(type, value, buttonEl) {
    this.selectedVariant[type] = value;
    const parent = buttonEl.parentElement;
    if (parent) {
      parent.querySelectorAll(".modal-variant-btn").forEach(b => {
        b.classList.remove("border-indigo-600", "bg-indigo-50", "dark:bg-indigo-950/40", "text-indigo-600", "dark:text-indigo-400", "font-semibold");
        b.classList.add("border-slate-200", "dark:border-slate-700", "text-slate-700", "dark:text-slate-300");
      });
      buttonEl.classList.add("border-indigo-600", "bg-indigo-50", "dark:bg-indigo-950/40", "text-indigo-600", "dark:text-indigo-400", "font-semibold");
      buttonEl.classList.remove("border-slate-200", "dark:border-slate-700", "text-slate-700", "dark:text-slate-300");
    }
  },

  adjustModalQty(delta) {
    const input = document.getElementById("modal-qty-input");
    if (!input || !this.currentProductInModal) return;

    let cur = parseInt(input.value, 10) || 1;
    let next = cur + delta;
    if (next < 1) next = 1;
    if (next > this.currentProductInModal.stock) next = this.currentProductInModal.stock;
    input.value = next;
  },

  addFromModal(productId) {
    const input = document.getElementById("modal-qty-input");
    const qty = input ? parseInt(input.value, 10) : 1;
    this.handleAddToCart(productId, qty, this.selectedVariant.color, this.selectedVariant.size);
    this.closeQuickView();
    this.openCart();
  },

  // ==========================================
  //  WISHLIST MODAL
  // ==========================================

  openWishlist() {
    const modal = document.getElementById("wishlist-modal");
    if (modal) {
      UI.renderWishlist();
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeWishlist() {
    const modal = document.getElementById("wishlist-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  // ==========================================
  //  COUPONS
  // ==========================================

  async handleApplyCoupon(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("coupon-input");
    if (!input || !input.value.trim()) return;

    const res = await window.store.applyCoupon(input.value.trim());
    if (res.success) {
      UI.showToast(res.message, "success");
      input.value = "";
    } else {
      UI.showToast(res.message, "error");
    }
  },

  // ==========================================
  //  CHECKOUT WORKFLOW (PROTECTED)
  // ==========================================

  openCheckout() {
    if (window.store.cart.length === 0) {
      UI.showToast("Your cart is empty!", "error");
      return;
    }

    // Require authenticated session for checkout
    if (!window.store.isAuthenticated()) {
      UI.showToast("Please sign in or create an account to proceed with checkout", "info");
      this.openAuthModal('login', () => this.openCheckout());
      return;
    }

    this.closeCart();
    this.currentCheckoutStep = 1;
    this.updateCheckoutStepUI();
    this.updateCheckoutSummaryUI();

    // Auto-fill user name and email from authenticated session
    const user = window.store.currentUser;
    if (user) {
      const nameInput = document.getElementById("checkout-name");
      const emailInput = document.getElementById("checkout-email");
      if (nameInput) nameInput.value = user.name || "";
      if (emailInput) emailInput.value = user.email || "";
    }

    const modal = document.getElementById("checkout-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeCheckout() {
    const modal = document.getElementById("checkout-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  setCheckoutStep(step) {
    if (step === 2) {
      const name = document.getElementById("checkout-name")?.value.trim();
      const email = document.getElementById("checkout-email")?.value.trim();
      const address = document.getElementById("checkout-address")?.value.trim();
      const city = document.getElementById("checkout-city")?.value.trim();
      const zip = document.getElementById("checkout-zip")?.value.trim();

      if (!name || !email || !address || !city || !zip) {
        UI.showToast("Please fill in all shipping fields", "error");
        return;
      }
    }

    this.currentCheckoutStep = step;
    this.updateCheckoutStepUI();
  },

  updateCheckoutStepUI() {
    for (let i = 1; i <= 3; i++) {
      const stepView = document.getElementById(`checkout-step-${i}`);
      const stepIndicator = document.getElementById(`step-indicator-${i}`);
      if (stepView) {
        stepView.classList.toggle("hidden", i !== this.currentCheckoutStep);
      }
      if (stepIndicator) {
        if (i <= this.currentCheckoutStep) {
          stepIndicator.classList.add("bg-indigo-600", "text-white");
          stepIndicator.classList.remove("bg-slate-200", "dark:bg-slate-700", "text-slate-600", "dark:text-slate-400");
        } else {
          stepIndicator.classList.remove("bg-indigo-600", "text-white");
          stepIndicator.classList.add("bg-slate-200", "dark:bg-slate-700", "text-slate-600", "dark:text-slate-400");
        }
      }
    }
  },

  updateCheckoutSummaryUI() {
    const container = document.getElementById("checkout-order-items");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const shippingEl = document.getElementById("checkout-shipping");
    const taxEl = document.getElementById("checkout-tax");
    const totalEl = document.getElementById("checkout-total");
    const totals = window.store.getCartTotals();

    if (container) {
      container.innerHTML = window.store.cart.map(item => `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <img src="${item.image}" alt="${item.name}" class="w-8 h-8 rounded object-cover" />
            <div>
              <span class="font-medium text-slate-800 dark:text-slate-200">${item.name}</span>
              <span class="text-slate-400"> × ${item.quantity}</span>
            </div>
          </div>
          <span class="font-bold text-slate-800 dark:text-slate-200">${window.store.formatPrice(item.price * item.quantity)}</span>
        </div>
      `).join("");
    }

    if (subtotalEl) subtotalEl.textContent = window.store.formatPrice(totals.subtotal);
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? "FREE" : window.store.formatPrice(totals.shipping);
    if (taxEl) taxEl.textContent = window.store.formatPrice(totals.estimatedTax);
    if (totalEl) totalEl.textContent = window.store.formatPrice(totals.finalTotal);
  },

  bindCardInputs() {
    const cardNum = document.getElementById("card-number");
    const cardName = document.getElementById("card-holder");
    const cardExp = document.getElementById("card-expiry");

    const previewNum = document.getElementById("preview-card-number");
    const previewName = document.getElementById("preview-card-holder");
    const previewExp = document.getElementById("preview-card-expiry");

    if (cardNum) {
      cardNum.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "").substring(0, 16);
        let formatted = v.match(/.{1,4}/g)?.join(" ") || v;
        e.target.value = formatted;
        if (previewNum) previewNum.textContent = formatted || "•••• •••• •••• ••••";
      });
    }

    if (cardName) {
      cardName.addEventListener("input", (e) => {
        if (previewName) previewName.textContent = e.target.value.toUpperCase() || "YOUR NAME";
      });
    }

    if (cardExp) {
      cardExp.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "").substring(0, 4);
        if (v.length >= 2) v = v.substring(0, 2) + "/" + v.substring(2);
        e.target.value = v;
        if (previewExp) previewExp.textContent = v || "MM/YY";
      });
    }
  },

  async submitOrder() {
    const name = document.getElementById("checkout-name")?.value.trim() || "Valued Customer";
    const email = document.getElementById("checkout-email")?.value.trim() || "customer@example.com";
    const address = document.getElementById("checkout-address")?.value.trim() || "123 Innovation Way";
    const city = document.getElementById("checkout-city")?.value.trim() || "Metropolis";
    const state = document.getElementById("checkout-state")?.value.trim() || "CA";
    const zip = document.getElementById("checkout-zip")?.value.trim() || "94016";
    const country = document.getElementById("checkout-country")?.value || "United States";

    const shippingMethod = document.querySelector("input[name='shipping-method']:checked")?.value || "Standard Delivery";
    const paymentMethod = document.querySelector("input[name='payment-method']:checked")?.value || "Credit Card";

    const shippingDetails = {
      fullName: name,
      email,
      address,
      city,
      state,
      zip,
      country,
      shippingMethod
    };

    try {
      const order = await window.store.createOrder(shippingDetails, paymentMethod);
      this.closeCheckout();
      this.showOrderConfirmation(order);
    } catch (err) {
      UI.showToast(err.message || "Failed to place order. Please try again.", "error");
    }
  },

  showOrderConfirmation(order) {
    const modal = document.getElementById("confirmation-modal");
    const detailsContainer = document.getElementById("confirmation-order-details");

    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left mb-6">
          <div class="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700 text-xs">
            <span class="text-slate-500">Order Reference:</span>
            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">${order.orderId}</span>
          </div>
          <div class="flex justify-between items-center py-2 text-xs">
            <span class="text-slate-500">Delivering To:</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">${order.shippingDetails?.fullName || 'Customer'}, ${order.shippingDetails?.city || ''}</span>
          </div>
          <div class="flex justify-between items-center py-2 text-xs">
            <span class="text-slate-500">Payment:</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">${order.paymentMethod || 'Credit Card'}</span>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
            <span class="font-semibold text-slate-800 dark:text-slate-200">Total Paid:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-base">${window.store.formatPrice(order.totals?.finalTotal || 0)}</span>
          </div>
        </div>

        <div class="space-y-2 mb-6 max-h-48 overflow-y-auto text-left pr-1">
          <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Purchased Items:</h5>
          ${(order.items || []).map(i => `
            <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">${i.name} × ${i.quantity}</span>
              <span class="font-medium text-slate-900 dark:text-white">${window.store.formatPrice(i.price * i.quantity)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    UI.showToast("Order placed successfully!", "success");
    if (window.lucide) lucide.createIcons();
  },

  closeConfirmationModal() {
    const modal = document.getElementById("confirmation-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  // ==========================================
  //  ADMIN DASHBOARD
  // ==========================================

  openAdminModal() {
    UI.renderAdminTable();
    const modal = document.getElementById("admin-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  },

  closeAdminModal() {
    const modal = document.getElementById("admin-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  },

  async handleCreateProduct(e) {
    e.preventDefault();
    const name = document.getElementById("new-prod-name").value.trim();
    const category = document.getElementById("new-prod-category").value;
    const price = parseFloat(document.getElementById("new-prod-price").value);
    const stock = parseInt(document.getElementById("new-prod-stock").value, 10);
    const image = document.getElementById("new-prod-image").value.trim() || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";
    const tagline = document.getElementById("new-prod-tagline").value.trim() || "Signature design with exceptional craft";
    const description = document.getElementById("new-prod-desc").value.trim() || "Engineered for high performance and durability.";

    if (!name || isNaN(price) || isNaN(stock)) {
      UI.showToast("Please provide valid product details", "error");
      return;
    }

    const categoryNames = {
      electronics: "Electronics & Gadgets",
      audio: "Audio & Sound",
      wearables: "Wearables & Watches",
      fashion: "Fashion & Lifestyle",
      home: "Home & Living"
    };

    try {
      await window.store.addProduct({
        name,
        category,
        categoryName: categoryNames[category] || category,
        price,
        stock,
        image,
        tagline,
        description,
        badge: "New"
      });

      e.target.reset();
      UI.renderAdminTable();
      UI.showToast(`Product "${name}" added to server database!`, "success");
    } catch (err) {
      UI.showToast(err.message || "Failed to add product", "error");
    }
  }
};

window.app = app;

// Bootstrap application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
