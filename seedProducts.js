require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  {
    name: 'Sony WF-1000XM5 Earbuds',
    category: 'Audio',
    price: 12999,
    originalPrice: 16999,
    rating: 4.8,
    reviews: 2341,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    badge: 'Best Seller',
    description: 'Industry-leading noise cancellation earbuds with Integrated Processor V2. Features 8.4mm drivers, LDAC support, and IPX4 water resistance. Battery life: 8hrs (buds) + 16hrs (case). Multipoint connection for 2 devices simultaneously. The WF-1000XM5 represents Sony\'s pinnacle of engineering combining their proprietary QN2e chip with HD Noise Cancelling Processor QN2 for unparalleled audio fidelity in a compact form factor.',
    specs: [
      'Driver: 8.4mm, Dynamic',
      'Frequency Response: 20Hz–40,000Hz',
      'Bluetooth: 5.3 (A2DP/AVRCP/HFP)',
      'Codec: SBC, AAC, LDAC',
      'Battery: 8hr (NC ON) + 16hr case',
      'Weight: 5.9g per bud',
      'IPX4 water resistant',
      'Multipoint: Yes (2 devices)'
    ]
  },
  {
    name: 'Samsung Galaxy Watch 6 Pro',
    category: 'Wearables',
    price: 34999,
    originalPrice: 41999,
    rating: 4.6,
    reviews: 1872,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    badge: 'New Launch',
    description: 'The Galaxy Watch 6 Pro redefines smartwatch excellence with its titanium case and sapphire crystal glass. Advanced health suite includes BioActive Sensor 3.0 for continuous blood oxygen, ECG, body composition, and sleep coaching powered by AI. Powered by Wear OS 4 with One UI Watch 5.0. Track your VO2 Max, skin temperature, irregular heart rhythm alerts. 60-hour battery with power saving mode.',
    specs: [
      'Case: Titanium 45mm/47mm',
      'Display: 1.47" Super AMOLED 480x480',
      'OS: Wear OS 4 / One UI Watch 5.0',
      'Processor: Exynos W930 Dual-Core 1.4GHz',
      'RAM/Storage: 2GB / 16GB',
      'Battery: 590mAh, ~60hr',
      'Sensors: BioActive 3.0, ECG, Accelerometer',
      'Water Resistance: 5ATM + IP68'
    ]
  },
  {
    name: 'Keychron Q3 Pro Mechanical Keyboard',
    category: 'Peripherals',
    price: 15499,
    originalPrice: 17999,
    rating: 4.9,
    reviews: 3102,
    stock: 22,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
    badge: 'Top Rated',
    description: 'The Keychron Q3 Pro is a 75% TKL wireless/wired hot-swappable mechanical keyboard built with aircraft-grade aluminum CNC body. Features QMK/VIA support for unlimited customization. Gasket-mount design with double silicone dampening delivers a thocky, premium typing sound. Compatible with Mac and Windows. South-facing PCB eliminates RGB shine-through interference.',
    specs: [
      'Layout: 75% (84-key TKL)',
      'Case: Aircraft-grade aluminum',
      'Mount: Gasket mount',
      'Switch: Keychron K Pro Red (hot-swap)',
      'Connectivity: Bluetooth 5.1 / USB-C',
      'Battery: 4000mAh',
      'Backlight: South-facing RGB',
      'Firmware: QMK/VIA compatible'
    ]
  },
  {
    name: 'Herman Miller Aeron Chair',
    category: 'Furniture',
    price: 89999,
    originalPrice: 109999,
    rating: 4.9,
    reviews: 987,
    stock: 5,
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80',
    badge: 'Premium',
    description: 'The iconic Herman Miller Aeron remastered for modern ergonomics. PostureFit SL lumbar system supports both sacrum and lumbar for natural spinal alignment. 8Z Pellicle suspension distributes weight across 8 zones with varying tension eliminating pressure points entirely. Adjustable arms (4D) with forward tilt. Available in 3 sizes. 12-year warranty on all parts. Carbon neutral certified.',
    specs: [
      'Sizes: A (petite), B (standard), C (tall)',
      'Max Load: 136kg',
      'Seat Height: 41–51cm adjustable',
      'Material: 8Z Pellicle mesh',
      'Arms: 4D fully adjustable',
      'Tilt: PostureFit SL with forward tilt',
      'Warranty: 12 years',
      'Certifications: GREENGUARD Gold, Climate Neutral'
    ]
  },
  {
    name: 'Samsung 990 Pro NVMe SSD 2TB',
    category: 'Storage',
    price: 16999,
    originalPrice: 21999,
    rating: 4.7,
    reviews: 5412,
    stock: 31,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&q=80',
    badge: 'Deal',
    description: 'Samsung 990 Pro delivers next-gen PCIe 4.0 performance with sequential read/write speeds of 7,450/6,900 MB/s. Powered by Samsung\'s in-house Pascari controller and V-NAND technology. TBW rating: 1,200 TBW for 2TB model. Compatible with PS5. M.2 2280 form factor. 5-year limited warranty. Power efficiency improved 50% over 980 Pro.',
    specs: [
      'Capacity: 2TB',
      'Interface: PCIe 4.0 x4, NVMe 2.0',
      'Sequential Read: 7,450 MB/s',
      'Sequential Write: 6,900 MB/s',
      'Random Read (4K): 1,400K IOPS',
      'Controller: Samsung Pascari',
      'NAND: Samsung V-NAND 3-bit MLC',
      'Warranty: 5 years / 1,200 TBW'
    ]
  },
  {
    name: 'Sonos Era 300 Spatial Speaker',
    category: 'Audio',
    price: 44999,
    originalPrice: 52999,
    rating: 4.8,
    reviews: 1543,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
    badge: 'Spatial Audio',
    description: 'The Sonos Era 300 is the world\'s first speaker purpose-built for spatial audio featuring 6 Class-D digital amplifiers driving 6 speaker components. Four tweeters fire in multiple directions including upward for Dolby Atmos height effects. Supports Apple Music Lossless, Amazon Music Ultra HD natively. Trueplay tuning adapts to room acoustics. Alexa and Sonos Voice Control built-in.',
    specs: [
      'Amplifiers: 6x Class-D',
      'Drivers: 4 tweeters, 2 woofers',
      'Connectivity: WiFi 6, Bluetooth 5.0, USB-C',
      'Audio: Dolby Atmos, Apple Spatial, 360 Reality Audio',
      'Voice: Amazon Alexa, Sonos Voice Control',
      'Input: USB-C line-in',
      'Power: 100–240V AC',
      'Dimensions: 259 × 160 × 185mm'
    ]
  },
  {
    name: "De'Longhi La Specialista Coffee Machine",
    category: 'Kitchen',
    price: 67999,
    originalPrice: 79999,
    rating: 4.7,
    reviews: 762,
    stock: 7,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    badge: 'Barista Grade',
    description: "Craft cafe-quality espresso at home with De'Longhi's La Specialista Arte Evo. Features built-in 8-setting conical burr grinder with My LatteArt steam wand for microfoam milk texturing. Dual boiler system maintains simultaneous brewing and steaming temperatures. Active Temperature Control system monitors extraction via thermocouple. Bean-to-cup in under 60 seconds.",
    specs: [
      'Boiler: Dual Thermoblock',
      'Pump Pressure: 19 bar',
      'Grinder: 8-level conical burr',
      'Steam Wand: My LatteArt (active)',
      'Water Tank: 2.3L removable',
      'Hopper Capacity: 250g',
      'Power: 1450W',
      'Dimensions: 330 × 380 × 430mm'
    ]
  },
  {
    name: 'Apple iPad Pro 12.9" M2',
    category: 'Tablets',
    price: 112900,
    originalPrice: 129900,
    rating: 4.9,
    reviews: 4231,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    badge: 'New Launch',
    description: 'The most advanced iPad ever featuring the Apple M2 chip for desktop-class performance. Stunning 12.9-inch Liquid Retina XDR display with ProMotion technology up to 120Hz. Compatible with Apple Pencil 2nd gen and Magic Keyboard. Thunderbolt port for blazing-fast connectivity. All-day battery life up to 10 hours. Available in Silver and Space Gray.',
    specs: [
      'Chip: Apple M2 (8-core CPU, 10-core GPU)',
      'Display: 12.9" Liquid Retina XDR, 2732x2048',
      'RAM: 8GB / 16GB',
      'Storage: 128GB – 2TB',
      'Camera: 12MP Wide + 10MP Ultra Wide',
      'Battery: Up to 10 hours',
      'Connectivity: WiFi 6E, Bluetooth 5.3, 5G',
      'Ports: Thunderbolt / USB 4'
    ]
  },
  {
    name: 'LG UltraGear 27" 4K Gaming Monitor',
    category: 'Monitors',
    price: 54999,
    originalPrice: 64999,
    rating: 4.7,
    reviews: 2109,
    stock: 9,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80',
    badge: 'Top Rated',
    description: 'Experience gaming like never before with the LG UltraGear 27" 4K IPS display. 144Hz refresh rate with 1ms response time ensures buttery smooth gameplay. NVIDIA G-Sync and AMD FreeSync Premium Pro compatible. HDR600 certified with 98% DCI-P3 color coverage. Ergonomic stand with full tilt, swivel, pivot and height adjustment.',
    specs: [
      'Panel: 27" IPS, 4K UHD (3840x2160)',
      'Refresh Rate: 144Hz',
      'Response Time: 1ms (GtG)',
      'HDR: VESA DisplayHDR 600',
      'Color: 98% DCI-P3, 10-bit',
      'Sync: G-Sync Compatible, FreeSync Premium Pro',
      'Ports: 2x HDMI 2.1, 1x DisplayPort 1.4, 4x USB 3.0',
      'Stand: Tilt, Swivel, Pivot, Height Adjust'
    ]
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    category: 'Peripherals',
    price: 9995,
    originalPrice: 12999,
    rating: 4.8,
    reviews: 6784,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80',
    badge: 'Best Seller',
    description: 'The MX Master 3S is the ultimate mouse for creators and coders. Features an 8000 DPI sensor that works on any surface including glass. MagSpeed electromagnetic scroll wheel for ultra-fast precise scrolling. Connect up to 3 devices and switch instantly. USB-C charging with 1 min charge = 3 hours use. Ergonomic design reduces muscle strain by 10%.',
    specs: [
      'Sensor: Darkfield High Precision, 200–8000 DPI',
      'Scroll: MagSpeed Electromagnetic',
      'Buttons: 7 programmable',
      'Connectivity: Bluetooth, USB Receiver (Logi Bolt)',
      'Battery: 70 days on full charge',
      'Charging: USB-C, 1min = 3hrs',
      'Multi-device: Up to 3 devices',
      'Compatibility: Windows, macOS, Linux, iPadOS'
    ]
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Atlas connected');

    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully`);

    console.log('\nProducts added:');
    products.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} — ₹${p.price.toLocaleString('en-IN')}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seedProducts();
