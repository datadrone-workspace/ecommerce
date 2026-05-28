/* =========================================================
   LuxeMart — Data Layer
   All catalog, config, and dynamic content data lives here.
   Replace with API calls in production.
   ========================================================= */

const LUXEMART_CONFIG = {
  storeName: "LuxeMart",
  currency: "INR",
  currencySymbol: "₹",
  freeShippingThreshold: 999,
  defaultShippingCost: 49,
  loyaltyPointsRate: 0.05,   // 5% of spend = points
  sessionTimeoutMinutes: 30,
};

const CATEGORIES = [
  { id: "electronics",   label: "Electronics",    emoji: "⚡", color: "#1a1a2e" },
  { id: "fashion",       label: "Fashion",         emoji: "👗", color: "#2d1b33" },
  { id: "home_living",   label: "Home & Living",   emoji: "🏠", color: "#1b2d24" },
  { id: "beauty",        label: "Beauty",          emoji: "✨", color: "#2d1b1b" },
  { id: "sports",        label: "Sports",          emoji: "🏃", color: "#1b2233" },
  { id: "books",         label: "Books",           emoji: "📚", color: "#2d2a1b" },
];

const BRANDS = [
  "Artisan Co.", "Veridian", "NovaTech", "Lumière", "Kiran", "Nakama",
  "Prism Studio", "Altitude", "Solace", "Veldt"
];

const PRODUCTS = [
  // ELECTRONICS
  {
    id: "P001", sku: "EL-WH-001",
    name: "Meridian Pro Wireless Headphones",
    brand: "NovaTech", category: "electronics",
    price: 12999, originalPrice: 15999,
    rating: 4.7, reviewCount: 1284,
    stock: 43, isNew: false, isTrending: true, isFeatured: true,
    tags: ["wireless", "noise-cancelling", "premium"],
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80",
    ],
    description: "Studio-grade wireless headphones with 40-hour battery, adaptive noise cancellation, and LDAC Hi-Res audio. The gold standard for discerning ears.",
    specs: { "Driver Size": "40mm", "Battery": "40 hours", "Connectivity": "Bluetooth 5.3", "Noise Cancellation": "Adaptive ANC" },
    discount: 19,
  },
  {
    id: "P002", sku: "EL-SM-002",
    name: "Veldt 14 Ultra Smartwatch",
    brand: "Veldt", category: "electronics",
    price: 24999, originalPrice: 29999,
    rating: 4.5, reviewCount: 892,
    stock: 21, isNew: true, isTrending: true, isFeatured: true,
    tags: ["smartwatch", "health", "premium"],
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"],
    description: "The Veldt 14 Ultra tracks everything that matters. 2-day battery, ECG, SpO2, 100+ workout modes, and a display that looks like a piece of art.",
    specs: { "Display": "1.9\" AMOLED", "Battery": "48 hours", "Water Resistance": "50M", "Health": "ECG, SpO2, HRV" },
    discount: 17,
  },
  {
    id: "P003", sku: "EL-TB-003",
    name: "Prism Fold X Tablet",
    brand: "Prism Studio", category: "electronics",
    price: 45999, originalPrice: 49999,
    rating: 4.6, reviewCount: 543,
    stock: 8, isNew: true, isTrending: false, isFeatured: true,
    tags: ["tablet", "creative", "foldable"],
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80"],
    description: "12.9\" OLED display with ProMotion 120Hz, M2-class chip, and all-day battery. Whether you're illustrating, editing, or just reading — perfection.",
    specs: { "Display": "12.9\" OLED 120Hz", "Chip": "A16-class", "Storage": "256GB", "Battery": "10,758 mAh" },
    discount: 8,
  },
  {
    id: "P004", sku: "EL-SP-004",
    name: "Altitude Bloom Speaker",
    brand: "Altitude", category: "electronics",
    price: 7499, originalPrice: 8999,
    rating: 4.8, reviewCount: 2103,
    stock: 65, isNew: false, isTrending: true, isFeatured: false,
    tags: ["speaker", "portable", "360-sound"],
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80"],
    description: "360-degree spatial audio in a beautifully compact form. IPX7 waterproof, 24-hour playtime, and a fabric finish that ages beautifully.",
    specs: { "Sound": "360° Spatial", "Battery": "24 hours", "Waterproof": "IPX7", "Weight": "540g" },
    discount: 17,
  },

  // FASHION
  {
    id: "P005", sku: "FA-JK-005",
    name: "Lumière Studio Linen Jacket",
    brand: "Lumière", category: "fashion",
    price: 5999, originalPrice: 7499,
    rating: 4.4, reviewCount: 387,
    stock: 34, isNew: true, isTrending: true, isFeatured: true,
    tags: ["linen", "unisex", "summer"],
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80"],
    description: "Washed Belgian linen in a relaxed cut that moves with you. Unlined, unstructured, and effortlessly elegant. Available in Ivory, Sand, and Slate.",
    specs: { "Material": "100% Belgian Linen", "Fit": "Relaxed", "Care": "Machine washable", "Origin": "Made in India" },
    discount: 20,
  },
  {
    id: "P006", sku: "FA-SN-006",
    name: "Solace Cloud Runner Sneakers",
    brand: "Solace", category: "fashion",
    price: 4499, originalPrice: 5499,
    rating: 4.6, reviewCount: 1102,
    stock: 89, isNew: false, isTrending: true, isFeatured: false,
    tags: ["sneakers", "comfort", "minimal"],
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
    description: "Ultra-lightweight knit upper with memory foam insole and a featherweight EVA outsole. The sneaker you'll wear every single day.",
    specs: { "Upper": "Engineered Knit", "Insole": "Memory Foam", "Weight": "220g/pair", "Sole": "EVA" },
    discount: 18,
  },
  {
    id: "P007", sku: "FA-BG-007",
    name: "Artisan Co. Canvas Tote",
    brand: "Artisan Co.", category: "fashion",
    price: 1999, originalPrice: 2499,
    rating: 4.9, reviewCount: 3201,
    stock: 210, isNew: false, isTrending: false, isFeatured: true,
    tags: ["bag", "canvas", "everyday"],
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"],
    description: "Heavy-duty 18oz canvas with natural leather handles, interior zip pocket, and a base that won't sag. Gets better with every use.",
    specs: { "Material": "18oz Cotton Canvas", "Handles": "Vegetable-tanned leather", "Capacity": "22L", "Base": "Reinforced" },
    discount: 20,
  },

  // HOME & LIVING
  {
    id: "P008", sku: "HL-LM-008",
    name: "Veridian Arc Desk Lamp",
    brand: "Veridian", category: "home_living",
    price: 3499, originalPrice: 4299,
    rating: 4.7, reviewCount: 876,
    stock: 52, isNew: false, isTrending: false, isFeatured: true,
    tags: ["lamp", "desk", "LED"],
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"],
    description: "Architectural arc lamp with stepless dimming, color temperature control (2700K–6500K), and USB-C charging pass-through. Design meets function.",
    specs: { "Light": "LED 12W", "CCT Range": "2700K-6500K", "Dimming": "Stepless", "Port": "USB-C 18W" },
    discount: 19,
  },
  {
    id: "P009", sku: "HL-CD-009",
    name: "Nakama Bamboo Candle Set",
    brand: "Nakama", category: "home_living",
    price: 1299, originalPrice: 1699,
    rating: 4.8, reviewCount: 2450,
    stock: 134, isNew: false, isTrending: true, isFeatured: false,
    tags: ["candle", "fragrance", "gift"],
    image: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=800&q=80"],
    description: "Hand-poured soy wax candles with bamboo wicks. Set of 3: Hinoki Cedar, Yuzu Blossom, and Vetiver Rain. 45-hour burn time each.",
    specs: { "Wax": "100% Soy", "Wick": "Bamboo", "Burn Time": "45 hrs each", "Scents": "3 (Hinoki, Yuzu, Vetiver)" },
    discount: 24,
  },
  {
    id: "P010", sku: "HL-PL-010",
    name: "Kiran Terrazzo Planter",
    brand: "Kiran", category: "home_living",
    price: 2199, originalPrice: 2699,
    rating: 4.5, reviewCount: 643,
    stock: 30, isNew: true, isTrending: false, isFeatured: false,
    tags: ["planter", "terrazzo", "decor"],
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80"],
    description: "Hand-cast terrazzo planter with drainage hole and matching saucer. Each piece is unique. Suitable for indoor plants up to 8\" pot size.",
    specs: { "Material": "Terrazzo composite", "Dimensions": "22cm × 20cm", "Drainage": "Yes + saucer", "Weight": "1.2kg" },
    discount: 19,
  },

  // BEAUTY
  {
    id: "P011", sku: "BE-SK-011",
    name: "Lumière Glow Serum",
    brand: "Lumière", category: "beauty",
    price: 2499, originalPrice: 3199,
    rating: 4.9, reviewCount: 5632,
    stock: 200, isNew: false, isTrending: true, isFeatured: true,
    tags: ["serum", "vitamin-c", "brightening"],
    image: "https://images.unsplash.com/photo-1631730486572-6ea45a19eb62?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1631730486572-6ea45a19eb62?w=800&q=80"],
    description: "15% Vitamin C + Niacinamide + Hyaluronic Acid. Clinically shown to reduce dark spots in 4 weeks. Fragrance-free, dermatologist-tested, and loved by thousands.",
    specs: { "Key Actives": "15% Vit C, 5% Niacinamide", "Volume": "30ml", "Skin Type": "All", "Cruelty Free": "Yes" },
    discount: 22,
  },
  {
    id: "P012", sku: "BE-PR-012",
    name: "Artisan Co. Rosehip Oil",
    brand: "Artisan Co.", category: "beauty",
    price: 1199, originalPrice: 1499,
    rating: 4.7, reviewCount: 2890,
    stock: 176, isNew: false, isTrending: false, isFeatured: false,
    tags: ["face-oil", "natural", "hydration"],
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80"],
    description: "Cold-pressed Chilean rosehip seed oil — rich in Omega-3, Omega-6, and Vitamin A. For scars, fine lines, and an unmistakable healthy glow.",
    specs: { "Origin": "Chile", "Process": "Cold-pressed", "Volume": "30ml", "Certifications": "COSMOS Organic" },
    discount: 20,
  },

  // SPORTS
  {
    id: "P013", sku: "SP-YM-013",
    name: "Altitude Pro Yoga Mat",
    brand: "Altitude", category: "sports",
    price: 2799, originalPrice: 3499,
    rating: 4.6, reviewCount: 1876,
    stock: 90, isNew: false, isTrending: false, isFeatured: true,
    tags: ["yoga", "mat", "eco"],
    image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80"],
    description: "6mm natural rubber base with microfiber surface. Superior grip wet or dry. Aligns your practice with body-length guide lines. Includes carry strap.",
    specs: { "Thickness": "6mm", "Material": "Natural Rubber + Microfiber", "Size": "183cm × 61cm", "Weight": "2.3kg" },
    discount: 20,
  },
  {
    id: "P014", sku: "SP-BT-014",
    name: "Veldt Stainless Bottle",
    brand: "Veldt", category: "sports",
    price: 899, originalPrice: 1199,
    rating: 4.8, reviewCount: 4321,
    stock: 320, isNew: false, isTrending: true, isFeatured: false,
    tags: ["bottle", "insulated", "hydration"],
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80"],
    description: "Triple-wall insulated 750ml bottle. Cold 24h, hot 12h. BPA-free, leak-proof lid, and a matte powder coat that won't scratch your other gear.",
    specs: { "Capacity": "750ml", "Cold": "24 hours", "Hot": "12 hours", "Material": "18/8 Stainless Steel" },
    discount: 25,
  },

  // BOOKS
  {
    id: "P015", sku: "BK-NF-015",
    name: "The Craft of Systems Thinking",
    brand: "Veridian", category: "books",
    price: 599, originalPrice: 799,
    rating: 4.9, reviewCount: 3102,
    stock: 500, isNew: false, isTrending: true, isFeatured: false,
    tags: ["books", "non-fiction", "productivity"],
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80"],
    description: "A practitioner's guide to systems thinking — from feedback loops to leverage points. Praised by founders, designers, and policy-makers alike.",
    specs: { "Pages": "312", "Format": "Hardcover", "Language": "English", "Publisher": "Veridian Press" },
    discount: 25,
  },
  {
    id: "P016", sku: "BK-FC-016",
    name: "Between Midnight & Morning",
    brand: "Nakama", category: "books",
    price: 449, originalPrice: 599,
    rating: 4.7, reviewCount: 1987,
    stock: 280, isNew: true, isTrending: false, isFeatured: false,
    tags: ["books", "fiction", "literary"],
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&q=80",
    images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80"],
    description: "Longlisted for the International Booker Prize. A fragmented, luminous novel about memory, identity, and the stories we inherit.",
    specs: { "Pages": "256", "Format": "Paperback", "Language": "English", "Award": "Booker Longlist" },
    discount: 25,
  },
];

const DELIVERY_OPTIONS = [
  { id: "standard", label: "Standard Delivery", desc: "3–5 business days", price: 0, icon: "🚚" },
  { id: "express",  label: "Express Delivery",  desc: "1–2 business days", price: 99, icon: "⚡" },
  { id: "same_day", label: "Same Day Delivery",  desc: "Delivered today by 9 PM", price: 249, icon: "🏎" },
];

const PAYMENT_METHODS = [
  { id: "card",     label: "Credit / Debit Card",  icon: "💳", hasForm: true },
  { id: "upi",      label: "UPI",                   icon: "📱", hasForm: false },
  { id: "netbank",  label: "Net Banking",            icon: "🏦", hasForm: false },
  { id: "cod",      label: "Cash on Delivery",       icon: "💵", hasForm: false },
  { id: "emi",      label: "EMI (No-cost available)", icon: "📅", hasForm: false },
];

const COUPON_CODES = {
  "WELCOME10": { type: "percent", value: 10, minOrder: 0,    label: "10% off" },
  "FLAT500":   { type: "flat",    value: 500, minOrder: 2000, label: "₹500 off" },
  "SAVE20":    { type: "percent", value: 20, minOrder: 3000,  label: "20% off orders above ₹3000" },
  "FIRST":     { type: "percent", value: 15, minOrder: 0,    label: "15% off for first order" },
};

const DEMO_USER_PROFILES = [
  {
    id: "U001", email: "alex@example.com", password: "demo123",
    firstName: "Alex", lastName: "Chen",
    phone: "+91 98765 43210", dob: "1992-07-14",
    preferences: ["electronics", "books"],
    memberSince: "2023-01-15",
    loyaltyPoints: 1240,
    totalOrders: 8,
    totalSpent: 34750,
    segment: "premium_buyer",
  },
  {
    id: "U002", email: "priya@example.com", password: "demo123",
    firstName: "Priya", lastName: "Nair",
    phone: "+91 99001 22334", dob: "1995-03-22",
    preferences: ["fashion", "beauty", "home_living"],
    memberSince: "2023-06-10",
    loyaltyPoints: 430,
    totalOrders: 3,
    totalSpent: 8600,
    segment: "discount_seeker",
  },
];

const HERO_BANNERS = [
  {
    eyebrow: "New Collection",
    headline: "Crafted for the\n<em>discerning</em> few.",
    sub: "Premium products curated to your taste.",
    cta: "Explore Collection",
    ctaPage: "shop",
    bgGradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)",
  },
];

const PROMO_BANNERS = [
  {
    id: "promo_summer",
    headline: "Summer Essentials",
    sub: "Up to 25% off on select fashion & beauty picks.",
    cta: "Shop the Sale",
    ctaPage: "deals",
    category: "fashion",
    bg: "linear-gradient(120deg, #2d1b33 0%, #0a0a1a 100%)",
  },
];
