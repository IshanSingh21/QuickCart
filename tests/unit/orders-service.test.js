const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  cart: {
    findUnique: jest.fn()
  },
  cartItem: {
    deleteMany: jest.fn()
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  inventory: {
    create: jest.fn()
  },
  $transaction: jest.fn((callback) =>
    callback({
      product: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      order: {
        create: jest.fn(),
        update: jest.fn()
      },
      inventory: {
        create: jest.fn()
      },
      cartItem: {
        deleteMany: jest.fn()
      }
    })
  )
}));

const prisma = require('../../src/lib/prisma');
const orderService = require('../../src/modules/orders/orders.service');
const AppError = require('../../src/utils/app-error');

describe('Orders Service', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  const orderId = '33333333-3333-3333-3333-333333333333';
  const cartId = '44444444-4444-4444-4444-444444444444';
  const productId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const productId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const validShippingAddress = {
    fullName: 'Jane Doe',
    addressLine1: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatOrder', () => {
    it('should format order financial fields and items with exact 2-decimal strings', () => {
      const rawOrder = {
        id: orderId,
        orderNumber: 'ORD-123456-ABCDE',
        userId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('199.98'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('199.98'),
        currency: 'USD',
        idempotencyKey: 'idemp-123',
        shippingAddress: validShippingAddress,
        items: [
          {
            id: 'item-1',
            productId: productId1,
            productName: 'Wireless Headphones',
            productSku: 'WH-100-BLK',
            unitPrice: new Prisma.Decimal('99.99'),
            quantity: 2,
            lineTotal: new Prisma.Decimal('199.98'),
            createdAt: new Date()
          }
        ],
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const formatted = orderService.formatOrder(rawOrder);

      expect(formatted.id).toBe(orderId);
      expect(formatted.subtotal).toBe('199.98');
      expect(formatted.totalAmount).toBe('199.98');
      expect(formatted.taxAmount).toBe('0.00');
      expect(formatted.itemCount).toBe(2);
      expect(formatted.items[0].unitPrice).toBe('99.99');
      expect(formatted.items[0].lineTotal).toBe('199.98');
    });

    it('should return null if order is null or undefined', () => {
      expect(orderService.formatOrder(null)).toBeNull();
    });
  });

  describe('checkout', () => {
    it('should throw 400 Bad Request when cart is empty or does not exist', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartId,
        userId,
        items: []
      });

      await expect(
        orderService.checkout(userId, { shippingAddress: validShippingAddress })
      ).rejects.toThrow(AppError);
    });

    it('should return existing order when identical idempotencyKey was previously processed', async () => {
      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-EXISTING-123',
        userId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('50.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('50.00'),
        currency: 'USD',
        idempotencyKey: 'idem-key-duplicate',
        shippingAddress: validShippingAddress,
        items: [],
        payments: []
      };

      prisma.order.findUnique.mockResolvedValueOnce(existingOrder);

      const result = await orderService.checkout(userId, {
        shippingAddress: validShippingAddress,
        idempotencyKey: 'idem-key-duplicate'
      });

      expect(result.isExisting).toBe(true);
      expect(result.order.id).toBe(orderId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw 409 Conflict if idempotencyKey was used by a different user', async () => {
      const otherUserOrder = {
        id: orderId,
        userId: otherUserId,
        idempotencyKey: 'idem-key-stolen'
      };

      prisma.order.findUnique.mockResolvedValueOnce(otherUserOrder);

      await expect(
        orderService.checkout(userId, {
          shippingAddress: validShippingAddress,
          idempotencyKey: 'idem-key-stolen'
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw 409 Conflict if product is inactive or unavailable', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartId,
        userId,
        items: [
          {
            id: 'c-item-1',
            productId: productId1,
            quantity: 1,
            product: { id: productId1, name: 'Inactive Item', price: '10.00', stock: 10, isActive: false }
          }
        ]
      });

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValueOnce({
              id: productId1,
              name: 'Inactive Item',
              isActive: false,
              stock: 10
            })
          }
        };
        return callback(tx);
      });

      await expect(
        orderService.checkout(userId, { shippingAddress: validShippingAddress })
      ).rejects.toThrow(AppError);
    });

    it('should throw 409 Conflict if product has insufficient stock', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartId,
        userId,
        items: [
          {
            id: 'c-item-1',
            productId: productId1,
            quantity: 5,
            product: { id: productId1, name: 'Low Stock Item', price: '10.00', stock: 2, isActive: true }
          }
        ]
      });

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValueOnce({
              id: productId1,
              name: 'Low Stock Item',
              isActive: true,
              stock: 2
            })
          }
        };
        return callback(tx);
      });

      await expect(
        orderService.checkout(userId, { shippingAddress: validShippingAddress })
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('should successfully checkout, snapshot prices, decrement stock, and clear cart', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartId,
        userId,
        items: [
          {
            id: 'c-item-1',
            productId: productId1,
            quantity: 2,
            product: { id: productId1, name: 'Keyboard', price: '45.00', stock: 10, isActive: true }
          }
        ]
      });

      const mockOrderCreated = {
        id: orderId,
        orderNumber: 'ORD-SUCCESS-1',
        userId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('90.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('90.00'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: [
          {
            id: 'oi-1',
            productId: productId1,
            productName: 'Keyboard',
            productSku: 'KB-01',
            unitPrice: new Prisma.Decimal('45.00'),
            quantity: 2,
            lineTotal: new Prisma.Decimal('90.00'),
            createdAt: new Date()
          }
        ]
      };

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValueOnce({
              id: productId1,
              name: 'Keyboard',
              sku: 'KB-01',
              price: new Prisma.Decimal('45.00'),
              stock: 10,
              isActive: true
            }),
            update: jest.fn().mockResolvedValueOnce({
              id: productId1,
              stock: 8
            })
          },
          inventory: {
            create: jest.fn().mockResolvedValueOnce({})
          },
          order: {
            create: jest.fn().mockResolvedValueOnce(mockOrderCreated)
          },
          cartItem: {
            deleteMany: jest.fn().mockResolvedValueOnce({ count: 1 })
          }
        };
        return callback(tx);
      });

      const result = await orderService.checkout(userId, {
        shippingAddress: validShippingAddress
      });

      expect(result.isExisting).toBe(false);
      expect(result.order.subtotal).toBe('90.00');
      expect(result.order.totalAmount).toBe('90.00');
      expect(result.order.items[0].unitPrice).toBe('45.00');
      expect(result.order.items[0].lineTotal).toBe('90.00');
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated user orders sorted by createdAt desc', async () => {
      const mockOrders = [
        {
          id: orderId,
          orderNumber: 'ORD-1',
          userId,
          status: 'PENDING_PAYMENT',
          subtotal: new Prisma.Decimal('30.00'),
          taxAmount: new Prisma.Decimal('0.00'),
          shippingAmount: new Prisma.Decimal('0.00'),
          totalAmount: new Prisma.Decimal('30.00'),
          currency: 'USD',
          shippingAddress: validShippingAddress,
          items: []
        }
      ];

      prisma.order.findMany.mockResolvedValueOnce(mockOrders);
      prisma.order.count.mockResolvedValueOnce(1);

      const result = await orderService.getUserOrders(userId, { page: 1, limit: 10 });

      expect(result.orders.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    it('should clamp excessive page limit to 50', async () => {
      prisma.order.findMany.mockResolvedValueOnce([]);
      prisma.order.count.mockResolvedValueOnce(0);

      const result = await orderService.getUserOrders(userId, { page: 1, limit: 1000 });

      expect(result.meta.limit).toBe(50);
    });
  });

  describe('getOrderById (IDOR Protection)', () => {
    it('should return order when owned by requesting user', async () => {
      const mockOrder = {
        id: orderId,
        orderNumber: 'ORD-1',
        userId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('30.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('30.00'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: []
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      const result = await orderService.getOrderById(userId, orderId, 'CUSTOMER');
      expect(result.id).toBe(orderId);
    });

    it('should throw 404 Not Found when order belongs to a different user (IDOR prevention)', async () => {
      const mockOtherOrder = {
        id: orderId,
        userId: otherUserId
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockOtherOrder);

      await expect(
        orderService.getOrderById(userId, orderId, 'CUSTOMER')
      ).rejects.toThrow(AppError);
    });

    it('should allow ADMIN to retrieve any order regardless of ownership', async () => {
      const mockOtherOrder = {
        id: orderId,
        userId: otherUserId,
        status: 'PAID',
        subtotal: new Prisma.Decimal('100.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('100.00'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: []
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockOtherOrder);

      const result = await orderService.getOrderById(userId, orderId, 'ADMIN');
      expect(result.id).toBe(orderId);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel PENDING_PAYMENT order and restock inventory', async () => {
      const mockOrder = {
        id: orderId,
        orderNumber: 'ORD-CANCEL-1',
        userId,
        status: 'PENDING_PAYMENT',
        items: [
          {
            productId: productId1,
            quantity: 3
          }
        ]
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          order: {
            update: jest.fn().mockResolvedValueOnce({
              ...mockOrder,
              status: 'CANCELLED',
              subtotal: new Prisma.Decimal('90.00'),
              taxAmount: new Prisma.Decimal('0.00'),
              shippingAmount: new Prisma.Decimal('0.00'),
              totalAmount: new Prisma.Decimal('90.00'),
              currency: 'USD',
              shippingAddress: validShippingAddress,
              items: []
            })
          },
          product: {
            update: jest.fn().mockResolvedValueOnce({
              id: productId1,
              stock: 13
            })
          },
          inventory: {
            create: jest.fn().mockResolvedValueOnce({})
          }
        };
        return callback(tx);
      });

      const result = await orderService.cancelOrder(userId, orderId, 'CUSTOMER');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw 400 Bad Request if order is not in PENDING_PAYMENT status', async () => {
      const mockPaidOrder = {
        id: orderId,
        userId,
        status: 'PAID'
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockPaidOrder);

      await expect(
        orderService.cancelOrder(userId, orderId, 'CUSTOMER')
      ).rejects.toThrow(/Cannot cancel order/);
    });
  });
});
