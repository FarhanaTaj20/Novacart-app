/**
 * NovaStore UI Renderer
 * Handles dynamic DOM updates for products, cart, wishlist, modals, toasts, and orders.
 */

const UI = {
  // --- Toast Notifications ---
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColors = {
      success: "bg-emerald-600 text-white",
      error: "bg-rose-600 text-white",
      info: "bg-indigo-600 text-white"
    };

    const iconNames = {
      success: "check-circle",
      error: "alert-circle",
      info: "info"
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transform transition-all duration-300 translate-y-4 opacity-0 pointer-events-auto ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i data-lucide="${iconNames[type] || 'info'}" class="w-5 h-5 flex-shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // Trigger animate in
    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // --- Render Product Grid ---
  renderProducts(products, viewMode = "grid") {
    const container = document.getElementById("product-container");
    const countEl = document.getElementById("product-count");
    if (!container) return;

    if (countEl) {
      countEl.textContent = `${products.length} product${products.length === 1 ? "" : "s"} found`;
    }

    if (products.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <i data-lucide="package-search" class="w-8 h-8"></i>
          </div>
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">No products match your criteria</h3>
          <p class="text-sm text-slate-500 mt-1">Try adjusting your filters, price range, or search keywords.</p>
          <button onclick="store.resetFilters()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
            Clear all filters
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (viewMode === "list") {
      container.className = "flex flex-col gap-4";
      container.innerHTML = products.map(p => this.createProductListCard(p)).join("");
    } else {
      container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
      container.innerHTML = products.map(p => this.createProductGridCard(p)).join("");
    }

    if (window.lucide) lucide.createIcons();
  },

  createProductGridCard(p) {
    const isWish = window.store.isWishlisted(p.id);
    const formattedPrice = window.store.formatPrice(p.price);
    const originalPriceFormatted = p.originalPrice ? window.store.formatPrice(p.originalPrice) : null;
    const isOut = p.stock <= 0;

    return `
      <div class="group relative bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
        <!-- Badge -->
        <div class="absolute top-3 left-3 z-10 flex flex-col gap-1">
          ${p.badge ? `<span class="px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${p.badge === 'Best Seller' ? 'bg-amber-500 text-white' : p.badge === 'Sale' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}">${p.badge}</span>` : ''}
          ${p.discountPercent ? `<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500 text-white shadow-sm">-${p.discountPercent}%</span>` : ''}
        </div>

        <!-- Wishlist Button -->
        <button 
          onclick="app.handleWishlistToggle('${p.id}', this)" 
          title="${isWish ? 'Remove from wishlist' : 'Add to wishlist'}"
          class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 shadow-sm transition-transform active:scale-90"
        >
          <i data-lucide="heart" class="w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}"></i>
        </button>

        <!-- Product Image -->
        <div class="relative w-full pt-[80%] bg-slate-100 dark:bg-slate-900/50 overflow-hidden cursor-pointer" onclick="app.openQuickView('${p.id}')">
          <img 
            src="${p.image}" 
            alt="${p.name}" 
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          ${isOut ? `
            <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
              <span class="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md tracking-wider uppercase">Sold Out</span>
            </div>
          ` : ''}
          <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
            <span class="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-lg text-xs font-semibold backdrop-blur-sm shadow flex items-center gap-1.5 hover:bg-white transition-colors">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i> Quick View
            </span>
          </div>
        </div>

        <!-- Product Details -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-medium tracking-wide uppercase text-[10px] text-indigo-600 dark:text-indigo-400">${p.categoryName || p.category}</span>
              <div class="flex items-center gap-1 text-amber-500">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300 text-xs">${p.rating}</span>
                <span class="text-slate-400 text-[11px]">(${p.reviewCount})</span>
              </div>
            </div>

            <h3 onclick="app.openQuickView('${p.id}')" class="font-semibold text-slate-800 dark:text-slate-100 text-base line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors" title="${p.name}">
              ${p.name}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              ${p.tagline || p.description}
            </p>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-bold text-slate-900 dark:text-white">${formattedPrice}</span>
                ${originalPriceFormatted ? `<span class="text-xs text-slate-400 line-through">${originalPriceFormatted}</span>` : ''}
              </div>
              <span class="text-[11px] ${p.stock < 10 && p.stock > 0 ? 'text-amber-500 font-medium' : 'text-slate-400'}">
                ${isOut ? 'Out of stock' : p.stock < 10 ? `Only ${p.stock} left!` : 'In stock'}
              </span>
            </div>

            <button 
              onclick="app.handleAddToCart('${p.id}')"
              ${isOut ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-indigo-600/20 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  createProductListCard(p) {
    const isWish = window.store.isWishlisted(p.id);
    const formattedPrice = window.store.formatPrice(p.price);
    const originalPriceFormatted = p.originalPrice ? window.store.formatPrice(p.originalPrice) : null;
    const isOut = p.stock <= 0;

    return `
      <div class="group bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row items-center gap-6">
        <div class="relative w-full sm:w-48 h-48 sm:h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0 cursor-pointer" onclick="app.openQuickView('${p.id}')">
          <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ${p.badge ? `<span class="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-600 text-white">${p.badge}</span>` : ''}
        </div>

        <div class="flex-1 w-full flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 tracking-wide">${p.categoryName}</span>
              <div class="flex items-center gap-1 text-amber-500">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-200 text-xs">${p.rating}</span>
                <span class="text-slate-400 text-xs">(${p.reviewCount} reviews)</span>
              </div>
            </div>
            <h3 onclick="app.openQuickView('${p.id}')" class="font-bold text-slate-900 dark:text-white text-lg mt-1 cursor-pointer hover:text-indigo-600 transition-colors">
              ${p.name}
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${p.description}</p>
          </div>

          <div class="mt-4 flex items-center justify-between flex-wrap gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <div class="flex items-baseline gap-2">
              <span class="text-xl font-bold text-slate-900 dark:text-white">${formattedPrice}</span>
              ${originalPriceFormatted ? `<span class="text-xs text-slate-400 line-through">${originalPriceFormatted}</span>` : ''}
              <span class="text-xs ml-2 ${p.stock < 10 && p.stock > 0 ? 'text-amber-500 font-medium' : 'text-slate-400'}">
                ${isOut ? 'Out of stock' : `${p.stock} units in stock`}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                onclick="app.handleWishlistToggle('${p.id}', this)"
                class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                title="Save for later"
              >
                <i data-lucide="heart" class="w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}"></i>
              </button>
              <button 
                onclick="app.handleAddToCart('${p.id}')"
                ${isOut ? 'disabled' : ''}
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                <i data-lucide="shopping-bag" class="w-4 h-4"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --- Cart Drawer Rendering ---
  renderCart() {
    const cartList = document.getElementById("cart-items-list");
    const countBadge = document.getElementById("cart-badge");
    const countSub = document.getElementById("cart-drawer-count");
    const emptyState = document.getElementById("cart-empty-state");
    const footer = document.getElementById("cart-footer");
    const progressFill = document.getElementById("free-shipping-progress");
    const progressText = document.getElementById("free-shipping-text");
    const subtotalEl = document.getElementById("cart-subtotal");
    const discountRow = document.getElementById("cart-discount-row");
    const discountEl = document.getElementById("cart-discount");
    const shippingEl = document.getElementById("cart-shipping");
    const taxEl = document.getElementById("cart-tax");
    const totalEl = document.getElementById("cart-total");

    const count = window.store.getCartCount();
    if (countBadge) {
      countBadge.textContent = count;
      countBadge.classList.toggle("hidden", count === 0);
    }
    if (countSub) {
      countSub.textContent = `(${count} item${count === 1 ? "" : "s"})`;
    }

    const totals = window.store.getCartTotals();

    // Free shipping progress
    if (progressFill && progressText) {
      progressFill.style.width = `${totals.progressToFreeShipping}%`;
      if (totals.remainingForFreeShipping <= 0) {
        progressText.innerHTML = `<span class="text-emerald-500 font-semibold flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> You unlocked Free Standard Shipping!</span>`;
      } else {
        progressText.innerHTML = `Add <span class="font-bold text-slate-800 dark:text-slate-200">${window.store.formatPrice(totals.remainingForFreeShipping)}</span> more for Free Shipping`;
      }
    }

    if (window.store.cart.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      if (cartList) cartList.innerHTML = "";
      if (footer) footer.classList.add("hidden");
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    if (footer) footer.classList.remove("hidden");

    if (cartList) {
      cartList.innerHTML = window.store.cart.map(item => `
        <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
          <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-white dark:bg-slate-900" />
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${item.name}</h4>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              ${item.selectedColor ? `<span>Color: <strong class="text-slate-700 dark:text-slate-300">${item.selectedColor}</strong></span>` : ''}
              ${item.selectedSize ? `<span>Size: <strong class="text-slate-700 dark:text-slate-300">${item.selectedSize}</strong></span>` : ''}
            </div>
            <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              ${window.store.formatPrice(item.price)}
            </div>
          </div>
          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <button onclick="window.store.removeFromCart('${item.cartKey}')" class="text-slate-400 hover:text-rose-500 transition-colors" title="Remove item">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <button onclick="window.store.updateCartQuantity('${item.cartKey}', ${item.quantity - 1})" class="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-colors">
                <i data-lucide="minus" class="w-3 h-3"></i>
              </button>
              <span class="px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-[1.5rem] text-center">${item.quantity}</span>
              <button onclick="window.store.updateCartQuantity('${item.cartKey}', ${item.quantity + 1})" class="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-colors">
                <i data-lucide="plus" class="w-3 h-3"></i>
              </button>
            </div>
          </div>
        </div>
      `).join("");
    }

    // Update summary labels
    if (subtotalEl) subtotalEl.textContent = window.store.formatPrice(totals.subtotal);
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? "FREE" : window.store.formatPrice(totals.shipping);
    if (taxEl) taxEl.textContent = window.store.formatPrice(totals.estimatedTax);
    if (totalEl) totalEl.textContent = window.store.formatPrice(totals.finalTotal);

    if (discountRow && discountEl) {
      if (totals.discount > 0) {
        discountRow.classList.remove("hidden");
        discountEl.textContent = `-${window.store.formatPrice(totals.discount)}`;
      } else {
        discountRow.classList.add("hidden");
      }
    }

    // Coupon tag
    const couponTagContainer = document.getElementById("applied-coupon-tag");
    if (couponTagContainer) {
      if (totals.coupon) {
        couponTagContainer.classList.remove("hidden");
        couponTagContainer.innerHTML = `
          <div class="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
            <div class="flex items-center gap-1.5">
              <i data-lucide="tag" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Code <strong>${totals.coupon.code}</strong> applied (${totals.coupon.desc})</span>
            </div>
            <button onclick="window.store.removeCoupon()" class="text-emerald-700 hover:text-rose-600 ml-2">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      } else {
        couponTagContainer.classList.add("hidden");
        couponTagContainer.innerHTML = "";
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  // --- Wishlist Modal / Drawer ---
  renderWishlist() {
    const list = document.getElementById("wishlist-items-list");
    const badge = document.getElementById("wishlist-badge");
    const items = window.store.getWishlistItems();

    if (badge) {
      badge.textContent = items.length;
      badge.classList.toggle("hidden", items.length === 0);
    }

    if (!list) return;

    if (items.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <i data-lucide="heart" class="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-slate-300 dark:text-slate-600"></i>
          <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Your wishlist is empty</p>
          <p class="text-xs text-slate-400 mt-1">Tap the heart icon on any product to save it for later.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    list.innerHTML = items.map(p => `
      <div class="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <img src="${p.image}" alt="${p.name}" class="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-slate-800 dark:text-white truncate">${p.name}</h4>
          <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">${window.store.formatPrice(p.price)}</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="app.handleAddToCart('${p.id}'); window.store.toggleWishlist('${p.id}');" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors">
            <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Move to Cart
          </button>
          <button onclick="window.store.toggleWishlist('${p.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join("");

    if (window.lucide) lucide.createIcons();
  },

  // --- Quick View / Product Detail Modal ---
  renderProductModal(product) {
    const modalContent = document.getElementById("product-modal-content");
    if (!modalContent || !product) return;

    const formattedPrice = window.store.formatPrice(product.price);
    const originalPriceFormatted = product.originalPrice ? window.store.formatPrice(product.originalPrice) : null;
    const isOut = product.stock <= 0;
    const isWish = window.store.isWishlisted(product.id);

    modalContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Gallery Section -->
        <div>
          <div class="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <img id="modal-main-image" src="${product.image}" alt="${product.name}" class="w-full h-full object-cover object-center transition-all duration-300" />
            ${product.badge ? `<span class="absolute top-3 left-3 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">${product.badge}</span>` : ''}
          </div>
          <!-- Thumbnails -->
          ${product.images && product.images.length > 1 ? `
            <div class="flex gap-3 mt-4">
              ${product.images.map((img, i) => `
                <button onclick="document.getElementById('modal-main-image').src = '${img}'" class="w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-600 focus:border-indigo-600 transition-all">
                  <img src="${img}" alt="Thumbnail ${i+1}" class="w-full h-full object-cover" />
                </button>
              `).join("")}
            </div>
          ` : ''}
        </div>

        <!-- Info Section -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${product.categoryName}</span>
              <div class="flex items-center gap-1 text-amber-500">
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${product.rating}</span>
                <span class="text-xs text-slate-400">(${product.reviewCount} customer reviews)</span>
              </div>
            </div>

            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mt-2">${product.name}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${product.tagline}</p>

            <div class="flex items-baseline gap-3 mt-4">
              <span class="text-3xl font-extrabold text-slate-900 dark:text-white">${formattedPrice}</span>
              ${originalPriceFormatted ? `<span class="text-base text-slate-400 line-through">${originalPriceFormatted}</span>` : ''}
              ${product.discountPercent ? `<span class="px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">Save ${product.discountPercent}%</span>` : ''}
            </div>

            <p class="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">${product.description}</p>

            <!-- Variants (Colors) -->
            ${product.colors && product.colors.length > 0 ? `
              <div class="mt-5">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Color:</label>
                <div class="flex flex-wrap gap-2" id="modal-color-options">
                  ${product.colors.map((c, idx) => `
                    <button type="button" onclick="app.selectModalVariant('color', '${c}', this)" class="modal-variant-btn px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${idx === 0 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'}">
                      ${c}
                    </button>
                  `).join("")}
                </div>
              </div>
            ` : ''}

            <!-- Variants (Sizes) -->
            ${product.sizes && product.sizes.length > 0 ? `
              <div class="mt-4">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Option / Size:</label>
                <div class="flex flex-wrap gap-2" id="modal-size-options">
                  ${product.sizes.map((s, idx) => `
                    <button type="button" onclick="app.selectModalVariant('size', '${s}', this)" class="modal-variant-btn px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${idx === 0 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'}">
                      ${s}
                    </button>
                  `).join("")}
                </div>
              </div>
            ` : ''}

            <!-- Features Highlights -->
            ${product.features && product.features.length > 0 ? `
              <div class="mt-5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                <h4 class="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">Key Highlights:</h4>
                <ul class="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  ${product.features.map(f => `<li class="flex items-center gap-2"><i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"></i>${f}</li>`).join("")}
                </ul>
              </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <!-- Quantity Stepper -->
            <div class="flex items-center border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <button onclick="app.adjustModalQty(-1)" class="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i data-lucide="minus" class="w-4 h-4"></i>
              </button>
              <input id="modal-qty-input" type="number" min="1" max="${product.stock}" value="1" readonly class="w-12 text-center text-sm font-semibold text-slate-800 dark:text-white bg-transparent border-0 focus:ring-0" />
              <button onclick="app.adjustModalQty(1)" class="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i data-lucide="plus" class="w-4 h-4"></i>
              </button>
            </div>

            <!-- Add Button -->
            <button 
              id="modal-add-to-cart-btn"
              onclick="app.addFromModal('${product.id}')"
              ${isOut ? 'disabled' : ''}
              class="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              <span>${isOut ? 'Sold Out' : 'Add to Cart'}</span>
            </button>

            <!-- Wishlist Button -->
            <button 
              onclick="app.handleWishlistToggle('${product.id}', this)"
              class="p-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              title="Save to wishlist"
            >
              <i data-lucide="heart" class="w-5 h-5 ${isWish ? 'fill-rose-500 text-rose-500' : ''}"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  // --- Admin Panel Table Rendering ---
  renderAdminTable() {
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    tbody.innerHTML = window.store.products.map(p => `
      <tr class="border-b border-slate-200 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td class="py-3 px-4 flex items-center gap-3">
          <img src="${p.image}" alt="${p.name}" class="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
          <div>
            <div class="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[200px]">${p.name}</div>
            <div class="text-xs text-slate-400">${p.categoryName || p.category}</div>
          </div>
        </td>
        <td class="py-3 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
          $${p.price.toFixed(2)}
        </td>
        <td class="py-3 px-4">
          <input 
            type="number" 
            value="${p.stock}" 
            min="0"
            onchange="window.store.updateStock('${p.id}', this.value); UI.showToast('Stock updated', 'info');"
            class="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
          />
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${p.stock > 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'}">
            ${p.stock > 0 ? 'Active' : 'Out of Stock'}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <button 
            onclick="if(confirm('Delete product ${p.name.replace(/'/g, "\\'")}?')) { window.store.deleteProduct('${p.id}'); UI.renderAdminTable(); UI.showToast('Product deleted', 'info'); }"
            class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
            title="Delete product"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join("");

    // Also render orders tab in admin
    const ordersTbody = document.getElementById("admin-orders-tbody");
    if (ordersTbody) {
      window.api.get('/orders?all=true').then(res => {
        const orders = (res && res.orders) || [];
        if (orders.length === 0) {
          ordersTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">No customer orders placed yet.</td></tr>`;
        } else {
          ordersTbody.innerHTML = orders.map(order => `
            <tr class="border-b border-slate-200 dark:border-slate-700/60">
              <td class="py-3 px-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">${order.orderId}</td>
              <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                <div class="font-medium">${order.shippingDetails?.fullName || order.userName || 'Customer'}</div>
                <div class="text-[11px] text-slate-400">${order.userEmail || ''}</div>
              </td>
              <td class="py-3 px-4 text-xs text-slate-500">${order.items.length} item(s)</td>
              <td class="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-100">${window.store.formatPrice(order.totals?.finalTotal || 0)}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">${order.status}</span>
              </td>
            </tr>
          `).join("");
        }
      }).catch(err => {
        ordersTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-rose-500">Failed to load admin orders: ${err.message}</td></tr>`;
      });
    }

    if (window.lucide) lucide.createIcons();
  },

  // --- Auth UI in Navigation Header ---
  renderAuthUI() {
    const container = document.getElementById("header-auth-container");
    if (!container) return;

    const user = window.store.currentUser;

    if (user) {
      const initial = (user.name || 'U').charAt(0).toUpperCase();
      container.innerHTML = `
        <div class="relative group">
          <button 
            onclick="app.toggleUserMenu()"
            class="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-all text-xs font-semibold"
          >
            <div class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ${initial}
            </div>
            <span class="hidden md:inline max-w-[100px] truncate">${user.name}</span>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
          </button>

          <!-- Dropdown Menu -->
          <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50">
            <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs">
              <div class="font-bold text-slate-800 dark:text-white truncate">${user.name}</div>
              <div class="text-[11px] text-slate-400 truncate">${user.email}</div>
            </div>
            <button onclick="app.openProfileModal(); app.toggleUserMenu(false);" class="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
              <i data-lucide="user" class="w-4 h-4 text-indigo-500"></i> My Profile
            </button>
            <button onclick="app.openUserOrdersModal(); app.toggleUserMenu(false);" class="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
              <i data-lucide="package" class="w-4 h-4 text-indigo-500"></i> My Orders
            </button>
            <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
            <button onclick="app.handleLogout(); app.toggleUserMenu(false);" class="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2">
              <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button 
          onclick="app.openAuthModal('login')"
          class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <i data-lucide="user" class="w-3.5 h-3.5"></i>
          <span>Sign In</span>
        </button>
      `;
    }

    if (window.lucide) lucide.createIcons();
  },

  // --- Render User Orders in My Orders Modal ---
  renderUserOrders(orders) {
    const container = document.getElementById("user-orders-list");
    if (!container) return;

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <i data-lucide="package-search" class="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-slate-300 dark:text-slate-600"></i>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">No past orders found</p>
          <p class="text-xs text-slate-400 mt-1">When you place an order, it will securely appear here.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">${order.orderId}</span>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">${order.status || 'Processing'}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">${new Date(order.date).toLocaleDateString()} at ${new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="text-right">
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">${window.store.formatPrice(order.totals?.finalTotal || 0)}</div>
            <div class="text-[11px] text-slate-400">${order.paymentMethod || 'Credit Card'}</div>
          </div>
        </div>

        <div class="space-y-1.5">
          ${order.items.map(item => `
            <div class="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <span class="truncate max-w-[240px]">${item.name} × ${item.quantity}</span>
              <span class="font-medium text-slate-900 dark:text-white">${window.store.formatPrice(item.price * item.quantity)}</span>
            </div>
          `).join("")}
        </div>

        <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Delivered to: <strong>${order.shippingDetails?.fullName || 'Self'}, ${order.shippingDetails?.city || ''}</strong></span>
          <button onclick="app.showOrderConfirmation(${JSON.stringify(order).replace(/"/g, '&quot;')})" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            View Receipt
          </button>
        </div>
      </div>
    `).join("");

    if (window.lucide) lucide.createIcons();
  }
};

window.UI = UI;
