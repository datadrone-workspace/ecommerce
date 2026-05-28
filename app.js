/* =====================================================================
   LuxeMart — App Logic  (app.js)
   ===================================================================== */
"use strict";

/* -------------------------------------------------------------------
   APP STATE
   ------------------------------------------------------------------- */
const AppState = {
  currentUser:       null,
  currentPage:       "home",
  currentProduct:    null,
  cart:              [],             // [{product, quantity}]
  wishlist:          [],             // [productId]
  orders:            [],
  cartId:            "cart_" + Date.now(),
  appliedCoupon:     null,
  checkoutStep:      1,
  checkoutData: {
    address:    null,
    delivery:   null,
    payment:    null,
  },
  filters: {
    categories: [],
    priceMin:   0,
    priceMax:   50000,
    rating:     null,
    brands:     [],
  },
  shopPage:         1,
  itemsPerPage:     12,
  menuOpen:         false,
  userMenuOpen:     false,
  searchOpen:       false,
  productTimers:    {},             // product view time tracking
  recentlyViewed:   [],             // [productId]
};

/* -------------------------------------------------------------------
   INIT
   ------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  restoreSessionState();
  initTimeTracking();
  initScrollTracking();
  showScreen("login");
});

function restoreSessionState() {
  try {
    const cart     = localStorage.getItem("lm_cart");
    const wishlist = localStorage.getItem("lm_wishlist");
    const orders   = localStorage.getItem("lm_orders");
    const recent   = localStorage.getItem("lm_recent");
    if (cart)     AppState.cart = JSON.parse(cart);
    if (wishlist) AppState.wishlist = JSON.parse(wishlist);
    if (orders)   AppState.orders = JSON.parse(orders);
    if (recent)   AppState.recentlyViewed = JSON.parse(recent);
  } catch {}
}

function persistState() {
  try {
    localStorage.setItem("lm_cart",     JSON.stringify(AppState.cart));
    localStorage.setItem("lm_wishlist", JSON.stringify(AppState.wishlist));
    localStorage.setItem("lm_orders",   JSON.stringify(AppState.orders));
    localStorage.setItem("lm_recent",   JSON.stringify(AppState.recentlyViewed));
  } catch {}
}

/* -------------------------------------------------------------------
   SCREEN / PAGE ROUTING
   ------------------------------------------------------------------- */
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add("active");
}

function navigateTo(page, event) {
  if (event) event.preventDefault();
  if (!AppState.currentUser && page !== "login" && page !== "signup") {
    showScreen("login"); return;
  }

  AppState.currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === page);
  });

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add("active");
    pageEl.scrollIntoView({ behavior: "instant", block: "start" });
    window.scrollTo(0, 0);
  }

  // Lifecycle hooks
  switch (page) {
    case "home":     renderHome();                              break;
    case "shop":     renderShop();                             break;
    case "cart":     renderCart();                             break;
    case "checkout": renderCheckout();                         break;
    case "wishlist": renderWishlist();                         break;
    case "orders":   renderOrders();                           break;
    case "deals":    renderDeals();                            break;
    case "profile":  renderProfile();                         break;
  }

  // Track page views
  SegmentTracker.trackPageViewed(page);
}

/* -------------------------------------------------------------------
   AUTH
   ------------------------------------------------------------------- */
function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) { showToast("Please fill in all fields", "error"); return; }

  const user = DEMO_USER_PROFILES.find(u => u.email === email && u.password === password);
  if (!user) {
    // For demo: allow any email/password and create a dynamic user
    const dynamicUser = createDynamicUser(email);
    loginUser(dynamicUser, "email");
    return;
  }
  loginUser(user, "email");
}

function createDynamicUser(email) {
  const namePart = email.split("@")[0];
  const parts    = namePart.split(/[._-]/);
  return {
    id:           "U_" + Date.now(),
    email,
    firstName:    capitalise(parts[0] || "Guest"),
    lastName:     capitalise(parts[1] || "User"),
    phone:        null,
    dob:          null,
    preferences:  [],
    memberSince:  new Date().toISOString().split("T")[0],
    loyaltyPoints: 0,
    totalOrders:  0,
    totalSpent:   0,
    segment:      "new_user",
  };
}

function loginUser(user, method) {
  AppState.currentUser = user;
  SegmentTracker.trackUserLoggedIn(user, method);
  updateNavUser(user);
  showScreen("app");
  navigateTo("home");
  showToast(`Welcome back, ${user.firstName}! 👋`, "success");
}

function handleSocialLogin(provider) {
  SegmentTracker.trackSocialAuthInitiated(provider);
  // Simulate social login
  const socialUser = {
    id:           "U_social_" + Date.now(),
    email:        `demo+${provider}@luxemart.com`,
    firstName:    provider === "google" ? "Alex" : "Sam",
    lastName:     "User",
    phone:        null, dob: null, preferences: [],
    memberSince:  new Date().toISOString().split("T")[0],
    loyaltyPoints: 0, totalOrders: 0, totalSpent: 0, segment: "social_user",
  };
  loginUser(socialUser, provider);
}

function handleSignup() {
  const firstName   = document.getElementById("signup-fname").value.trim();
  const lastName    = document.getElementById("signup-lname").value.trim();
  const email       = document.getElementById("signup-email").value.trim();
  const phone       = document.getElementById("signup-phone").value.trim();
  const dob         = document.getElementById("signup-dob").value;
  const prefs       = [...document.querySelectorAll("#signup-prefs .chip.active")].map(c => c.dataset.pref);

  if (!firstName || !email) { showToast("Please fill in required fields", "error"); return; }

  const newUser = {
    id:           "U_" + Date.now(),
    email, firstName, lastName,
    phone:        phone || null,
    dob:          dob || null,
    preferences:  prefs,
    memberSince:  new Date().toISOString().split("T")[0],
    loyaltyPoints: 0,
    totalOrders:  0,
    totalSpent:   0,
    segment:      "new_user",
  };

  SegmentTracker.trackUserSignedUp(newUser, "email");
  loginUser(newUser, "email");
  showToast("Account created successfully! 🎉", "success");
}

function handleLogout() {
  if (AppState.currentUser) {
    SegmentTracker.trackUserLoggedOut(AppState.currentUser.id);
  }
  AppState.currentUser = null;
  AppState.checkoutData = { address: null, delivery: null, payment: null };
  closeMenu();
  if (AppState.userMenuOpen) toggleUserMenu();
  showScreen("login");
}

function handleSignupClick(e) { e.preventDefault(); showScreen("signup"); }
function handleLoginClick(e)  { e.preventDefault(); showScreen("login"); }
function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  if (email) { SegmentTracker.trackPasswordResetRequested(email); showToast("Reset link sent!", "success"); }
  else { showToast("Enter your email first", "error"); }
}

/* -------------------------------------------------------------------
   NAV & UI HELPERS
   ------------------------------------------------------------------- */
function updateNavUser(user) {
  const initials = (user.firstName[0] + (user.lastName?.[0] || "")).toUpperCase();
  document.getElementById("user-avatar-initials").textContent = initials;
  document.getElementById("dropdown-name").textContent  = `${user.firstName} ${user.lastName}`;
  document.getElementById("dropdown-email").textContent = user.email;
  updateBadges();
}

function updateBadges() {
  const cartCount     = AppState.cart.reduce((s, i) => s + i.quantity, 0);
  const wishlistCount = AppState.wishlist.length;
  document.getElementById("cart-badge").textContent     = cartCount;
  document.getElementById("wishlist-badge").textContent = wishlistCount;
  document.getElementById("cart-badge").style.display     = cartCount > 0 ? "flex" : "none";
  document.getElementById("wishlist-badge").style.display = wishlistCount > 0 ? "flex" : "none";
}

function toggleMenu() {
  AppState.menuOpen = !AppState.menuOpen;
  document.getElementById("mobile-menu").classList.toggle("open", AppState.menuOpen);
  document.getElementById("menu-overlay").classList.toggle("active", AppState.menuOpen);
  document.getElementById("menu-toggle").classList.toggle("open", AppState.menuOpen);
}
function closeMenu() {
  AppState.menuOpen = false;
  document.getElementById("mobile-menu").classList.remove("open");
  document.getElementById("menu-overlay").classList.remove("active");
  document.getElementById("menu-toggle").classList.remove("open");
}

function toggleUserMenu() {
  AppState.userMenuOpen = !AppState.userMenuOpen;
  document.getElementById("user-dropdown").classList.toggle("active", AppState.userMenuOpen);
}

function toggleSearch() {
  AppState.searchOpen = !AppState.searchOpen;
  const bar = document.getElementById("search-bar");
  bar.classList.toggle("active", AppState.searchOpen);
  if (AppState.searchOpen) document.getElementById("search-input").focus();
}

function toggleSidebar() {
  document.getElementById("shop-sidebar").classList.toggle("mobile-open");
}

function togglePref(btn) { btn.classList.toggle("active"); }

/* -------------------------------------------------------------------
   HOME PAGE
   ------------------------------------------------------------------- */
function renderHome() {
  const user = AppState.currentUser;
  const hour = new Date().getHours();
  const greetings = [
    hour < 12 ? `Good morning, ${user.firstName}` :
    hour < 17 ? `Good afternoon, ${user.firstName}` :
                `Good evening, ${user.firstName}`
  ];
  document.getElementById("hero-greeting").textContent = greetings[0];

  // Dynamic hero based on user preferences
  const prefs = user.preferences || [];
  const heroSub = prefs.length > 0
    ? `Curated picks in ${prefs.map(p => CATEGORIES.find(c => c.id === p)?.label || p).join(", ")} just for you.`
    : "Discover products crafted to your taste.";
  document.getElementById("hero-sub").textContent = heroSub;

  // Hero showcase
  const heroProducts = PRODUCTS.filter(p => p.isFeatured).slice(0, 3);
  const showcase     = document.getElementById("hero-showcase");
  showcase.innerHTML = heroProducts.map((p, i) => `
    <div class="showcase-card" style="animation-delay:${i * 0.15}s" onclick="viewProduct('${p.id}')">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <div class="showcase-info">
        <span class="showcase-name">${p.name}</span>
        <span class="showcase-price">${formatCurrency(p.price)}</span>
      </div>
    </div>
  `).join("");

  // Categories grid
  const catsGrid = document.getElementById("categories-grid");
  catsGrid.innerHTML = CATEGORIES.map(cat => `
    <div class="category-card" style="--cat-bg:${cat.color}" onclick="selectCategory('${cat.id}')">
      <span class="cat-emoji">${cat.emoji}</span>
      <span class="cat-label">${cat.label}</span>
      <span class="cat-count">${PRODUCTS.filter(p => p.category === cat.id).length} items</span>
    </div>
  `).join("");

  // Featured & Trending
  const featured  = PRODUCTS.filter(p => p.isFeatured).slice(0, 8);
  const trending  = PRODUCTS.filter(p => p.isTrending).slice(0, 8);

  document.getElementById("featured-products").innerHTML = featured.map(p => renderProductCard(p, "featured")).join("");
  document.getElementById("trending-products").innerHTML = trending.map(p => renderProductCard(p, "trending")).join("");
  SegmentTracker.trackProductListViewed(featured, "Featured Products", "home");
  SegmentTracker.trackProductListViewed(trending, "Trending Products", "home");

  // Promo banner
  const promo = PROMO_BANNERS[0];
  document.getElementById("promo-banner").innerHTML = `
    <div class="promo-card" style="background:${promo.bg}" onclick="handlePromoBannerClick()">
      <div class="promo-text">
        <span class="promo-eyebrow">Limited Time</span>
        <h3>${promo.headline}</h3>
        <p>${promo.sub}</p>
        <button class="btn-primary">${promo.cta}</button>
      </div>
    </div>
  `;

  // Recently viewed
  if (AppState.recentlyViewed.length > 0) {
    const rvProducts = AppState.recentlyViewed.slice(0, 4)
      .map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
    document.getElementById("recently-viewed-products").innerHTML =
      rvProducts.map(p => renderProductCard(p, "recently_viewed")).join("");
    document.getElementById("recently-viewed-section").style.display = "block";
  }
}

function selectCategory(catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  AppState.filters.categories = [catId];
  SegmentTracker.trackCategorySelected(cat, "category_grid");
  navigateTo("shop");
}

function handlePromoBannerClick() {
  SegmentTracker.trackPromoBannerClicked(PROMO_BANNERS[0]);
  navigateTo("deals");
}

/* -------------------------------------------------------------------
   PRODUCT CARD RENDERER
   ------------------------------------------------------------------- */
function renderProductCard(product, source = "shop") {
  const isWishlisted = AppState.wishlist.includes(product.id);
  const urgency = product.stock <= 5 && product.stock > 0;
  const intentScore = SegmentTracker.IntentScorer.getScore();
  const showUrgency = urgency || (intentScore >= 50 && product.stock <= 10);

  return `
    <div class="product-card" data-product-id="${product.id}" onclick="viewProduct('${product.id}', '${source}')">
      <div class="product-card-img-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        ${product.isNew ? `<span class="badge-new">New</span>` : ""}
        ${product.discount > 0 ? `<span class="badge-discount">-${product.discount}%</span>` : ""}
        ${showUrgency ? `<span class="badge-urgency">⚡ Only ${product.stock} left</span>` : ""}
        <button class="wishlist-toggle ${isWishlisted ? "active" : ""}"
          onclick="toggleWishlist(event, '${product.id}')">
          ${isWishlisted ? "♥" : "♡"}
        </button>
      </div>
      <div class="product-card-body">
        <span class="product-brand">${product.brand}</span>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          ${renderStars(product.rating)}
          <span class="rating-count">(${product.reviewCount.toLocaleString()})</span>
        </div>
        <div class="product-price-row">
          <span class="product-price">${formatCurrency(product.price)}</span>
          ${product.originalPrice > product.price
            ? `<span class="product-price-orig">${formatCurrency(product.originalPrice)}</span>` : ""}
        </div>
        <button class="btn-add-cart" onclick="addToCart(event, '${product.id}', '${source}')">
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "";
  for (let i = 0; i < full; i++) stars += `<span class="star full">★</span>`;
  if (half) stars += `<span class="star half">★</span>`;
  for (let i = full + (half ? 1 : 0); i < 5; i++) stars += `<span class="star empty">★</span>`;
  return stars;
}

/* -------------------------------------------------------------------
   PRODUCT DETAIL
   ------------------------------------------------------------------- */
function viewProduct(productId, source = "shop", position = null) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  AppState.currentProduct = product;

  // Recently viewed
  AppState.recentlyViewed = [productId, ...AppState.recentlyViewed.filter(id => id !== productId)].slice(0, 10);
  persistState();

  // Track
  SegmentTracker.trackProductViewed(product, source, position);

  // Start time-on-page tracking
  startProductTimer(product);

  // Render
  renderProductDetail(product);
  navigateTo("product");
}

function startProductTimer(product) {
  clearProductTimers();
  const milestones = [30, 60, 120];
  milestones.forEach(s => {
    AppState.productTimers[s] = setTimeout(() => {
      SegmentTracker.trackTimeOnProductPage(product, s);
      if (s >= 60 && SegmentTracker.IntentScorer.shouldShowUrgencyNudge()) {
        showUrgencyNudge(product);
      }
    }, s * 1000);
  });
}

function clearProductTimers() {
  Object.values(AppState.productTimers).forEach(t => clearTimeout(t));
  AppState.productTimers = {};
}

function showUrgencyNudge(product) {
  const archetype = SegmentTracker.PricingSensitivityClassifier.getArchetype();
  let message = "";
  if (product.stock <= 5) {
    message = `🔥 Only ${product.stock} left in stock!`;
    SegmentTracker.trackUrgencyNudgeShown(product, "low_stock");
  } else if (archetype === "discount_seeker" && SegmentTracker.PricingSensitivityClassifier.shouldOfferDiscount()) {
    message = `🎁 Use SAVE20 for extra 20% off!`;
    SegmentTracker.trackUrgencyNudgeShown(product, "personalised_offer");
  } else if (product.isTrending) {
    message = `⚡ This product is trending — selling fast!`;
    SegmentTracker.trackUrgencyNudgeShown(product, "trending");
  }
  if (message) showToast(message, "urgency");
}

function renderProductDetail(product) {
  const isWishlisted = AppState.wishlist.includes(product.id);
  const relatedProducts = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  document.getElementById("product-detail-content").innerHTML = `
    <div class="product-detail-top">
      <button class="btn-back" onclick="history.back()">← Back</button>
      <nav class="breadcrumb">
        <span onclick="navigateTo('home')">Home</span> /
        <span onclick="navigateTo('shop')">${CATEGORIES.find(c => c.id === product.category)?.label}</span> /
        <span>${product.name}</span>
      </nav>
    </div>
    <div class="product-detail-inner">
      <div class="product-images">
        <div class="product-main-img">
          <img src="${product.images[0]}" alt="${product.name}" id="main-product-img" />
        </div>
        <div class="product-thumbnails">
          ${product.images.map((img, i) => `
            <img src="${img}" alt="View ${i + 1}" onclick="switchProductImage('${img}', this)"
                 class="${i === 0 ? "active" : ""}" />
          `).join("")}
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand-lg">${product.brand}</span>
        <h1 class="product-title-lg">${product.name}</h1>
        <div class="product-rating-lg">
          ${renderStars(product.rating)}
          <span>${product.rating} · ${product.reviewCount.toLocaleString()} reviews</span>
        </div>
        <div class="product-price-lg">
          <span class="price-main">${formatCurrency(product.price)}</span>
          ${product.originalPrice > product.price ? `
            <span class="price-orig">${formatCurrency(product.originalPrice)}</span>
            <span class="price-save">Save ${formatCurrency(product.originalPrice - product.price)} (${product.discount}%)</span>
          ` : ""}
        </div>
        ${product.stock <= 10 && product.stock > 0
          ? `<p class="stock-warning">⚠ Only ${product.stock} left in stock</p>`
          : product.stock === 0
          ? `<p class="out-of-stock">Out of Stock</p>` : ""}
        <p class="product-desc">${product.description}</p>
        <div class="product-actions">
          <button class="btn-primary btn-lg" onclick="addToCart(event, '${product.id}', 'product_detail')"
            ${product.stock === 0 ? "disabled" : ""}>
            ${product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
          <button class="btn-wishlist ${isWishlisted ? "active" : ""}"
            onclick="toggleWishlist(event, '${product.id}')">
            ${isWishlisted ? "♥ Saved" : "♡ Wishlist"}
          </button>
        </div>
        <div class="product-specs" id="product-specs">
          <button class="specs-toggle" onclick="toggleSpecs()">
            Specifications <span id="specs-arrow">▼</span>
          </button>
          <div class="specs-body" id="specs-body" style="display:none">
            ${Object.entries(product.specs || {}).map(([k, v]) => `
              <div class="spec-row"><span>${k}</span><span>${v}</span></div>
            `).join("")}
          </div>
        </div>
        <div class="trust-row">
          <span>🚚 Free delivery over ₹999</span>
          <span>↩ 30-day returns</span>
          <span>✓ Genuine product</span>
        </div>
      </div>
    </div>
    ${relatedProducts.length > 0 ? `
      <section class="section">
        <h3 class="section-title">You may also like</h3>
        <div class="products-grid">${relatedProducts.map(p => renderProductCard(p, "related")).join("")}</div>
      </section>
    ` : ""}
  `;
}

function switchProductImage(src, thumb) {
  document.getElementById("main-product-img").src = src;
  document.querySelectorAll(".product-thumbnails img").forEach(i => i.classList.remove("active"));
  thumb.classList.add("active");
  if (AppState.currentProduct) SegmentTracker.trackProductEngagement(AppState.currentProduct, "image_browsed");
}

function toggleSpecs() {
  const body  = document.getElementById("specs-body");
  const arrow = document.getElementById("specs-arrow");
  const open  = body.style.display === "none";
  body.style.display = open ? "grid" : "none";
  arrow.textContent  = open ? "▲" : "▼";
  if (open && AppState.currentProduct) SegmentTracker.trackProductEngagement(AppState.currentProduct, "specs_expanded");
}

/* -------------------------------------------------------------------
   SHOP PAGE
   ------------------------------------------------------------------- */
function renderShop() {
  populateFilters();
  applySortAndFilter();
}

function populateFilters() {
  // Categories
  document.getElementById("filter-categories").innerHTML = CATEGORIES.map(cat => `
    <label class="filter-check">
      <input type="checkbox" value="${cat.id}"
        ${AppState.filters.categories.includes(cat.id) ? "checked" : ""}
        onchange="toggleCategoryFilter('${cat.id}', this.checked)" />
      ${cat.emoji} ${cat.label}
      <span class="filter-count">${PRODUCTS.filter(p => p.category === cat.id).length}</span>
    </label>
  `).join("");

  // Brands
  const brands = [...new Set(PRODUCTS.map(p => p.brand))].sort();
  document.getElementById("filter-brands").innerHTML = brands.map(brand => `
    <label class="filter-check">
      <input type="checkbox" value="${brand}"
        ${AppState.filters.brands.includes(brand) ? "checked" : ""}
        onchange="toggleBrandFilter('${brand}', this.checked)" />
      ${brand}
    </label>
  `).join("");

  // Ratings
  document.getElementById("filter-ratings").innerHTML = [4, 3, 2].map(r => `
    <label class="filter-check">
      <input type="radio" name="rating-filter" value="${r}"
        ${AppState.filters.rating === r ? "checked" : ""}
        onchange="setRatingFilter(${r})" />
      ${renderStars(r)} & above
    </label>
  `).join("");
}

function toggleCategoryFilter(catId, checked) {
  if (checked && !AppState.filters.categories.includes(catId)) AppState.filters.categories.push(catId);
  else AppState.filters.categories = AppState.filters.categories.filter(c => c !== catId);
  applySortAndFilter();
  SegmentTracker.trackFilterApplied("category", catId, getFilteredProducts().length);
}

function toggleBrandFilter(brand, checked) {
  if (checked && !AppState.filters.brands.includes(brand)) AppState.filters.brands.push(brand);
  else AppState.filters.brands = AppState.filters.brands.filter(b => b !== brand);
  applySortAndFilter();
  SegmentTracker.trackFilterApplied("brand", brand, getFilteredProducts().length);
}

function setRatingFilter(rating) {
  AppState.filters.rating = rating;
  applySortAndFilter();
  SegmentTracker.trackFilterApplied("rating", rating, getFilteredProducts().length);
}

function updatePriceFilter() {
  const min = parseInt(document.getElementById("price-min").value);
  const max = parseInt(document.getElementById("price-max").value);
  AppState.filters.priceMin = Math.min(min, max);
  AppState.filters.priceMax = Math.max(min, max);
  document.getElementById("price-min-label").textContent = formatCurrency(AppState.filters.priceMin);
  document.getElementById("price-max-label").textContent = formatCurrency(AppState.filters.priceMax);
  applySortAndFilter();
}

function clearFilters() {
  AppState.filters = { categories: [], priceMin: 0, priceMax: 50000, rating: null, brands: [] };
  populateFilters();
  applySortAndFilter();
}

function getFilteredProducts() {
  return PRODUCTS.filter(p => {
    if (AppState.filters.categories.length > 0 && !AppState.filters.categories.includes(p.category)) return false;
    if (p.price < AppState.filters.priceMin || p.price > AppState.filters.priceMax) return false;
    if (AppState.filters.rating && p.rating < AppState.filters.rating) return false;
    if (AppState.filters.brands.length > 0 && !AppState.filters.brands.includes(p.brand)) return false;
    return true;
  });
}

function applySortAndFilter() {
  let products = getFilteredProducts();
  const sort   = document.getElementById("sort-select")?.value || "default";

  switch (sort) {
    case "price_asc":  products.sort((a, b) => a.price - b.price); break;
    case "price_desc": products.sort((a, b) => b.price - a.price); break;
    case "rating":     products.sort((a, b) => b.rating - a.rating); break;
    case "newest":     products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
  }

  if (sort !== "default") SegmentTracker.trackSortApplied(sort, products.length);

  const pageSlice = products.slice(0, AppState.itemsPerPage * AppState.shopPage);
  document.getElementById("shop-products").innerHTML = pageSlice.map(p => renderProductCard(p, "shop")).join("");
  document.getElementById("shop-results-count").textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;
  document.getElementById("load-more-wrap").style.display = pageSlice.length < products.length ? "flex" : "none";

  renderActiveFilters();
  SegmentTracker.trackProductListViewed(pageSlice, "Shop Listing", "shop");
}

function renderActiveFilters() {
  const chips = [];
  AppState.filters.categories.forEach(c => {
    const cat = CATEGORIES.find(x => x.id === c);
    if (cat) chips.push(`<span class="active-filter">${cat.emoji} ${cat.label} <button onclick="toggleCategoryFilter('${c}', false); updateCheckbox('${c}')">✕</button></span>`);
  });
  AppState.filters.brands.forEach(b => {
    chips.push(`<span class="active-filter">${b} <button onclick="toggleBrandFilter('${b}', false)">✕</button></span>`);
  });
  document.getElementById("active-filters").innerHTML = chips.join("");
}

function updateCheckbox(catId) {
  const cb = document.querySelector(`#filter-categories input[value="${catId}"]`);
  if (cb) cb.checked = false;
}

function loadMoreProducts() {
  AppState.shopPage++;
  applySortAndFilter();
}

/* -------------------------------------------------------------------
   CART
   ------------------------------------------------------------------- */
function addToCart(event, productId, source = "unknown") {
  event.stopPropagation();
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const existingItem = AppState.cart.find(i => i.product.id === productId);
  if (existingItem) {
    existingItem.quantity++;
    SegmentTracker.IntentScorer.addSignal("cart_quantity_increased");
  } else {
    AppState.cart.push({ product, quantity: 1 });
  }

  persistState();
  updateBadges();
  SegmentTracker.trackProductAddedToCart(product, existingItem?.quantity || 1, AppState.cart, source);
  showToast(`${product.name} added to cart 🛒`, "success");
}

function removeFromCart(productId) {
  const item = AppState.cart.find(i => i.product.id === productId);
  if (!item) return;
  AppState.cart = AppState.cart.filter(i => i.product.id !== productId);
  persistState();
  updateBadges();
  SegmentTracker.trackProductRemovedFromCart(item.product, item.quantity, AppState.cart);
  renderCart();
}

function updateCartQuantity(productId, delta) {
  const item = AppState.cart.find(i => i.product.id === productId);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  if (delta > 0) SegmentTracker.IntentScorer.addSignal("cart_quantity_increased");
  persistState();
  updateBadges();
  renderCart();
}

function renderCart() {
  const { cart } = AppState;
  const isEmpty  = cart.length === 0;

  document.getElementById("cart-items-container").style.display = isEmpty ? "none" : "block";
  document.getElementById("cart-empty").style.display            = isEmpty ? "flex" : "none";
  document.getElementById("cart-item-count").textContent         = isEmpty ? "" : `${cart.reduce((s, i) => s + i.quantity, 0)} item(s)`;

  if (!isEmpty) {
    SegmentTracker.trackCartViewed(cart);
    document.getElementById("cart-items-container").innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.product.image}" alt="${item.product.name}" onclick="viewProduct('${item.product.id}', 'cart')" />
        <div class="cart-item-info">
          <span class="cart-item-brand">${item.product.brand}</span>
          <h4 onclick="viewProduct('${item.product.id}', 'cart')">${item.product.name}</h4>
          <div class="cart-item-price">${formatCurrency(item.product.price)}</div>
        </div>
        <div class="cart-item-controls">
          <button onclick="updateCartQuantity('${item.product.id}', -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="updateCartQuantity('${item.product.id}', 1)">+</button>
        </div>
        <div class="cart-item-total">${formatCurrency(item.product.price * item.quantity)}</div>
        <button class="cart-remove-btn" onclick="removeFromCart('${item.product.id}')">✕</button>
      </div>
    `).join("");
  }

  updateCartSummary();
}

function updateCartSummary() {
  const { cart, appliedCoupon } = AppState;
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  let discount   = 0;

  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") discount = Math.round(subtotal * appliedCoupon.value / 100);
    else if (appliedCoupon.type === "flat")   discount = appliedCoupon.value;
  }

  const shipping = subtotal > LUXEMART_CONFIG.freeShippingThreshold ? 0 : LUXEMART_CONFIG.defaultShippingCost;
  const total    = subtotal - discount + shipping;

  document.getElementById("summary-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("summary-total").textContent    = formatCurrency(total);
  document.getElementById("summary-shipping").textContent = shipping === 0 ? "Free" : formatCurrency(shipping);

  const discRow = document.getElementById("summary-discount-row");
  if (discount > 0) {
    discRow.style.display = "flex";
    document.getElementById("summary-discount").textContent = `-${formatCurrency(discount)}`;
  } else {
    discRow.style.display = "none";
  }
}

function applyCoupon() {
  const code    = document.getElementById("coupon-input").value.trim().toUpperCase();
  const subtotal = AppState.cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const coupon  = COUPON_CODES[code];

  if (!coupon) {
    SegmentTracker.trackCouponAction(code, "denied", subtotal, 0);
    showToast("Invalid coupon code", "error");
    return;
  }
  if (subtotal < coupon.minOrder) {
    showToast(`Minimum order ₹${coupon.minOrder} required`, "error");
    return;
  }

  const discount = coupon.type === "percent" ? Math.round(subtotal * coupon.value / 100) : coupon.value;
  AppState.appliedCoupon = { ...coupon, code };
  SegmentTracker.trackCouponAction(code, "applied", subtotal, discount);
  updateCartSummary();
  showToast(`Coupon applied! ${coupon.label} 🎉`, "success");
}

/* -------------------------------------------------------------------
   CHECKOUT
   ------------------------------------------------------------------- */
function initiateCheckout() {
  if (AppState.cart.length === 0) { showToast("Your cart is empty", "error"); return; }
  SegmentTracker.trackCheckoutInitiated(AppState.cart, AppState.appliedCoupon);
  AppState.checkoutStep = 1;
  navigateTo("checkout");
}

function renderCheckout() {
  renderCheckoutSummary();
  renderDeliveryOptions();
  renderPaymentOptions();
  prefillAddress();
  showCheckoutStep(AppState.checkoutStep);
}

function prefillAddress() {
  const user = AppState.currentUser;
  document.getElementById("co-fname").value = user.firstName || "";
  document.getElementById("co-lname").value = user.lastName || "";
  document.getElementById("co-phone").value = user.phone || "";
}

function renderDeliveryOptions() {
  document.getElementById("delivery-options").innerHTML = DELIVERY_OPTIONS.map((opt, i) => `
    <label class="option-card">
      <input type="radio" name="delivery" value="${opt.id}" ${i === 0 ? "checked" : ""}
        onchange="handleDeliverySelect('${opt.id}')" />
      <div class="option-info">
        <span class="option-icon">${opt.icon}</span>
        <div>
          <strong>${opt.label}</strong>
          <span>${opt.desc}</span>
        </div>
        <span class="option-price">${opt.price === 0 ? "Free" : formatCurrency(opt.price)}</span>
      </div>
    </label>
  `).join("");
  // Default select first
  AppState.checkoutData.delivery = DELIVERY_OPTIONS[0];
}

function handleDeliverySelect(optionId) {
  const method = DELIVERY_OPTIONS.find(o => o.id === optionId);
  AppState.checkoutData.delivery = method;
  SegmentTracker.trackDeliveryMethodSelected(method, method.price);
}

function renderPaymentOptions() {
  document.getElementById("payment-options").innerHTML = PAYMENT_METHODS.map((method, i) => `
    <label class="option-card">
      <input type="radio" name="payment" value="${method.id}" ${i === 0 ? "checked" : ""}
        onchange="handlePaymentSelect('${method.id}', ${method.hasForm})" />
      <div class="option-info">
        <span class="option-icon">${method.icon}</span>
        <strong>${method.label}</strong>
      </div>
    </label>
  `).join("");
  AppState.checkoutData.payment = PAYMENT_METHODS[0].id;
  document.getElementById("card-form").style.display = PAYMENT_METHODS[0].hasForm ? "block" : "none";
}

function handlePaymentSelect(methodId, hasForm) {
  AppState.checkoutData.payment = methodId;
  document.getElementById("card-form").style.display = hasForm ? "block" : "none";
  SegmentTracker.trackPaymentMethodSelected(methodId,
    AppState.cart.reduce((s, i) => s + i.product.price * i.quantity, 0));
}

function renderCheckoutSummary() {
  const { cart, appliedCoupon } = AppState;
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount = appliedCoupon
    ? (appliedCoupon.type === "percent" ? Math.round(subtotal * appliedCoupon.value / 100) : appliedCoupon.value)
    : 0;
  const shipping  = AppState.checkoutData.delivery?.price || 0;
  const total     = subtotal - discount + shipping;

  document.getElementById("checkout-cart-items").innerHTML = cart.map(i => `
    <div class="co-item">
      <img src="${i.product.image}" alt="${i.product.name}" />
      <div>
        <p>${i.product.name}</p>
        <small>Qty: ${i.quantity}</small>
      </div>
      <span>${formatCurrency(i.product.price * i.quantity)}</span>
    </div>
  `).join("");

  document.getElementById("co-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("co-shipping").textContent = shipping === 0 ? "Free" : formatCurrency(shipping);
  document.getElementById("co-total").textContent    = formatCurrency(total);
}

function proceedCheckout(toStep) {
  const currentStep = AppState.checkoutStep;

  const stepNames = { 1: "address", 2: "delivery", 3: "payment", 4: "review" };
  SegmentTracker.trackCheckoutStepCompleted(currentStep, stepNames[currentStep] || "unknown", {
    delivery_method: AppState.checkoutData.delivery?.id,
    payment_method:  AppState.checkoutData.payment,
  });

  AppState.checkoutStep = toStep;
  showCheckoutStep(toStep);

  if (toStep === 4) renderOrderReview();
  renderCheckoutSummary();
}

function showCheckoutStep(step) {
  document.querySelectorAll(".checkout-step-content").forEach((el, i) => {
    el.classList.toggle("active", i + 1 === step);
  });
  document.querySelectorAll(".checkout-steps .checkout-step").forEach((el, i) => {
    el.classList.toggle("active", i + 1 === step);
    el.classList.toggle("completed", i + 1 < step);
  });
}

function renderOrderReview() {
  const { cart, checkoutData, appliedCoupon } = AppState;
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount = appliedCoupon
    ? (appliedCoupon.type === "percent" ? Math.round(subtotal * appliedCoupon.value / 100) : appliedCoupon.value)
    : 0;
  const shipping = checkoutData.delivery?.price || 0;
  const total    = subtotal - discount + shipping;

  document.getElementById("order-review-content").innerHTML = `
    <div class="review-section">
      <h4>Items (${cart.length})</h4>
      ${cart.map(i => `
        <div class="review-item">
          <span>${i.product.name} × ${i.quantity}</span>
          <span>${formatCurrency(i.product.price * i.quantity)}</span>
        </div>`).join("")}
    </div>
    <div class="review-section">
      <div class="review-item"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      ${discount > 0 ? `<div class="review-item discount-row"><span>Discount</span><span>-${formatCurrency(discount)}</span></div>` : ""}
      <div class="review-item"><span>Delivery (${checkoutData.delivery?.label || "Standard"})</span><span>${shipping === 0 ? "Free" : formatCurrency(shipping)}</span></div>
      <div class="review-item total-row"><strong>Total</strong><strong>${formatCurrency(total)}</strong></div>
    </div>
    <div class="review-section">
      <div class="review-item"><span>Payment</span><span>${PAYMENT_METHODS.find(m => m.id === checkoutData.payment)?.label || checkoutData.payment}</span></div>
    </div>
  `;
}

function placeOrder() {
  const { cart, checkoutData, appliedCoupon, currentUser } = AppState;
  const subtotal  = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount  = appliedCoupon
    ? (appliedCoupon.type === "percent" ? Math.round(subtotal * appliedCoupon.value / 100) : appliedCoupon.value)
    : 0;
  const shipping  = checkoutData.delivery?.price || 0;
  const total     = subtotal - discount + shipping;
  const orderId   = "LM" + Date.now().toString().slice(-8);

  const order = {
    id:         orderId,
    items:      [...cart],
    subtotal,
    discount,
    shipping,
    total,
    payment:    checkoutData.payment,
    delivery:   checkoutData.delivery,
    placedAt:   new Date().toISOString(),
    status:     "confirmed",
  };

  // Track
  SegmentTracker.trackOrderPlaced(
    order, cart, appliedCoupon ? { ...appliedCoupon } : null,
    checkoutData.payment, checkoutData.delivery?.id, currentUser
  );

  // Update local state
  AppState.orders.unshift(order);
  currentUser.totalOrders = (currentUser.totalOrders || 0) + 1;
  currentUser.totalSpent  = (currentUser.totalSpent  || 0) + total;
  AppState.cart           = [];
  AppState.appliedCoupon  = null;
  persistState();
  updateBadges();

  // Show confirmation
  renderConfirmation(order);
  navigateTo("confirmation");
}

function renderConfirmation(order) {
  document.getElementById("confirmation-order-id").textContent = `Order ID: ${order.id}`;
  document.getElementById("confirmation-items").innerHTML = `
    <div class="confirmation-items-list">
      ${order.items.map(i => `
        <div class="confirmation-item">
          <img src="${i.product.image}" alt="${i.product.name}" />
          <span>${i.product.name} × ${i.quantity}</span>
          <span>${formatCurrency(i.product.price * i.quantity)}</span>
        </div>
      `).join("")}
      <div class="confirmation-total">Total paid: ${formatCurrency(order.total)}</div>
    </div>
  `;
}

/* -------------------------------------------------------------------
   WISHLIST
   ------------------------------------------------------------------- */
function toggleWishlist(event, productId) {
  event.stopPropagation();
  const product  = PRODUCTS.find(p => p.id === productId);
  const isInList = AppState.wishlist.includes(productId);

  if (isInList) {
    AppState.wishlist = AppState.wishlist.filter(id => id !== productId);
    SegmentTracker.trackWishlistAction(product, "removed", AppState.wishlist.length);
    showToast("Removed from wishlist", "info");
  } else {
    AppState.wishlist.push(productId);
    SegmentTracker.trackWishlistAction(product, "added", AppState.wishlist.length);
    showToast(`${product.name} saved to wishlist ♥`, "success");
  }

  persistState();
  updateBadges();

  // Refresh toggle UI on all cards
  document.querySelectorAll(`[data-product-id="${productId}"] .wishlist-toggle`).forEach(btn => {
    btn.classList.toggle("active", !isInList);
    btn.textContent = !isInList ? "♥" : "♡";
  });
}

function renderWishlist() {
  const products = AppState.wishlist.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  document.getElementById("wishlist-products").innerHTML = products.map(p => renderProductCard(p, "wishlist")).join("");
  document.getElementById("wishlist-empty").style.display = products.length === 0 ? "flex" : "none";
  document.getElementById("wishlist-count-label").textContent = products.length > 0 ? `${products.length} item(s)` : "";
  if (products.length > 0) SegmentTracker.trackPageViewed("wishlist", { wishlist_item_count: products.length });
}

/* -------------------------------------------------------------------
   ORDERS
   ------------------------------------------------------------------- */
function renderOrders() {
  const orders  = AppState.orders;
  const isEmpty = orders.length === 0;
  SegmentTracker.trackPageViewed("orders", { order_count: orders.length });

  document.getElementById("orders-list").style.display = isEmpty ? "none" : "block";
  document.getElementById("orders-empty").style.display = isEmpty ? "flex" : "none";

  document.getElementById("orders-list").innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <span class="order-id">Order #${order.id}</span>
          <span class="order-date">${new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
        <span class="order-status order-status-${order.status}">${capitalise(order.status)}</span>
      </div>
      <div class="order-items-preview">
        ${order.items.slice(0, 3).map(i => `<img src="${i.product.image}" alt="${i.product.name}" title="${i.product.name}" />`).join("")}
        ${order.items.length > 3 ? `<span class="more-items">+${order.items.length - 3} more</span>` : ""}
      </div>
      <div class="order-card-footer">
        <span class="order-total">${formatCurrency(order.total)}</span>
        <span>${order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
      </div>
    </div>
  `).join("");
}

/* -------------------------------------------------------------------
   DEALS PAGE
   ------------------------------------------------------------------- */
function renderDeals() {
  SegmentTracker.PricingSensitivityClassifier.recordSignal("discount_pages_visited");
  const discounted = PRODUCTS.filter(p => p.discount > 0).sort((a, b) => b.discount - a.discount);
  document.getElementById("deals-products").innerHTML = discounted.map(p => renderProductCard(p, "deals")).join("");
  SegmentTracker.trackProductListViewed(discounted, "Deals & Offers", "deals");

  // Countdown to midnight
  const updateCountdown = () => {
    const now       = new Date();
    const midnight  = new Date(now); midnight.setHours(24, 0, 0, 0);
    const diff      = midnight - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const el = document.getElementById("deals-countdown");
    if (el) el.innerHTML = `⏱ Deals reset in <strong>${pad(h)}:${pad(m)}:${pad(s)}</strong>`;
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

/* -------------------------------------------------------------------
   PROFILE PAGE
   ------------------------------------------------------------------- */
function renderProfile() {
  const user = AppState.currentUser;
  const initials = (user.firstName[0] + (user.lastName?.[0] || "")).toUpperCase();

  document.getElementById("profile-avatar-large").textContent = initials;
  document.getElementById("profile-name").textContent         = `${user.firstName} ${user.lastName}`;
  document.getElementById("profile-email-display").textContent = user.email;
  document.getElementById("profile-member-since").textContent  = `Member since ${new Date(user.memberSince).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;

  document.getElementById("stat-orders").textContent  = user.totalOrders || 0;
  document.getElementById("stat-wishlist").textContent = AppState.wishlist.length;
  document.getElementById("stat-spent").textContent   = formatCurrency(user.totalSpent || 0);

  document.getElementById("profile-fname").value        = user.firstName || "";
  document.getElementById("profile-lname").value        = user.lastName || "";
  document.getElementById("profile-email-field").value  = user.email || "";
  document.getElementById("profile-phone").value        = user.phone || "";

  // Preferences
  document.getElementById("profile-prefs").innerHTML = CATEGORIES.map(cat => `
    <button class="chip ${(user.preferences || []).includes(cat.id) ? "active" : ""}"
      data-pref="${cat.id}" onclick="togglePref(this)">${cat.emoji} ${cat.label}</button>
  `).join("");
}

function saveProfile() {
  const user = AppState.currentUser;
  const prev = { ...user };

  user.firstName   = document.getElementById("profile-fname").value.trim();
  user.lastName    = document.getElementById("profile-lname").value.trim();
  user.email       = document.getElementById("profile-email-field").value.trim();
  user.phone       = document.getElementById("profile-phone").value.trim();
  user.preferences = [...document.querySelectorAll("#profile-prefs .chip.active")].map(c => c.dataset.pref);

  const changedFields = Object.keys(user).filter(k => user[k] !== prev[k]);
  SegmentTracker.trackProfileUpdated(user.id, changedFields);
  SegmentTracker.UserProfileUnifier.updateIdentifiedTraits({
    first_name: user.firstName,
    last_name:  user.lastName,
    phone:      user.phone,
    shopping_preferences: user.preferences,
  });

  updateNavUser(user);
  showToast("Profile updated ✓", "success");
}

/* -------------------------------------------------------------------
   SEARCH
   ------------------------------------------------------------------- */
let _searchTimer = null;

function handleSearchInput(query) {
  clearTimeout(_searchTimer);
  if (query.length < 2) { document.getElementById("search-suggestions").innerHTML = ""; return; }

  _searchTimer = setTimeout(() => {
    const results = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase()) ||
      p.category.includes(query.toLowerCase())
    ).slice(0, 6);

    SegmentTracker.trackSearchPerformed(query, results.length);

    document.getElementById("search-suggestions").innerHTML = results.length > 0
      ? results.map(p => `
          <div class="suggestion-item" onclick="selectSearchResult('${p.id}', '${query}')">
            <img src="${p.image}" alt="${p.name}" />
            <div>
              <strong>${p.name}</strong>
              <span>${p.brand} · ${formatCurrency(p.price)}</span>
            </div>
          </div>
        `).join("")
      : `<div class="suggestion-empty">No results for "${query}"</div>`;
  }, 300);
}

function selectSearchResult(productId, query) {
  toggleSearch();
  viewProduct(productId, "search");
}

function handleSearchKey(event) {
  if (event.key === "Escape") toggleSearch();
}

/* -------------------------------------------------------------------
   FORMAT / UTILITY HELPERS
   ------------------------------------------------------------------- */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pad(n) { return n.toString().padStart(2, "0"); }

function formatCardNum(input) {
  input.value = input.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/* -------------------------------------------------------------------
   TOAST NOTIFICATIONS
   ------------------------------------------------------------------- */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast     = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* -------------------------------------------------------------------
   SESSION TIME TRACKING
   ------------------------------------------------------------------- */
function initTimeTracking() {
  let _lastTick = Date.now();
  setInterval(() => {
    const now   = Date.now();
    const delta = Math.round((now - _lastTick) / 1000);
    _lastTick   = now;
    if (delta <= 30) {  // ignore tab-switch gaps
      UserProfileUnifier.recordAnonymousActivity("time_update", { seconds: delta });
    }
  }, 10000);
}

function initScrollTracking() {
  let _scrollFired = {};
  window.addEventListener("scroll", () => {
    const pct  = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    [25, 50, 75, 90].forEach(milestone => {
      const key = `${AppState.currentPage}_${milestone}`;
      if (pct >= milestone && !_scrollFired[key]) {
        _scrollFired[key] = true;
        if (AppState.currentProduct && milestone >= 75) {
          SegmentTracker.trackProductEngagement(AppState.currentProduct, "reviews_scrolled");
        }
      }
    });
  }, { passive: true });
}

// Close dropdowns on outside click
document.addEventListener("click", (e) => {
  if (AppState.userMenuOpen && !e.target.closest("#user-avatar-btn") && !e.target.closest("#user-dropdown")) {
    AppState.userMenuOpen = false;
    document.getElementById("user-dropdown").classList.remove("active");
  }
});
