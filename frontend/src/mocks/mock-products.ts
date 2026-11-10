/**
 * UI-only Mock Catalog Data
 * Isolated from production services for preview and design system presentation.
 * Uses high-availability curated Unsplash CDN URLs with automatic fallback resilience.
 */

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  itemCount: number;
  imageUrl: string;
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  originalPrice?: string;
  stock: number;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  badgeText?: string;
  badgeVariant?: 'new' | 'sale' | 'primary' | 'default';
  isTrending?: boolean;
  isNewArrival?: boolean;
}

export const MOCK_CATEGORIES: MockCategory[] = [
  {
    id: 'cat-audio',
    name: 'Audio & Acoustics',
    slug: 'audio',
    description: 'High-fidelity headphones, studio monitors, and acoustic systems.',
    itemCount: 18,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat-electronics',
    name: 'Computers & Displays',
    slug: 'electronics',
    description: 'Pro laptops, color-accurate monitors, and personal computing.',
    itemCount: 24,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat-accessories',
    name: 'Workspace & Peripherals',
    slug: 'accessories',
    description: 'Precision mice, ergonomic mechanical keyboards, and 140W power.',
    itemCount: 32,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
  }
];

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-sony-xm5',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    slug: 'sony-wh-1000xm5',
    sku: 'SONY-XM5-BLK',
    description: 'Industry-leading noise canceling headphones with 8 microphones, Auto NC Optimizer, and 30-hour battery life.',
    price: '349.99',
    originalPrice: '399.99',
    stock: 50,
    categoryId: 'cat-audio',
    categoryName: 'Audio',
    categorySlug: 'audio',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 148,
    badgeText: 'Trending',
    badgeVariant: 'primary',
    isTrending: true,
    isNewArrival: false
  },
  {
    id: 'prod-mbp-14',
    name: 'Apple MacBook Pro 14" (M3 Pro)',
    slug: 'macbook-pro-14-m3',
    sku: 'MBP-14-M3-SLV',
    description: 'Supercharged by M3 Pro with 18GB unified memory, 512GB SSD storage, and Liquid Retina XDR display.',
    price: '1999.00',
    stock: 25,
    categoryId: 'cat-electronics',
    categoryName: 'Electronics',
    categorySlug: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewCount: 82,
    badgeText: 'Flagship',
    badgeVariant: 'default',
    isTrending: true,
    isNewArrival: true
  },
  {
    id: 'prod-logi-mx3s',
    name: 'Logitech MX Master 3S Wireless Mouse',
    slug: 'logitech-mx-master-3s',
    sku: 'LOGI-MXM3S-GRY',
    description: 'Ergonomic performance wireless mouse with 8K DPI tracking on any surface, quiet clicks, and MagSpeed scrolling.',
    price: '99.99',
    stock: 100,
    categoryId: 'cat-accessories',
    categoryName: 'Accessories',
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 312,
    badgeText: 'Best Seller',
    badgeVariant: 'primary',
    isTrending: true,
    isNewArrival: false
  },
  {
    id: 'prod-anker-737',
    name: 'Anker 737 Power Bank (PowerCore 24K)',
    slug: 'anker-737-power-bank',
    sku: 'ANKER-737-PB',
    description: '24,000mAh 3-port portable charger with 140W fast-charging output and smart digital display.',
    price: '129.99',
    originalPrice: '149.99',
    stock: 75,
    categoryId: 'cat-accessories',
    categoryName: 'Accessories',
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1609592426508-cc0224d4957e?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewCount: 94,
    badgeText: 'Sale',
    badgeVariant: 'sale',
    isTrending: false,
    isNewArrival: true
  },
  {
    id: 'prod-bose-qc',
    name: 'Bose QuietComfort Ultra Earbuds',
    slug: 'bose-quietcomfort-ultra',
    sku: 'BOSE-QC-ULTRA',
    description: 'Spatial audio earbuds with world-class noise cancellation and CustomTune sound calibration technology.',
    price: '299.00',
    originalPrice: '349.00',
    stock: 18,
    categoryId: 'cat-audio',
    categoryName: 'Audio',
    categorySlug: 'audio',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 64,
    badgeText: 'New',
    badgeVariant: 'new',
    isTrending: true,
    isNewArrival: true
  },
  {
    id: 'prod-keychron-q1',
    name: 'Keychron Q1 Pro Wireless Mechanical Keyboard',
    slug: 'keychron-q1-pro',
    sku: 'KEYCH-Q1-PRO',
    description: '75% fully customizable QMK/VIA wireless mechanical keyboard with CNC machined aluminum body and double-gasket design.',
    price: '199.99',
    stock: 40,
    categoryId: 'cat-accessories',
    categoryName: 'Accessories',
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 115,
    badgeText: 'Pro Gear',
    badgeVariant: 'default',
    isTrending: false,
    isNewArrival: true
  },
  {
    id: 'prod-dell-32',
    name: 'Dell UltraSharp 32" 4K QD-OLED Monitor',
    slug: 'dell-ultrasharp-32-4k',
    sku: 'DELL-U3224KB',
    description: 'IPS Black technology display with 6K resolution, built-in 4K HDR webcam, and Thunderbolt 4 140W hub.',
    price: '899.00',
    originalPrice: '1099.00',
    stock: 12,
    categoryId: 'cat-electronics',
    categoryName: 'Electronics',
    categorySlug: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 42,
    badgeText: 'Sale',
    badgeVariant: 'sale',
    isTrending: true,
    isNewArrival: false
  },
  {
    id: 'prod-op1-field',
    name: 'Teenage Engineering OP-1 Field Synthesizer',
    slug: 'teenage-engineering-op1-field',
    sku: 'TE-OP1-FIELD',
    description: 'Portable all-in-one synthesizer, sampler and 4-track tape recorder with 100 new features and aluminum body.',
    price: '1999.00',
    stock: 6,
    categoryId: 'cat-audio',
    categoryName: 'Audio',
    categorySlug: 'audio',
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewCount: 28,
    badgeText: 'Rare',
    badgeVariant: 'default',
    isTrending: false,
    isNewArrival: true
  }
];
