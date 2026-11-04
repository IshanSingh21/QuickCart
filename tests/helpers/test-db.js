const { hashPasswordSync } = require('../../src/utils/password');
const { Prisma } = require('@prisma/client');

/**
 * Deterministic Test Database & Entity Harness
 *
 * Provides isolated setup, teardown, table truncation, and entity factories
 * for unit and integration testing.
 */

const TABLES_IN_TRUNCATE_ORDER = [
  'payments',
  'inventory_records',
  'order_items',
  'orders',
  'cart_items',
  'carts',
  'product_images',
  'products',
  'categories',
  'refresh_tokens',
  'users'
];

/**
 * Truncates all tables in reverse foreign-key order.
 * Works safely with real PostgreSQL test database or mock clients.
 * @param {Object} prisma
 */
async function truncateAllTables(prisma) {
  if (!prisma) return;

  // Real PostgreSQL connection
  if (typeof prisma.$executeRawUnsafe === 'function') {
    try {
      const truncateList = TABLES_IN_TRUNCATE_ORDER.map((t) => `"${t}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${truncateList} CASCADE;`);
      return;
    } catch (err) {
      // Fallback to table-by-table delete if TRUNCATE CASCADE fails or is restricted
      for (const table of TABLES_IN_TRUNCATE_ORDER) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
        } catch (e) {
          // ignore if table doesn't exist yet
        }
      }
      return;
    }
  }

  // Mock / In-memory fallback
  for (const model of [
    'payment',
    'inventory',
    'orderItem',
    'order',
    'cartItem',
    'cart',
    'productImage',
    'product',
    'category',
    'refreshToken',
    'user'
  ]) {
    if (prisma[model] && typeof prisma[model].deleteMany === 'function') {
      try {
        await prisma[model].deleteMany({});
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * Deterministic User Factory
 */
function createTestUser(overrides = {}) {
  const id = overrides.id || '11111111-1111-1111-1111-111111111111';
  return {
    id,
    email: overrides.email || `test-user-${id.substring(0, 8)}@example.com`,
    passwordHash: overrides.passwordHash || '$2b$04$DUMMY_HASH_FOR_TESTING_PURPOSES_ONLY_123456789012345678901',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'CUSTOMER',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date()
  };
}

/**
 * Deterministic Category Factory
 */
function createTestCategory(overrides = {}) {
  const id = overrides.id || '22222222-2222-2222-2222-222222222222';
  return {
    id,
    name: overrides.name || 'Electronics',
    slug: overrides.slug || 'electronics',
    description: overrides.description || 'Test category description',
    parentId: overrides.parentId || null,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date()
  };
}

/**
 * Deterministic Product Factory
 */
function createTestProduct(overrides = {}) {
  const id = overrides.id || '33333333-3333-3333-3333-333333333333';
  return {
    id,
    name: overrides.name || 'Mechanical Keyboard',
    slug: overrides.slug || 'mechanical-keyboard',
    description: overrides.description || 'High-end tactile keyboard',
    price: overrides.price !== undefined ? new Prisma.Decimal(overrides.price.toString()) : new Prisma.Decimal('99.99'),
    stock: overrides.stock !== undefined ? overrides.stock : 10,
    sku: overrides.sku || `SKU-${id.substring(0, 8)}`,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    version: overrides.version || 1,
    categoryId: overrides.categoryId || '22222222-2222-2222-2222-222222222222',
    category: overrides.category || {
      id: overrides.categoryId || '22222222-2222-2222-2222-222222222222',
      name: 'Electronics',
      slug: 'electronics'
    },
    images: overrides.images || [],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date()
  };
}

/**
 * Deterministic Cart Factory
 */
function createTestCart(userId, items = []) {
  const cartId = `cart-${userId.substring(0, 8)}`;
  return {
    id: cartId,
    userId,
    items: items.map((item, idx) => ({
      id: item.id || `cart-item-${idx + 1}`,
      cartId,
      productId: item.productId,
      quantity: item.quantity || 1,
      product: item.product || createTestProduct({ id: item.productId })
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = {
  TABLES_IN_TRUNCATE_ORDER,
  truncateAllTables,
  createTestUser,
  createTestCategory,
  createTestProduct,
  createTestCart
};
