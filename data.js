/**
 * NovaStore Seed Data
 * Catalog of products with categories, variants, specifications, and reviews.
 */

const INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Aura Noise-Canceling Wireless Headphones",
    tagline: "Studio acoustics with active hybrid cancellation",
    category: "audio",
    categoryName: "Audio & Sound",
    price: 279.99,
    originalPrice: 349.99,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 428,
    stock: 24,
    badge: "Best Seller",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Immerse yourself in crystal clear sound with 40mm custom drivers, dual transparency mode, and up to 45 hours of ultra-long battery life with rapid USB-C charging.",
    features: [
      "Hybrid Active Noise Cancellation (-42dB)",
      "Custom 40mm Titanium Drivers",
      "45-Hour Battery Life with Fast Charge",
      "Multipoint Bluetooth 5.3 Connection",
      "Memory foam ear cushions with protein leather"
    ],
    colors: ["Space Black", "Silver Frost", "Midnight Navy"],
    sizes: [],
    specs: {
      "Weight": "255g",
      "Battery Life": "45 hours (ANC off), 35 hours (ANC on)",
      "Connectivity": "Bluetooth 5.3 / 3.5mm Aux",
      "Water Resistance": "IPX4 splash resistant"
    }
  },
  {
    id: "prod-2",
    name: "Titan Chrono Smartwatch Ultra",
    tagline: "Aerospace titanium with sapphire crystal OLED",
    category: "wearables",
    categoryName: "Wearables & Watches",
    price: 389.00,
    originalPrice: 449.00,
    discountPercent: 13,
    rating: 4.8,
    reviewCount: 312,
    stock: 15,
    badge: "Trending",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Engineered for endurance athletes and everyday trailblazers. Includes dual-frequency GPS, ECG monitor, blood oxygen tracker, and up to 14 days of power.",
    features: [
      "Grade 5 Titanium Body & Sapphire Glass",
      "Always-On 1.43\" AMOLED Display (1500 nits)",
      "Advanced Dual-Band GNSS Precision GPS",
      "Health Sensors: ECG, SpO2, Heart Rate, Skin Temp",
      "50m / 5ATM Water Resistance"
    ],
    colors: ["Titanium Grey", "Obsidian Black", "Solar Orange"],
    sizes: ["42mm", "46mm"],
    specs: {
      "Case Size": "46 x 46 x 11.8 mm",
      "Screen": "1.43 inch AMOLED 466x466",
      "Battery": "Up to 14 days standard usage",
      "Sensors": "Optical heart, Accelerometer, Barometer, Gyroscope"
    }
  },
  {
    id: "prod-3",
    name: "Luminary Mechanical Minimalist Keyboard",
    tagline: "Hot-swappable tactile switches with RGB per-key backlighting",
    category: "electronics",
    categoryName: "Electronics & Gadgets",
    price: 139.50,
    originalPrice: 179.00,
    discountPercent: 22,
    rating: 4.7,
    reviewCount: 189,
    stock: 38,
    badge: "Staff Pick",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Crafted with an anodized aluminum chassis, pre-lubed Gateron switches, sound-dampening foam layers, and triple-mode wireless connectivity.",
    features: [
      "75% Compact Layout with CNC Aluminum Case",
      "Hot-Swappable PCB (3-pin & 5-pin support)",
      "Wireless 2.4Ghz, Bluetooth 5.1 & Type-C wired",
      "PBT Double-Shot Keycaps",
      "4000mAh Battery (up to 200 hours without backlight)"
    ],
    colors: ["Graphite & Teal", "Monochrome White", "Retro Cream"],
    sizes: ["Tactile Brown", "Linear Red", "Clicky Blue"],
    specs: {
      "Connectivity": "2.4Ghz, Bluetooth, USB-C",
      "Layout": "75% (84 Keys)",
      "Plate": "Polycarbonate Gasket Mounted",
      "Weight": "920g"
    }
  },
  {
    id: "prod-4",
    name: "Minimalist Italian Leather Everyday Backpack",
    tagline: "Water-resistant top-grain leather with padded 16\" laptop compartment",
    category: "fashion",
    categoryName: "Fashion & Lifestyle",
    price: 189.00,
    originalPrice: 240.00,
    discountPercent: 21,
    rating: 4.9,
    reviewCount: 215,
    stock: 19,
    badge: "New Arrival",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Expertly crafted in Florence using vegetable-tanned Italian leather that develops a rich patina over time. Designed for daily commutes and weekend escapes.",
    features: [
      "Full-grain water-repellent Florentine leather",
      "Dedicated fleece-lined 16-inch laptop pocket",
      "Luggage pass-through strap for seamless travel",
      "Hidden RFID-blocking passport compartment",
      "Breathable ergonomic mesh back padding"
    ],
    colors: ["Cognac Brown", "Charcoal Black", "Vintage Olive"],
    sizes: ["20L Standard", "26L Extended"],
    specs: {
      "Capacity": "20 Liters / 26 Liters",
      "Dimensions": "44 x 31 x 14 cm",
      "Weight": "1.1 kg",
      "Material": "Vegetable Tanned Full Grain Leather"
    }
  },
  {
    id: "prod-5",
    name: "Apex 4K Cinematic Mirrorless Camera",
    tagline: "Full-frame 33MP sensor with 5-axis IBIS and 4K60p video",
    category: "electronics",
    categoryName: "Electronics & Gadgets",
    price: 1699.00,
    originalPrice: 1899.00,
    discountPercent: 10,
    rating: 5.0,
    reviewCount: 94,
    stock: 8,
    badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Capture breathtaking still photography and cinematic footage. Features real-time AI subject tracking, 15+ stops of dynamic range, and dual UHS-II SD card slots.",
    features: [
      "33 Megapixel Full-Frame BSI CMOS Sensor",
      "4K 60p 10-bit 4:2:2 All-Intra internal recording",
      "Real-time Eye AF for Humans, Animals & Birds",
      "5-Axis in-body image stabilization (up to 7.0 stops)",
      "Fully articulating touchscreen LCD"
    ],
    colors: ["Matte Black"],
    sizes: ["Body Only", "Body + 24-70mm f/2.8"],
    specs: {
      "Sensor": "35.9 x 23.9 mm Full Frame",
      "ISO Range": "100 - 51,200 (Exp 50 - 204,800)",
      "Viewfinder": "3.68M-dot OLED EVF",
      "Battery": "approx. 610 shots per charge"
    }
  },
  {
    id: "prod-6",
    name: "Nordic Ceramic Pour-Over & Kettle Set",
    tagline: "Handcrafted matte stoneware with precision gooseneck spout",
    category: "home",
    categoryName: "Home & Living",
    price: 84.99,
    originalPrice: 109.99,
    discountPercent: 22,
    rating: 4.8,
    reviewCount: 167,
    stock: 45,
    badge: "Sale",
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Brew barista-quality coffee every morning with this Scandinavian-inspired pour-over dripper and temperature-balanced stovetop gooseneck kettle.",
    features: [
      "Double-fired ceramic dripper for superior heat retention",
      "Precision flow gooseneck spout for optimal extraction",
      "Dishwasher safe and BPA-free food grade materials",
      "Includes heat-resistant walnut wooden collar and stand"
    ],
    colors: ["Stone White", "Terracotta Matte", "Slate Grey"],
    sizes: ["600 ml", "1000 ml"],
    specs: {
      "Capacity": "600ml / 2-4 cups",
      "Material": "Ceramic Stoneware & Walnut Wood",
      "Filter Type": "Compatible with V60 #02 filters"
    }
  },
  {
    id: "prod-7",
    name: "Merino Wool Oversized Knit Sweater",
    tagline: "100% extra-fine Australian merino wool with ribbed trims",
    category: "fashion",
    categoryName: "Fashion & Lifestyle",
    price: 119.00,
    originalPrice: 159.00,
    discountPercent: 25,
    rating: 4.7,
    reviewCount: 142,
    stock: 28,
    badge: "Trending",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Luxuriously soft and naturally temperature-regulating. Spun from sustainable certified Australian wool with an effortless relaxed drape.",
    features: [
      "100% pure extra-fine merino wool (19.5 micron)",
      "Natural odor resistance and breathability",
      "Reinforced collar and cuffs to maintain shape",
      "Ethically sourced and Woolmark certified"
    ],
    colors: ["Oatmeal Beige", "Dusty Sage", "Midnight Navy", "Black"],
    sizes: ["S", "M", "L", "XL"],
    specs: {
      "Fabric": "100% Merino Wool",
      "Care": "Hand wash cold or dry clean",
      "Fit": "Relaxed oversized cut"
    }
  },
  {
    id: "prod-8",
    name: "Horizon Smart Ambient Light Bar",
    tagline: "Dynamic sync backlighting with 16 million colors & music mode",
    category: "electronics",
    categoryName: "Electronics & Gadgets",
    price: 69.99,
    originalPrice: 89.99,
    discountPercent: 22,
    rating: 4.6,
    reviewCount: 278,
    stock: 50,
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Transform your desktop or entertainment setup. Features responsive sound sensors, smart home app control, and smooth ambient gradient lighting.",
    features: [
      "Smart RGBIC technology with independent zone color tuning",
      "Audio visualizer with integrated high-sensitivity mic",
      "Works with Alexa, Google Home, and Apple HomeKit via Wi-Fi",
      "Dual mounting orientation (Horizontal or Vertical stand)"
    ],
    colors: ["Matte Black", "Lunar White"],
    sizes: ["Single Pack (15\")", "Dual Pack (Pair)"],
    specs: {
      "Input": "5V/2A Type-C",
      "Colors": "16M RGBIC + Warm/Cool White",
      "Lifespan": "50,000 hours"
    }
  }
];

const INITIAL_COUPONS = [
  { code: "NOVA20", discount: 20, type: "percent", desc: "20% off your entire order" },
  { code: "FREESHIP", discount: 15, type: "shipping", desc: "Free standard shipping" },
  { code: "SAVE10", discount: 10, type: "fixed", desc: "$10 off orders above $50" },
  { code: "LUXE50", discount: 50, type: "fixed", desc: "$50 off luxury orders over $250" }
];

const CURRENCIES = {
  USD: { symbol: "$", rate: 1.0, label: "USD ($)" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)" },
  INR: { symbol: "₹", rate: 83.5, label: "INR (₹)" }
};

if (typeof window !== "undefined") {
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
  window.INITIAL_COUPONS = INITIAL_COUPONS;
  window.CURRENCIES = CURRENCIES;
}
