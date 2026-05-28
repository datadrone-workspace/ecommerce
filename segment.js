/* =====================================================================
   LuxeMart — Segment Analytics Layer  (segment.js)
   =====================================================================
   Architecture:
   • SegmentTracker  — wraps analytics.js with rich trait + context injection
   • UserProfileUnifier — merges anonymous + authenticated identity
   • IntentScorer — computes real-time purchase intent signals
   • PricingSensitivityClassifier — classifies buyer archetype live
   • FunnelStateManager — tracks funnel position & drop-off signals
   ===================================================================== */

"use strict";

/* -------------------------------------------------------------------
   1.  CONSTANTS & ENUMS
   ------------------------------------------------------------------- */

const SEGMENT_EVENTS = {
  // Identity
  USER_SIGNED_UP:             "User Signed Up",
  USER_LOGGED_IN:             "User Logged In",
  USER_LOGGED_OUT:            "User Logged Out",
  USER_PROFILE_UPDATED:       "User Profile Updated",
  SOCIAL_AUTH_INITIATED:      "Social Auth Initiated",
  PASSWORD_RESET_REQUESTED:   "Password Reset Requested",

  // Discovery & Navigation
  HOME_PAGE_VIEWED:           "Home Page Viewed",
  SHOP_PAGE_VIEWED:           "Shop Page Viewed",
  DEALS_PAGE_VIEWED:          "Deals Page Viewed",
  CATEGORY_SELECTED:          "Category Selected",
  PRODUCT_SEARCH_PERFORMED:   "Product Search Performed",
  SEARCH_RESULT_CLICKED:      "Search Result Clicked",
  PRODUCT_FILTER_APPLIED:     "Product Filter Applied",
  PRODUCT_SORT_APPLIED:       "Product Sort Applied",

  // Product Engagement (Revenue Funnel Step 1)
  PRODUCT_LIST_VIEWED:        "Product List Viewed",
  PRODUCT_VIEWED:             "Product Viewed",               // ← Funnel Step 1
  PRODUCT_REVISITED:          "Product Revisited",            // High-intent signal
  PRODUCT_IMAGE_BROWSED:      "Product Image Browsed",
  PRODUCT_SPECS_EXPANDED:     "Product Specs Expanded",
  PRODUCT_REVIEW_SCROLLED:    "Product Review Scrolled",
  PRODUCT_SHARE_CLICKED:      "Product Share Clicked",
  PRODUCT_ADDED_TO_WISHLIST:  "Product Added to Wishlist",
  PRODUCT_REMOVED_FROM_WISHLIST: "Product Removed from Wishlist",
  WISHLIST_PAGE_VIEWED:       "Wishlist Page Viewed",

  // Cart (Revenue Funnel Step 2)
  PRODUCT_ADDED_TO_CART:      "Product Added to Cart",        // ← Funnel Step 2
  PRODUCT_REMOVED_FROM_CART:  "Product Removed from Cart",
  CART_QUANTITY_UPDATED:      "Cart Quantity Updated",
  CART_PAGE_VIEWED:           "Cart Page Viewed",
  COUPON_ENTERED:             "Coupon Entered",
  COUPON_APPLIED:             "Coupon Applied",
  COUPON_DENIED:              "Coupon Denied",

  // Checkout (Revenue Funnel Step 3)
  CHECKOUT_INITIATED:         "Checkout Initiated",           // ← Funnel Step 3
  CHECKOUT_STEP_COMPLETED:    "Checkout Step Completed",
  CHECKOUT_STEP_ABANDONED:    "Checkout Step Abandoned",
  PAYMENT_METHOD_SELECTED:    "Payment Method Selected",
  DELIVERY_METHOD_SELECTED:   "Delivery Method Selected",
  ADDRESS_SAVED:              "Address Saved",

  // Purchase (Revenue Funnel Step 4)
  ORDER_PLACED:               "Order Placed",                 // ← Funnel Step 4
  ORDER_VIEWED:               "Order Viewed",
  ORDER_HISTORY_VIEWED:       "Order History Viewed",

  // Engagement & Intent Signals
  PAGE_SCROLLED_DEEP:         "Page Scrolled Deep",
  TIME_ON_PRODUCT_MILESTONE:  "Time on Product Page Milestone",
  URGENCY_NUDGE_SHOWN:        "Urgency Nudge Shown",
  URGENCY_NUDGE_CLICKED:      "Urgency Nudge Clicked",
  PROMO_BANNER_CLICKED:       "Promo Banner Clicked",
  TOAST_NOTIFICATION_SHOWN:   "Toast Notification Shown",
};

const INTENT_WEIGHTS = {
  product_viewed:              5,
  product_revisited:           15,   // same product viewed again = strong signal
  product_added_to_wishlist:   10,
  product_added_to_cart:       25,
  checkout_initiated:          40,
  time_on_product_60s:         8,
  time_on_product_120s:        12,
  image_browsed:               3,
  specs_expanded:              5,
  reviews_scrolled:            6,
  search_performed:            4,
  cart_quantity_increased:     15,
  coupon_entered:              20,   // strong discount-seeking signal
};

const BUYER_ARCHETYPE = {
  PREMIUM_BUYER:    "premium_buyer",     // buys without discounts, high AOV
  NORMAL_BUYER:     "normal_buyer",      // mixed signals
  DISCOUNT_SEEKER:  "discount_seeker",   // heavily coupon-driven
};


/* -------------------------------------------------------------------
   2.  USER PROFILE UNIFIER
   Handles anonymous-to-identified merging and trait enrichment.
   ------------------------------------------------------------------- */

const UserProfileUnifier = (() => {
  const _storageKey = "luxemart_anon_profile";

  // All traits we accumulate before a user identifies themselves
  let _anonTraits = _loadAnonTraits();
  let _identifiedUserId = null;

  function _loadAnonTraits() {
    try {
      const raw = localStorage.getItem(_storageKey);
      return raw ? JSON.parse(raw) : _defaultAnonTraits();
    } catch { return _defaultAnonTraits(); }
  }

  function _defaultAnonTraits() {
    return {
      session_start:          new Date().toISOString(),
      page_views:             0,
      product_views:          0,
      product_view_history:   [],    // [{productId, viewedAt, durationMs}]
      categories_browsed:     [],
      searches_performed:     [],
      cart_additions:         0,
      wishlist_additions:     0,
      coupon_attempts:        0,
      total_time_on_site_s:   0,
      first_touch_utm:        _parseUtm(),
      device_type:            _detectDevice(),
      browser:                _detectBrowser(),
      viewport_width:         window.innerWidth,
      locale:                 navigator.language || "en-IN",
      timezone:               Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    };
  }

  function _persist() {
    try { localStorage.setItem(_storageKey, JSON.stringify(_anonTraits)); } catch {}
  }

  function _parseUtm() {
    const p = new URLSearchParams(window.location.search);
    return {
      source:   p.get("utm_source") || null,
      medium:   p.get("utm_medium") || null,
      campaign: p.get("utm_campaign") || null,
      content:  p.get("utm_content") || null,
    };
  }

  function _detectDevice() {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/mobile|iphone|android/i.test(ua)) return "mobile";
    return "desktop";
  }

  function _detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg"))  return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg"))     return "Edge";
    return "Unknown";
  }

  // ---- Public API ----

  function recordAnonymousActivity(activityType, payload = {}) {
    switch (activityType) {
      case "page_view":       _anonTraits.page_views++; break;
      case "product_view":
        _anonTraits.product_views++;
        const pv = { productId: payload.productId, viewedAt: new Date().toISOString(), category: payload.category };
        _anonTraits.product_view_history.push(pv);
        if (!_anonTraits.categories_browsed.includes(payload.category)) {
          _anonTraits.categories_browsed.push(payload.category);
        }
        break;
      case "search":          _anonTraits.searches_performed.push(payload.query); break;
      case "cart_add":        _anonTraits.cart_additions++; break;
      case "wishlist_add":    _anonTraits.wishlist_additions++; break;
      case "coupon_attempt":  _anonTraits.coupon_attempts++; break;
      case "time_update":     _anonTraits.total_time_on_site_s += payload.seconds || 0; break;
    }
    _persist();
  }

  function identifyUser(userId, userTraits) {
    _identifiedUserId = userId;

    // Merge anon traits into identify call (Profile Unification)
    const mergedTraits = {
      ...userTraits,
      // Computed traits
      intent_score:              IntentScorer.getScore(),
      buyer_archetype:           PricingSensitivityClassifier.getArchetype(),
      // Pre-auth behavioral traits
      pre_auth_product_views:    _anonTraits.product_views,
      pre_auth_categories_browsed: _anonTraits.categories_browsed,
      pre_auth_searches_performed: _anonTraits.searches_performed.length,
      pre_auth_cart_additions:   _anonTraits.cart_additions,
      pre_auth_session_duration_s: _anonTraits.total_time_on_site_s,
      // Device & acquisition
      acquisition_channel:       _anonTraits.first_touch_utm,
      device_type:               _anonTraits.device_type,
      browser:                   _anonTraits.browser,
      viewport_width:            _anonTraits.viewport_width,
      locale:                    _anonTraits.locale,
      timezone:                  _anonTraits.timezone,
    };

    if (window.analytics) {
      // Alias: link anonymous ID to identified user
      analytics.alias(userId);
      // Full identify with all merged traits
      analytics.identify(userId, mergedTraits);
    }

    return mergedTraits;
  }

  function updateIdentifiedTraits(partialTraits) {
    if (!_identifiedUserId) return;
    if (window.analytics) {
      analytics.identify(_identifiedUserId, {
        ...partialTraits,
        intent_score:    IntentScorer.getScore(),
        buyer_archetype: PricingSensitivityClassifier.getArchetype(),
        last_active_at:  new Date().toISOString(),
      });
    }
  }

  function getAnonTraits() { return { ..._anonTraits }; }
  function getIdentifiedUserId() { return _identifiedUserId; }
  function clearAnonymousProfile() {
    _anonTraits = _defaultAnonTraits();
    _persist();
  }

  return {
    recordAnonymousActivity,
    identifyUser,
    updateIdentifiedTraits,
    getAnonTraits,
    getIdentifiedUserId,
    clearAnonymousProfile,
  };
})();


/* -------------------------------------------------------------------
   3.  INTENT SCORER
   Computes a 0–100 real-time purchase intent score.
   ------------------------------------------------------------------- */

const IntentScorer = (() => {
  let _score = 0;
  const _history = []; // {signal, weight, timestamp}
  const MAX_SCORE = 100;

  function addSignal(signalType, multiplier = 1) {
    const weight = (INTENT_WEIGHTS[signalType] || 2) * multiplier;
    _score = Math.min(MAX_SCORE, _score + weight);
    _history.push({ signal: signalType, weight, timestamp: new Date().toISOString() });

    // Push live score update to Segment user traits
    if (UserProfileUnifier.getIdentifiedUserId()) {
      // Debounce: only push on meaningful thresholds
      const thresholds = [20, 40, 60, 80, 100];
      if (thresholds.includes(_score) || _score >= 80) {
        UserProfileUnifier.updateIdentifiedTraits({
          intent_score: _score,
          intent_tier: getIntentTier(),
          intent_signals: _history.slice(-10).map(h => h.signal),
        });
      }
    }

    return _score;
  }

  function getScore() { return _score; }
  function getHistory() { return [..._history]; }

  function getIntentTier() {
    if (_score >= 75) return "very_high";
    if (_score >= 50) return "high";
    if (_score >= 25) return "medium";
    return "low";
  }

  function shouldShowUrgencyNudge() { return _score >= 50; }
  function shouldShowPersonalisedOffer() { return _score >= 75; }

  function reset() { _score = 0; _history.length = 0; }

  return { addSignal, getScore, getHistory, getIntentTier, shouldShowUrgencyNudge, shouldShowPersonalisedOffer, reset };
})();


/* -------------------------------------------------------------------
   4.  PRICING SENSITIVITY CLASSIFIER
   Classifies buyer archetype based on discount-seeking behaviour.
   ------------------------------------------------------------------- */

const PricingSensitivityClassifier = (() => {
  const _signals = {
    discount_pages_visited:    0,
    coupon_attempts:           0,
    products_with_discount_viewed: 0,
    products_without_discount_viewed: 0,
    cart_value_at_coupon_attempt: [],
    purchased_with_discount:   false,
    purchased_without_discount: false,
    aov_history:               [],
  };

  function recordSignal(type, value = 1) {
    if (type in _signals) {
      if (Array.isArray(_signals[type])) { _signals[type].push(value); }
      else { _signals[type] += value; }
    }
  }

  function getArchetype() {
    const { coupon_attempts, products_with_discount_viewed, products_without_discount_viewed } = _signals;
    const totalProductViews = products_with_discount_viewed + products_without_discount_viewed || 1;
    const discountViewRatio = products_with_discount_viewed / totalProductViews;

    if (coupon_attempts >= 2 || discountViewRatio > 0.6) return BUYER_ARCHETYPE.DISCOUNT_SEEKER;
    if (coupon_attempts === 0 && discountViewRatio < 0.3) return BUYER_ARCHETYPE.PREMIUM_BUYER;
    return BUYER_ARCHETYPE.NORMAL_BUYER;
  }

  function getSensitivityScore() {
    // 0 = price insensitive (premium), 100 = very price sensitive (discount seeker)
    let score = 0;
    score += _signals.coupon_attempts * 15;
    const dvr = (_signals.products_with_discount_viewed / ((_signals.products_with_discount_viewed + _signals.products_without_discount_viewed) || 1));
    score += dvr * 40;
    score += _signals.discount_pages_visited * 10;
    return Math.min(100, Math.round(score));
  }

  function shouldOfferDiscount() {
    const archetype = getArchetype();
    return archetype === BUYER_ARCHETYPE.DISCOUNT_SEEKER || getSensitivityScore() > 55;
  }

  function getSignals() { return { ..._signals }; }

  return { recordSignal, getArchetype, getSensitivityScore, shouldOfferDiscount, getSignals };
})();


/* -------------------------------------------------------------------
   5.  FUNNEL STATE MANAGER
   Tracks which funnel step the user is on and flags drop-off.
   ------------------------------------------------------------------- */

const FunnelStateManager = (() => {
  const STEPS = ["product_viewed", "added_to_cart", "checkout_started", "purchase_completed"];
  let _currentStep = null;
  let _funnelSessionId = _generateFunnelId();
  let _stepTimestamps = {};

  function _generateFunnelId() {
    return "funnel_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function advanceTo(step, productContext = {}) {
    const stepIndex = STEPS.indexOf(step);
    if (stepIndex === -1) return;

    const previousStep = _currentStep;
    _currentStep = step;
    _stepTimestamps[step] = new Date().toISOString();

    // Detect if a step was skipped (potential data gap or rage-click)
    const prevIndex = STEPS.indexOf(previousStep);
    const skippedSteps = stepIndex - prevIndex > 1 ? STEPS.slice(prevIndex + 1, stepIndex) : [];

    return {
      funnel_session_id:  _funnelSessionId,
      funnel_step:        step,
      funnel_step_index:  stepIndex + 1,
      funnel_total_steps: STEPS.length,
      previous_step:      previousStep,
      skipped_steps:      skippedSteps,
      time_in_previous_step_ms: previousStep && _stepTimestamps[previousStep]
        ? Date.now() - new Date(_stepTimestamps[previousStep]).getTime()
        : null,
      ...productContext,
    };
  }

  function recordDropOff(atStep, reason = "unknown") {
    return {
      funnel_session_id:  _funnelSessionId,
      dropped_at_step:    atStep,
      drop_reason:        reason,
      intent_score_at_drop: IntentScorer.getScore(),
      buyer_archetype:    PricingSensitivityClassifier.getArchetype(),
    };
  }

  function reset() {
    _currentStep = null;
    _funnelSessionId = _generateFunnelId();
    _stepTimestamps = {};
  }

  function getCurrentStep() { return _currentStep; }
  function getFunnelSessionId() { return _funnelSessionId; }

  return { advanceTo, recordDropOff, getCurrentStep, getFunnelSessionId, reset };
})();


/* -------------------------------------------------------------------
   6.  SEGMENT TRACKER — Main event-firing interface
   ------------------------------------------------------------------- */

const SegmentTracker = (() => {

  // --- Shared context injected into every event ---
  function _buildBaseContext(additionalContext = {}) {
    return {
      app_name:            "LuxeMart",
      app_version:         "2.1.0",
      platform:            "web",
      device_type:         UserProfileUnifier.getAnonTraits().device_type,
      viewport_width:      window.innerWidth,
      viewport_height:     window.innerHeight,
      page_url:            window.location.href,
      page_title:          document.title,
      referrer:            document.referrer || null,
      session_intent_score: IntentScorer.getScore(),
      session_intent_tier:  IntentScorer.getIntentTier(),
      buyer_archetype:      PricingSensitivityClassifier.getArchetype(),
      ...additionalContext,
    };
  }

  // --- Product trait builder (standardised product object) ---
  function _buildProductTraits(product, extras = {}) {
    return {
      product_id:         product.id,
      sku:                product.sku,
      product_name:       product.name,
      brand:              product.brand,
      category:           product.category,
      price:              product.price,
      original_price:     product.originalPrice,
      discount_percentage: product.discount || 0,
      is_discounted:      product.price < product.originalPrice,
      discount_absolute:  product.originalPrice - product.price,
      currency:           "INR",
      rating:             product.rating,
      review_count:       product.reviewCount,
      in_stock:           product.stock > 0,
      stock_level:        product.stock,
      low_stock:          product.stock > 0 && product.stock <= 10,
      is_new:             product.isNew,
      is_trending:        product.isTrending,
      is_featured:        product.isFeatured,
      tags:               product.tags || [],
      ...extras,
    };
  }

  // --- Cart trait builder ---
  function _buildCartTraits(cartItems) {
    const subtotal  = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const total_qty = cartItems.reduce((s, i) => s + i.quantity, 0);
    return {
      cart_id:              AppState?.cartId || "cart_" + Date.now(),
      cart_item_count:      cartItems.length,
      cart_total_quantity:  total_qty,
      cart_subtotal:        subtotal,
      cart_currency:        "INR",
      cart_contains_discounted_items: cartItems.some(i => i.product.discount > 0),
      cart_categories:      [...new Set(cartItems.map(i => i.product.category))],
      cart_brands:          [...new Set(cartItems.map(i => i.product.brand))],
      products:             cartItems.map(i => _buildProductTraits(i.product, { quantity: i.quantity })),
    };
  }


  /* ---- Identity Events ---- */

  function trackUserSignedUp(user, method = "email") {
    UserProfileUnifier.recordAnonymousActivity("page_view");
    const traits = _buildUserTraits(user);
    UserProfileUnifier.identifyUser(user.id, traits);

    _fire(SEGMENT_EVENTS.USER_SIGNED_UP, {
      ..._buildBaseContext(),
      ...traits,
      signup_method: method,
      signup_timestamp: new Date().toISOString(),
    });
  }

  function trackUserLoggedIn(user, method = "email") {
    const traits = _buildUserTraits(user);
    UserProfileUnifier.identifyUser(user.id, traits);

    _fire(SEGMENT_EVENTS.USER_LOGGED_IN, {
      ..._buildBaseContext(),
      user_id:         user.id,
      login_method:    method,
      login_timestamp: new Date().toISOString(),
      account_age_days: _accountAgeDays(user.memberSince),
      total_orders:    user.totalOrders || 0,
      total_spent:     user.totalSpent || 0,
      loyalty_points:  user.loyaltyPoints || 0,
      buyer_segment:   user.segment || "unknown",
    });
  }

  function trackUserLoggedOut(userId) {
    _fire(SEGMENT_EVENTS.USER_LOGGED_OUT, {
      ..._buildBaseContext(),
      user_id:               userId,
      session_duration_s:    UserProfileUnifier.getAnonTraits().total_time_on_site_s,
      products_viewed_this_session: UserProfileUnifier.getAnonTraits().product_views,
      final_intent_score:    IntentScorer.getScore(),
      final_intent_tier:     IntentScorer.getIntentTier(),
      final_buyer_archetype: PricingSensitivityClassifier.getArchetype(),
    });
    if (window.analytics) analytics.reset();
    UserProfileUnifier.clearAnonymousProfile();
    IntentScorer.reset();
    FunnelStateManager.reset();
  }

  function trackSocialAuthInitiated(provider) {
    _fire(SEGMENT_EVENTS.SOCIAL_AUTH_INITIATED, {
      ..._buildBaseContext(),
      oauth_provider:    provider,
      initiated_from:    "login_page",
    });
  }

  function trackProfileUpdated(userId, changedFields) {
    _fire(SEGMENT_EVENTS.USER_PROFILE_UPDATED, {
      ..._buildBaseContext(),
      user_id:        userId,
      changed_fields: changedFields,
      updated_at:     new Date().toISOString(),
    });
    UserProfileUnifier.updateIdentifiedTraits({ profile_last_updated: new Date().toISOString() });
  }

  function trackPasswordResetRequested(email) {
    _fire(SEGMENT_EVENTS.PASSWORD_RESET_REQUESTED, {
      ..._buildBaseContext(),
      email_domain: email.split("@")[1] || "unknown",
    });
  }

  /* ---- Navigation / Discovery Events ---- */

  function trackPageViewed(pageName, extras = {}) {
    UserProfileUnifier.recordAnonymousActivity("page_view");
    IntentScorer.addSignal("search_performed", 0.3);  // browsing = weak signal

    const pageEventMap = {
      home:    SEGMENT_EVENTS.HOME_PAGE_VIEWED,
      shop:    SEGMENT_EVENTS.SHOP_PAGE_VIEWED,
      deals:   SEGMENT_EVENTS.DEALS_PAGE_VIEWED,
    };

    if (pageName === "deals") PricingSensitivityClassifier.recordSignal("discount_pages_visited");

    const eventName = pageEventMap[pageName] || `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page Viewed`;
    _fire(eventName, { ..._buildBaseContext(), page_name: pageName, ...extras });

    if (window.analytics) analytics.page(pageName, { ..._buildBaseContext(), ...extras });
  }

  function trackCategorySelected(category, source = "grid") {
    _fire(SEGMENT_EVENTS.CATEGORY_SELECTED, {
      ..._buildBaseContext(),
      category_id:    category.id,
      category_name:  category.label,
      selection_source: source,   // "grid" | "filter" | "nav"
    });
  }

  function trackSearchPerformed(query, resultCount, filters = {}) {
    UserProfileUnifier.recordAnonymousActivity("search", { query });
    IntentScorer.addSignal("search_performed");

    _fire(SEGMENT_EVENTS.PRODUCT_SEARCH_PERFORMED, {
      ..._buildBaseContext(),
      search_query:         query,
      search_query_length:  query.length,
      search_result_count:  resultCount,
      search_timestamp:     new Date().toISOString(),
      active_filters:       filters,
      search_is_empty:      resultCount === 0,
    });
  }

  function trackFilterApplied(filterType, filterValue, resultCount) {
    _fire(SEGMENT_EVENTS.PRODUCT_FILTER_APPLIED, {
      ..._buildBaseContext(),
      filter_type:         filterType,
      filter_value:        filterValue,
      post_filter_results: resultCount,
    });
  }

  function trackSortApplied(sortValue, resultCount) {
    _fire(SEGMENT_EVENTS.PRODUCT_SORT_APPLIED, {
      ..._buildBaseContext(),
      sort_option:         sortValue,
      post_sort_results:   resultCount,
    });
  }


  /* ---- Product Engagement Events (Funnel Step 1) ---- */

  let _productViewStartTime = null;
  let _currentViewedProductId = null;

  function trackProductListViewed(products, listName = "product_list", source = "shop") {
    _fire(SEGMENT_EVENTS.PRODUCT_LIST_VIEWED, {
      ..._buildBaseContext(),
      list_id:       listName.toLowerCase().replace(/ /g, "_"),
      list_name:     listName,
      list_source:   source,
      product_count: products.length,
      products:      products.slice(0, 20).map((p, i) => ({
        ...(_buildProductTraits(p)),
        list_position: i + 1,
      })),
    });
  }

  function trackProductViewed(product, source = "shop", position = null) {
    const viewHistory = UserProfileUnifier.getAnonTraits().product_view_history;
    const previousViewsOfThisProduct = viewHistory.filter(v => v.productId === product.id).length;
    const isRevisit = previousViewsOfThisProduct > 0;

    UserProfileUnifier.recordAnonymousActivity("product_view", { productId: product.id, category: product.category });
    IntentScorer.addSignal(isRevisit ? "product_revisited" : "product_viewed");
    if (product.discount > 0) PricingSensitivityClassifier.recordSignal("products_with_discount_viewed");
    else PricingSensitivityClassifier.recordSignal("products_without_discount_viewed");

    _productViewStartTime = Date.now();
    _currentViewedProductId = product.id;

    const funnelContext = FunnelStateManager.advanceTo("product_viewed", { source_list: source });

    const eventName = isRevisit ? SEGMENT_EVENTS.PRODUCT_REVISITED : SEGMENT_EVENTS.PRODUCT_VIEWED;

    _fire(eventName, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product),
      view_source:         source,
      list_position:       position,
      is_revisit:          isRevisit,
      previous_views_of_this_product: previousViewsOfThisProduct,
      total_products_viewed_this_session: UserProfileUnifier.getAnonTraits().product_views,
      should_show_urgency: IntentScorer.shouldShowUrgencyNudge(),
      ...funnelContext,
    });
  }

  function trackProductEngagement(product, engagementType) {
    // engagementType: "image_browsed" | "specs_expanded" | "reviews_scrolled"
    const signalMap = {
      image_browsed:   "image_browsed",
      specs_expanded:  "specs_expanded",
      reviews_scrolled: "reviews_scrolled",
    };
    if (signalMap[engagementType]) IntentScorer.addSignal(signalMap[engagementType]);

    const eventMap = {
      image_browsed:    SEGMENT_EVENTS.PRODUCT_IMAGE_BROWSED,
      specs_expanded:   SEGMENT_EVENTS.PRODUCT_SPECS_EXPANDED,
      reviews_scrolled: SEGMENT_EVENTS.PRODUCT_REVIEW_SCROLLED,
    };

    _fire(eventMap[engagementType] || SEGMENT_EVENTS.PRODUCT_VIEWED, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product),
      engagement_type:  engagementType,
      intent_score_after: IntentScorer.getScore(),
    });
  }

  function trackTimeOnProductPage(product, milestoneSeconds) {
    const signalMap = { 60: "time_on_product_60s", 120: "time_on_product_120s" };
    if (signalMap[milestoneSeconds]) IntentScorer.addSignal(signalMap[milestoneSeconds]);

    _fire(SEGMENT_EVENTS.TIME_ON_PRODUCT_MILESTONE, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product),
      time_milestone_s: milestoneSeconds,
      intent_score_after: IntentScorer.getScore(),
      intent_tier:        IntentScorer.getIntentTier(),
      should_now_show_urgency: IntentScorer.shouldShowUrgencyNudge(),
    });

    // Push updated intent to profile
    UserProfileUnifier.updateIdentifiedTraits({
      intent_score: IntentScorer.getScore(),
      intent_tier:  IntentScorer.getIntentTier(),
    });
  }

  function trackWishlistAction(product, action, wishlistSize) {
    if (action === "added") {
      UserProfileUnifier.recordAnonymousActivity("wishlist_add");
      IntentScorer.addSignal("product_added_to_wishlist");
    }
    const eventName = action === "added"
      ? SEGMENT_EVENTS.PRODUCT_ADDED_TO_WISHLIST
      : SEGMENT_EVENTS.PRODUCT_REMOVED_FROM_WISHLIST;

    _fire(eventName, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product),
      wishlist_action:   action,
      wishlist_size:     wishlistSize,
      intent_score:      IntentScorer.getScore(),
    });
  }


  /* ---- Cart Events (Funnel Step 2) ---- */

  function trackProductAddedToCart(product, quantity, cartItems, source = "product_page") {
    UserProfileUnifier.recordAnonymousActivity("cart_add");
    IntentScorer.addSignal("product_added_to_cart");
    PricingSensitivityClassifier.recordSignal("products_with_discount_viewed", product.discount > 0 ? 1 : 0);

    const funnelContext = FunnelStateManager.advanceTo("added_to_cart", { product_id: product.id });

    _fire(SEGMENT_EVENTS.PRODUCT_ADDED_TO_CART, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product, { quantity }),
      add_source:                source,
      ..._buildCartTraits(cartItems),
      intent_score:              IntentScorer.getScore(),
      intent_tier:               IntentScorer.getIntentTier(),
      buyer_archetype:           PricingSensitivityClassifier.getArchetype(),
      should_show_personalised_offer: IntentScorer.shouldShowPersonalisedOffer(),
      ...funnelContext,
    });

    // Live trait push
    UserProfileUnifier.updateIdentifiedTraits({
      intent_score:    IntentScorer.getScore(),
      buyer_archetype: PricingSensitivityClassifier.getArchetype(),
      last_cart_add_product_id: product.id,
      last_cart_add_at: new Date().toISOString(),
    });
  }

  function trackProductRemovedFromCart(product, quantity, cartItems, reason = "user_action") {
    _fire(SEGMENT_EVENTS.PRODUCT_REMOVED_FROM_CART, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product, { quantity }),
      removal_reason:   reason,   // "user_action" | "out_of_stock" | "session_expired"
      ..._buildCartTraits(cartItems),
    });
  }

  function trackCartViewed(cartItems) {
    _fire(SEGMENT_EVENTS.CART_PAGE_VIEWED, {
      ..._buildBaseContext(),
      ..._buildCartTraits(cartItems),
      intent_score:     IntentScorer.getScore(),
      buyer_archetype:  PricingSensitivityClassifier.getArchetype(),
      should_show_urgency: IntentScorer.shouldShowUrgencyNudge(),
      should_offer_discount: PricingSensitivityClassifier.shouldOfferDiscount(),
    });
  }

  function trackCouponAction(couponCode, action, cartTotal, discountAmount = 0) {
    UserProfileUnifier.recordAnonymousActivity("coupon_attempt");
    IntentScorer.addSignal("coupon_entered");
    PricingSensitivityClassifier.recordSignal("coupon_attempts");
    PricingSensitivityClassifier.recordSignal("cart_value_at_coupon_attempt", cartTotal);

    const eventName = action === "applied" ? SEGMENT_EVENTS.COUPON_APPLIED
      : action === "denied" ? SEGMENT_EVENTS.COUPON_DENIED
      : SEGMENT_EVENTS.COUPON_ENTERED;

    _fire(eventName, {
      ..._buildBaseContext(),
      coupon_code:          couponCode,
      coupon_action:        action,
      cart_total_before:    cartTotal,
      discount_amount:      discountAmount,
      coupon_attempt_count: UserProfileUnifier.getAnonTraits().coupon_attempts,
      sensitivity_score:    PricingSensitivityClassifier.getSensitivityScore(),
      buyer_archetype:      PricingSensitivityClassifier.getArchetype(),
    });

    UserProfileUnifier.updateIdentifiedTraits({
      buyer_archetype:        PricingSensitivityClassifier.getArchetype(),
      pricing_sensitivity_score: PricingSensitivityClassifier.getSensitivityScore(),
    });
  }


  /* ---- Checkout Events (Funnel Step 3) ---- */

  function trackCheckoutInitiated(cartItems, couponApplied = null) {
    const funnelContext = FunnelStateManager.advanceTo("checkout_started");
    IntentScorer.addSignal("checkout_initiated");

    _fire(SEGMENT_EVENTS.CHECKOUT_INITIATED, {
      ..._buildBaseContext(),
      ..._buildCartTraits(cartItems),
      coupon_applied:          couponApplied,
      intent_score:            IntentScorer.getScore(),
      intent_tier:             IntentScorer.getIntentTier(),
      buyer_archetype:         PricingSensitivityClassifier.getArchetype(),
      pricing_sensitivity:     PricingSensitivityClassifier.getSensitivityScore(),
      should_offer_discount:   PricingSensitivityClassifier.shouldOfferDiscount(),
      checkout_session_id:     FunnelStateManager.getFunnelSessionId(),
      ...funnelContext,
    });

    UserProfileUnifier.updateIdentifiedTraits({
      last_checkout_initiated_at: new Date().toISOString(),
      intent_score: IntentScorer.getScore(),
    });
  }

  function trackCheckoutStepCompleted(stepNumber, stepName, details = {}) {
    _fire(SEGMENT_EVENTS.CHECKOUT_STEP_COMPLETED, {
      ..._buildBaseContext(),
      checkout_step_number: stepNumber,
      checkout_step_name:   stepName,
      checkout_session_id:  FunnelStateManager.getFunnelSessionId(),
      intent_score:         IntentScorer.getScore(),
      ...details,
    });
  }

  function trackPaymentMethodSelected(method, cartTotal) {
    _fire(SEGMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
      ..._buildBaseContext(),
      payment_method:      method,
      cart_total:          cartTotal,
      checkout_session_id: FunnelStateManager.getFunnelSessionId(),
      buyer_archetype:     PricingSensitivityClassifier.getArchetype(),
      payment_is_cod:      method === "cod",
      payment_is_card:     method === "card",
    });
  }

  function trackDeliveryMethodSelected(method, cost) {
    _fire(SEGMENT_EVENTS.DELIVERY_METHOD_SELECTED, {
      ..._buildBaseContext(),
      delivery_method:     method.id,
      delivery_label:      method.label,
      delivery_cost:       cost,
      checkout_session_id: FunnelStateManager.getFunnelSessionId(),
    });
  }


  /* ---- Purchase Event (Funnel Step 4) ---- */

  function trackOrderPlaced(order, cartItems, couponApplied, paymentMethod, deliveryMethod, user) {
    const funnelContext = FunnelStateManager.advanceTo("purchase_completed");
    const isFirstOrder = (user.totalOrders || 0) === 0;
    const { subtotal, discount, total } = order;

    _fire(SEGMENT_EVENTS.ORDER_PLACED, {
      ..._buildBaseContext(),
      // Order core
      order_id:              order.id,
      order_total:           total,
      order_subtotal:        subtotal,
      order_discount:        discount || 0,
      order_currency:        "INR",
      order_item_count:      cartItems.length,
      order_quantity_total:  cartItems.reduce((s, i) => s + i.quantity, 0),
      // Cart details
      ..._buildCartTraits(cartItems),
      // Discount & pricing
      coupon_code:           couponApplied?.code || null,
      discount_type:         couponApplied?.type || null,
      discount_amount:       discount || 0,
      bought_with_discount:  (discount || 0) > 0,
      // Fulfillment
      payment_method:        paymentMethod,
      delivery_method:       deliveryMethod,
      // Customer & funnel signals
      is_first_order:        isFirstOrder,
      intent_score_at_purchase: IntentScorer.getScore(),
      buyer_archetype:       PricingSensitivityClassifier.getArchetype(),
      pricing_sensitivity:   PricingSensitivityClassifier.getSensitivityScore(),
      checkout_session_id:   FunnelStateManager.getFunnelSessionId(),
      ...funnelContext,
    });

    // Update profile post-purchase
    UserProfileUnifier.updateIdentifiedTraits({
      total_orders:           (user.totalOrders || 0) + 1,
      total_lifetime_value:   (user.totalSpent || 0) + total,
      last_purchase_date:     new Date().toISOString(),
      last_order_value:       total,
      last_order_id:          order.id,
      last_payment_method:    paymentMethod,
      buyer_archetype:        PricingSensitivityClassifier.getArchetype(),
      purchased_with_discount: (discount || 0) > 0,
    });

    // Reset funnel for next journey
    FunnelStateManager.reset();
    IntentScorer.reset();
  }


  /* ---- UI & Engagement Events ---- */

  function trackUrgencyNudgeShown(product, nudgeType) {
    _fire(SEGMENT_EVENTS.URGENCY_NUDGE_SHOWN, {
      ..._buildBaseContext(),
      ..._buildProductTraits(product),
      nudge_type:      nudgeType,   // "low_stock" | "trending" | "personalised_offer"
      intent_score:    IntentScorer.getScore(),
      buyer_archetype: PricingSensitivityClassifier.getArchetype(),
    });
  }

  function trackPromoBannerClicked(bannerData) {
    _fire(SEGMENT_EVENTS.PROMO_BANNER_CLICKED, {
      ..._buildBaseContext(),
      banner_id:       bannerData.id,
      banner_headline: bannerData.headline,
      target_category: bannerData.category,
      target_page:     bannerData.ctaPage,
    });
    PricingSensitivityClassifier.recordSignal("discount_pages_visited");
  }


  /* ---- Helpers ---- */

  function _buildUserTraits(user) {
    return {
      user_id:           user.id,
      email:             user.email,
      first_name:        user.firstName,
      last_name:         user.lastName,
      name:              `${user.firstName} ${user.lastName}`,
      phone:             user.phone || null,
      date_of_birth:     user.dob || null,
      age:               user.dob ? _calculateAge(user.dob) : null,
      member_since:      user.memberSince || new Date().toISOString().split("T")[0],
      account_age_days:  _accountAgeDays(user.memberSince),
      loyalty_points:    user.loyaltyPoints || 0,
      total_orders:      user.totalOrders || 0,
      total_spent:       user.totalSpent || 0,
      average_order_value: user.totalOrders > 0 ? Math.round((user.totalSpent || 0) / user.totalOrders) : 0,
      shopping_preferences: user.preferences || [],
      buyer_segment:     user.segment || "unknown",
      // Live-computed
      intent_score:      IntentScorer.getScore(),
      buyer_archetype:   PricingSensitivityClassifier.getArchetype(),
    };
  }

  function _calculateAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    return Math.floor((now - birth) / (365.25 * 24 * 3600 * 1000));
  }

  function _accountAgeDays(memberSince) {
    if (!memberSince) return 0;
    return Math.floor((Date.now() - new Date(memberSince).getTime()) / (86400 * 1000));
  }

  function _fire(eventName, properties) {
    if (window.analytics && typeof window.analytics.track === "function") {
      analytics.track(eventName, properties);
    }
    // Dev console log for demo purposes
    console.groupCollapsed(`[Segment] ${eventName}`);
    console.table(Object.entries(properties).map(([k, v]) => ({ Property: k, Value: typeof v === "object" ? JSON.stringify(v) : v })));
    console.groupEnd();
  }

  return {
    trackUserSignedUp,
    trackUserLoggedIn,
    trackUserLoggedOut,
    trackSocialAuthInitiated,
    trackProfileUpdated,
    trackPasswordResetRequested,
    trackPageViewed,
    trackCategorySelected,
    trackSearchPerformed,
    trackFilterApplied,
    trackSortApplied,
    trackProductListViewed,
    trackProductViewed,
    trackProductEngagement,
    trackTimeOnProductPage,
    trackWishlistAction,
    trackProductAddedToCart,
    trackProductRemovedFromCart,
    trackCartViewed,
    trackCouponAction,
    trackCheckoutInitiated,
    trackCheckoutStepCompleted,
    trackPaymentMethodSelected,
    trackDeliveryMethodSelected,
    trackOrderPlaced,
    trackUrgencyNudgeShown,
    trackPromoBannerClicked,
    // Expose helpers for direct use
    IntentScorer,
    PricingSensitivityClassifier,
    FunnelStateManager,
    UserProfileUnifier,
  };
})();
