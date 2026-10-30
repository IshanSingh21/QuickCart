const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn()
  },
  productImage: {
    deleteMany: jest.fn(),
    createMany: jest.fn()
  },
  $transaction: jest.fn((callback) => callback({
    product: {
      update: jest.fn()
    },
    productImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    }
  }))
}));

const prisma = require('../../src/lib/prisma');
const productsService = require('../../src/modules/products/products.service');
const AppError = require('../../src/utils/app-error');

describe('Products Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listProducts', () => {
    it('should enforce isActive=true for public / unauthenticated visitors', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Noise-Cancelling Headphones',
          slug: 'noise-cancelling-headphones',
          price: new Prisma.Decimal(299.99),
          isActive: true
        }
      ]);

      const result = await productsService.listProducts({ page: 1, limit: 10 }, null);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      );
      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe('299.99');
    });

    it('should allow ADMIN to query inactive products', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const adminUser = { id: 'admin-id', role: 'ADMIN' };
      await productsService.listProducts({ isActive: 'false' }, adminUser);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false })
        })
      );
    });

    it('should clamp limit to maxPageSize (50) to prevent unbounded queries', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await productsService.listProducts({ limit: 1000 }, null);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
      expect(result.meta.limit).toBe(50);
    });

    it('should apply price range filters', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await productsService.listProducts({ minPrice: 50, maxPrice: 150 }, null);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: {
              gte: new Prisma.Decimal(50),
              lte: new Prisma.Decimal(150)
            }
          })
        })
      );
    });

    it('should resolve category slug and subcategories for filtering', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'cat-parent',
        slug: 'electronics',
        children: [{ id: 'cat-child-1' }, { id: 'cat-child-2' }]
      });
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await productsService.listProducts({ category: 'electronics' }, null);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ['cat-parent', 'cat-child-1', 'cat-child-2'] }
          })
        })
      );
    });
  });

  describe('getProductById & getProductBySlug', () => {
    it('should return active product for public user', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Headphones',
        slug: 'headphones',
        price: new Prisma.Decimal(199.99),
        isActive: true
      });

      const product = await productsService.getProductById('prod-1', null);
      expect(product.id).toBe('prod-1');
      expect(product.price).toBe('199.99');
    });

    it('should hide inactive product (throw 404) from public / customer user', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-2',
        name: 'Discontinued Phone',
        slug: 'discontinued-phone',
        price: new Prisma.Decimal(99.99),
        isActive: false
      });

      await expect(productsService.getProductById('prod-2', null)).rejects.toThrow(
        'Product not found'
      );
      await expect(
        productsService.getProductById('prod-2', { id: 'user-1', role: 'CUSTOMER' })
      ).rejects.toThrow('Product not found');
    });

    it('should allow ADMIN to retrieve inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-2',
        name: 'Discontinued Phone',
        slug: 'discontinued-phone',
        price: new Prisma.Decimal(99.99),
        isActive: false
      });

      const product = await productsService.getProductById('prod-2', {
        id: 'admin-id',
        role: 'ADMIN'
      });
      expect(product.id).toBe('prod-2');
      expect(product.isActive).toBe(false);
    });

    it('should throw 404 when product slug is not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(productsService.getProductBySlug('nonexistent-slug', null)).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('createProduct', () => {
    it('should create product with auto-generated slug and normalized SKU', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Audio' });
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'new-prod',
        name: 'Wireless Earbuds',
        slug: 'wireless-earbuds',
        sku: 'AUDIO-EAR-001',
        price: new Prisma.Decimal(79.99),
        stock: 10,
        isActive: true
      });

      const result = await productsService.createProduct({
        name: 'Wireless Earbuds',
        sku: 'audio-ear-001',
        description: 'Great sound',
        price: 79.99,
        stock: 10,
        categoryId: 'cat-1'
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'wireless-earbuds',
            sku: 'AUDIO-EAR-001',
            price: new Prisma.Decimal(79.99)
          })
        })
      );
      expect(result.id).toBe('new-prod');
    });

    it('should throw 404 if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        productsService.createProduct({
          name: 'Item',
          sku: 'SKU-1',
          description: 'Desc',
          price: 10,
          categoryId: 'nonexistent-cat'
        })
      ).rejects.toThrow('Category not found');
    });

    it('should throw 409 if product slug already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.product.findUnique.mockResolvedValueOnce({ id: 'other', slug: 'existing-item' });

      await expect(
        productsService.createProduct({
          name: 'Existing Item',
          sku: 'SKU-NEW',
          description: 'Desc',
          price: 10,
          categoryId: 'cat-1'
        })
      ).rejects.toThrow('Product with slug');
    });

    it('should throw 409 if product SKU already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'other', sku: 'SKU-DUPLICATE' }); // sku check

      await expect(
        productsService.createProduct({
          name: 'New Item',
          sku: 'SKU-DUPLICATE',
          description: 'Desc',
          price: 10,
          categoryId: 'cat-1'
        })
      ).rejects.toThrow('Product with SKU');
    });
  });

  describe('deleteProduct', () => {
    it('should soft-delete product if referenced in orders or carts', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-with-orders',
        _count: { orderItems: 3, cartItems: 0 }
      });
      prisma.product.update.mockResolvedValue({ id: 'prod-with-orders', isActive: false });

      const result = await productsService.deleteProduct('prod-with-orders');

      expect(result.softDeleted).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-with-orders' },
        data: { isActive: false }
      });
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('should hard-delete product if completely unreferenced', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-unused',
        _count: { orderItems: 0, cartItems: 0 }
      });
      prisma.product.delete.mockResolvedValue({ id: 'prod-unused' });

      const result = await productsService.deleteProduct('prod-unused');

      expect(result.softDeleted).toBe(false);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-unused' }
      });
    });

    it('should throw 404 if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(productsService.deleteProduct('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });
  });
});
