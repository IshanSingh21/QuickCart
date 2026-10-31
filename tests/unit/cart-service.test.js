const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  cart: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  cartItem: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  product: {
    findUnique: jest.fn()
  },
  $transaction: jest.fn((callback) =>
    callback({
      cart: {
        findUnique: jest.fn(),
        create: jest.fn()
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn()
      },
      product: {
        findUnique: jest.fn()
      }
    })
  )
}));

const prisma = require('../../src/lib/prisma');
const cartService = require('../../src/modules/cart/cart.service');
const AppError = require('../../src/utils/app-error');

describe('Cart Service', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const cartId = '22222222-2222-2222-2222-222222222222';
  const productId = '33333333-3333-3333-3333-333333333333';
  const itemId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatCart (Server-Side Price Authority)', () => {
    it('should compute exact decimal line totals and subtotals without floating-point error', () => {
      const mockCart = {
        id: cartId,
        items: [
          {
            id: 'item-1',
            quantity: 3,
            product: {
              id: 'prod-1',
              name: 'Item 1',
              slug: 'item-1',
              sku: 'SKU-1',
              price: new Prisma.Decimal(19.99),
              stock: 10,
              isActive: true,
              images: [{ url: 'https://img.test/1.jpg' }]
            }
          },
          {
            id: 'item-2',
            quantity: 2,
            product: {
              id: 'prod-2',
              name: 'Item 2',
              slug: 'item-2',
              sku: 'SKU-2',
              price: new Prisma.Decimal(49.95),
              stock: 5,
              isActive: true,
              images: []
            }
          }
        ]
      };

      const result = cartService.formatCart(mockCart);

      expect(result.cartId).toBe(cartId);
      expect(result.items).toHaveLength(2);
      // Item 1: 19.99 * 3 = 59.97
      expect(result.items[0].currentPrice).toBe('19.99');
      expect(result.items[0].lineTotal).toBe('59.97');
      expect(result.items[0].isAvailable).toBe(true);

      // Item 2: 49.95 * 2 = 99.90
      expect(result.items[1].currentPrice).toBe('49.95');
      expect(result.items[1].lineTotal).toBe('99.90');

      // Subtotal: 59.97 + 99.90 = 159.87
      expect(result.subtotal).toBe('159.87');
      expect(result.itemCount).toBe(5);
      expect(result.distinctCount).toBe(2);
    });

    it('should flag item as unavailable if product is inactive or stock is insufficient', () => {
      const mockCart = {
        id: cartId,
        items: [
          {
            id: 'item-1',
            quantity: 5,
            product: {
              id: 'prod-1',
              name: 'Item 1',
              price: new Prisma.Decimal(10.0),
              stock: 2, // Less than quantity
              isActive: true
            }
          },
          {
            id: 'item-2',
            quantity: 1,
            product: {
              id: 'prod-2',
              name: 'Item 2',
              price: new Prisma.Decimal(15.0),
              stock: 10,
              isActive: false // Inactive
            }
          }
        ]
      };

      const result = cartService.formatCart(mockCart);

      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[1].isAvailable).toBe(false);
    });
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart if already created', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: cartId, userId });

      const cart = await cartService.getOrCreateCart(userId);
      expect(cart.id).toBe(cartId);
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('should create new cart if none exists for the user', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({ id: cartId, userId });

      const cart = await cartService.getOrCreateCart(userId);
      expect(cart.id).toBe(cartId);
      expect(prisma.cart.create).toHaveBeenCalledWith({ data: { userId } });
    });
  });

  describe('addItem', () => {
    it('should add a new product to cart when stock is sufficient', async () => {
      const mockProduct = {
        id: productId,
        name: 'Headphones',
        price: new Prisma.Decimal(199.99),
        stock: 10,
        isActive: true
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(mockProduct) },
          cart: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({ id: cartId, userId })
              .mockResolvedValueOnce({
                id: cartId,
                userId,
                items: [
                  {
                    id: itemId,
                    quantity: 2,
                    product: mockProduct
                  }
                ]
              })
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: itemId })
          }
        };
        return callback(tx);
      });

      const result = await cartService.addItem(userId, { productId, quantity: 2 });

      expect(result.cartId).toBe(cartId);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.subtotal).toBe('399.98');
    });

    it('should throw 404 if product does not exist or is inactive', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(null) }
        };
        return callback(tx);
      });

      await expect(
        cartService.addItem(userId, { productId: 'unknown-prod', quantity: 1 })
      ).rejects.toThrow('Product not found or currently unavailable');
    });

    it('should throw 409 Conflict if requested quantity exceeds available stock', async () => {
      const mockProduct = {
        id: productId,
        stock: 3,
        isActive: true
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(mockProduct) },
          cart: { findUnique: jest.fn().mockResolvedValue({ id: cartId, userId }) },
          cartItem: { findUnique: jest.fn().mockResolvedValue(null) }
        };
        return callback(tx);
      });

      await expect(
        cartService.addItem(userId, { productId, quantity: 5 })
      ).rejects.toThrow('exceeds available stock');
    });

    it('should accumulate quantity if product is already in cart', async () => {
      const mockProduct = {
        id: productId,
        stock: 10,
        isActive: true,
        price: new Prisma.Decimal(25.0)
      };

      let updatedQuantity;
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(mockProduct) },
          cart: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({ id: cartId, userId })
              .mockResolvedValueOnce({
                id: cartId,
                userId,
                items: [{ id: itemId, quantity: 5, product: mockProduct }]
              })
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({ id: itemId, quantity: 2 }),
            update: jest.fn().mockImplementation(({ data }) => {
              updatedQuantity = data.quantity;
            })
          }
        };
        return callback(tx);
      });

      await cartService.addItem(userId, { productId, quantity: 3 });

      expect(updatedQuantity).toBe(5); // 2 existing + 3 new
    });
  });

  describe('updateItemQuantity', () => {
    it('should throw 404 if cart item does not belong to the authenticated user (Ownership)', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemId,
              cart: { userId: 'other-user-uuid' } // Belongs to different user!
            })
          }
        };
        return callback(tx);
      });

      await expect(
        cartService.updateItemQuantity(userId, itemId, 3)
      ).rejects.toThrow('Cart item not found');
    });

    it('should throw 409 Conflict if requested quantity exceeds product stock', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemId,
              cart: { userId },
              product: { stock: 2, isActive: true }
            })
          }
        };
        return callback(tx);
      });

      await expect(
        cartService.updateItemQuantity(userId, itemId, 10)
      ).rejects.toThrow('exceeds available stock');
    });

    it('should update quantity successfully when valid and owned', async () => {
      const mockProduct = {
        id: productId,
        name: 'Item',
        price: new Prisma.Decimal(50.0),
        stock: 20,
        isActive: true
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemId,
              cartId,
              cart: { userId },
              product: mockProduct
            }),
            update: jest.fn()
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue({
              id: cartId,
              items: [{ id: itemId, quantity: 4, product: mockProduct }]
            })
          }
        };
        return callback(tx);
      });

      const result = await cartService.updateItemQuantity(userId, itemId, 4);

      expect(result.items[0].quantity).toBe(4);
      expect(result.subtotal).toBe('200.00');
    });
  });

  describe('removeItem', () => {
    it('should throw 404 if item belongs to another user', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemId,
              cart: { userId: 'different-user' }
            })
          }
        };
        return callback(tx);
      });

      await expect(cartService.removeItem(userId, itemId)).rejects.toThrow('Cart item not found');
    });

    it('should delete item if owned by user', async () => {
      let deleted = false;
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemId,
              cartId,
              cart: { userId }
            }),
            delete: jest.fn().mockImplementation(() => {
              deleted = true;
            })
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue({
              id: cartId,
              items: []
            })
          }
        };
        return callback(tx);
      });

      const result = await cartService.removeItem(userId, itemId);

      expect(deleted).toBe(true);
      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe('0.00');
    });
  });

  describe('clearCart', () => {
    it('should delete all cart items and return empty cart envelope', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: cartId, userId });
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      const result = await cartService.clearCart(userId);

      expect(result.cartId).toBe(cartId);
      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe('0.00');
      expect(result.itemCount).toBe(0);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId }
      });
    });
  });
});
