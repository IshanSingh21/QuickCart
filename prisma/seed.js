/**
 * QuickCart Database Seeding Script
 * Populates PostgreSQL database with idempotent demo data:
 * - Admin and customer users with securely hashed credentials
 * - Product categories
 * - Production-like products with prices, inventory stock, and product images
 *
 * Usage:
 *   node prisma/seed.js
 *   npm run prisma:seed
 */

const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Starting QuickCart database seeding...');

  // -------------------------------------------------------------
  // 1. Seed Users (Admin & Customer)
  // -------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);
  const customerPasswordHash = await bcrypt.hash('CustomerPass123!', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quickcart.com' },
    update: {},
    create: {
      email: 'admin@quickcart.com',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
      isActive: true
    }
  });
  console.log(`  ✓ Seeded Admin User: ${admin.email} (Role: ${admin.role})`);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@quickcart.com' },
    update: {},
    create: {
      email: 'customer@quickcart.com',
      passwordHash: customerPasswordHash,
      firstName: 'Jane',
      lastName: 'Customer',
      role: Role.CUSTOMER,
      isActive: true
    }
  });
  console.log(`  ✓ Seeded Customer User: ${customer.email} (Role: ${customer.role})`);

  // -------------------------------------------------------------
  // 2. Seed Categories
  // -------------------------------------------------------------
  const categoriesData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Cutting-edge consumer electronics, gadgets, and personal computing hardware.'
    },
    {
      name: 'Audio',
      slug: 'audio',
      description: 'High-fidelity headphones, studio monitors, wireless earbuds, and speakers.'
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Essential tech peripherals, charging solutions, cables, and daily accessories.'
    }
  ];

  const categories = {};
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description
      }
    });
    categories[cat.slug] = category;
    console.log(`  ✓ Seeded Category: ${category.name} [/${category.slug}]`);
  }

  // -------------------------------------------------------------
  // 3. Seed Products with Images and Stock
  // -------------------------------------------------------------
  const productsData = [
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5',
      sku: 'SONY-XM5-BLK',
      description: 'Industry-leading noise canceling headphones with dual processors, 8 microphones, and ultra-comfortable lightweight design.',
      price: '349.99',
      stock: 50,
      categoryId: categories['audio'].id,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      imageAlt: 'Sony WH-1000XM5 Wireless Headphones in Black'
    },
    {
      name: 'Apple MacBook Pro 14" (M3 Pro)',
      slug: 'macbook-pro-14-m3',
      sku: 'MBP-14-M3-SLV',
      description: 'Supercharged by M3 Pro with 18GB unified memory, 512GB SSD storage, Liquid Retina XDR display, and up to 18 hours battery life.',
      price: '1999.00',
      stock: 25,
      categoryId: categories['electronics'].id,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      imageAlt: 'Apple MacBook Pro 14 Inch Laptop'
    },
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      slug: 'logitech-mx-master-3s',
      sku: 'LOGI-MXM3S-GRY',
      description: 'Ergonomic performance wireless mouse with 8K DPI tracking on any surface, quiet clicks, and MagSpeed electromagnetic scrolling.',
      price: '99.99',
      stock: 100,
      categoryId: categories['accessories'].id,
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
      imageAlt: 'Logitech MX Master 3S Mouse on Desk'
    },
    {
      name: 'Anker 737 Power Bank (PowerCore 24K)',
      slug: 'anker-737-power-bank',
      sku: 'ANKER-737-PB',
      description: '24,000mAh 3-port portable charger with 140W fast-charging output, smart digital display, and PowerIQ 4.0 technology.',
      price: '129.99',
      stock: 75,
      categoryId: categories['accessories'].id,
      imageUrl: 'https://images.unsplash.com/photo-1609592426508-cc0224d4957e?w=800&q=80',
      imageAlt: 'Anker Fast Charging Portable Power Bank'
    }
  ];

  for (const prod of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        stock: prod.stock,
        categoryId: prod.categoryId,
        isActive: true
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku,
        description: prod.description,
        price: prod.price,
        stock: prod.stock,
        categoryId: prod.categoryId,
        isActive: true,
        images: {
          create: [
            {
              url: prod.imageUrl,
              altText: prod.imageAlt,
              isPrimary: true,
              sortOrder: 0
            }
          ]
        }
      }
    });

    // Ensure primary image exists if product already existed
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id }
    });
    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: prod.imageUrl,
          altText: prod.imageAlt,
          isPrimary: true,
          sortOrder: 0
        }
      });
    }

    console.log(`  ✓ Seeded Product: ${product.name} [SKU: ${product.sku}] ($${prod.price}, Stock: ${prod.stock})`);
  }

  console.log('✅ QuickCart database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
