import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../lib/api-client';
import { authService } from '../auth.service';
import { productsService } from '../products.service';
import { categoriesService } from '../categories.service';
import { cartService } from '../cart.service';
import { ordersService } from '../orders.service';
import { paymentsService } from '../payments.service';
import { healthService } from '../health.service';
import { useAuthStore } from '../../store/auth-store';
import { User, Category, Product, Cart, Order, Payment, HealthStatus } from '../../types';

describe('Phase 8: API Services & Client Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession();
  });

  describe('Health Service', () => {
    it('queries backend health endpoint and unpacks status payload', async () => {
      const mockHealth: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 3600,
        environment: 'development',
        version: '0.1.0',
        memory: { rssMb: 50, heapUsedMb: 30, heapTotalMb: 40 },
        database: { status: 'connected', latencyMs: 4 },
        redis: { status: 'connected', latencyMs: 1 }
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Health OK', data: mockHealth }
      });

      const result = await healthService.getHealthStatus();

      expect(apiClient.get).toHaveBeenCalledWith('/health');
      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('connected');
      expect(result.redis.status).toBe('connected');
    });
  });

  describe('Categories Service', () => {
    it('retrieves hierarchical category tree', async () => {
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: null,
          parentId: null,
          children: []
        }
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Categories retrieved', data: mockCategories }
      });

      const result = await categoriesService.listCategories(true);

      expect(apiClient.get).toHaveBeenCalledWith('/categories', {
        params: { tree: 'true' }
      });
      expect(result).toEqual(mockCategories);
    });

    it('retrieves single category by id', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        description: null,
        parentId: null
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Category found', data: mockCategory }
      });

      const result = await categoriesService.getCategoryById('cat-1');

      expect(apiClient.get).toHaveBeenCalledWith('/categories/cat-1');
      expect(result.name).toBe('Electronics');
    });
  });

  describe('Products Service', () => {
    it('properly serializes catalogue discovery query params', async () => {
      const mockResponse = {
        items: [] as Product[],
        total: 0,
        page: 2,
        limit: 12,
        totalPages: 0
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          statusCode: 200,
          message: 'Products list',
          data: mockResponse.items,
          meta: { page: 2, limit: 12, total: 0, totalPages: 0 }
        }
      });

      const queryParams = {
        page: 2,
        limit: 12,
        category: 'electronics',
        search: 'wireless keyboard',
        minPrice: 50,
        maxPrice: 200,
        sortBy: 'price' as const,
        order: 'asc' as const
      };

      const result = await productsService.listProducts(queryParams);

      expect(apiClient.get).toHaveBeenCalledWith('/products', {
        params: {
          page: 2,
          limit: 12,
          category: 'electronics',
          search: 'wireless keyboard',
          minPrice: 50,
          maxPrice: 200,
          sortBy: 'price',
          order: 'asc'
        }
      });
      expect(result.meta?.page).toBe(2);
    });

    it('fetches product by slug', async () => {
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Pro Wireless Mouse',
        slug: 'pro-wireless-mouse',
        description: 'Ultra-fast ergonomic mouse',
        price: '79.99',
        sku: 'MOU-PRO-01',
        stock: 15,
        version: 1,
        categoryId: 'cat-1',
        isActive: true,
        images: [
          {
            id: 'img-1',
            productId: 'prod-1',
            url: 'https://cdn.example.com/mouse.jpg',
            altText: 'Pro Wireless Mouse',
            isPrimary: true,
            sortOrder: 0
          }
        ],
        category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Product found', data: mockProduct }
      });

      const result = await productsService.getProductBySlug('pro-wireless-mouse');

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/pro-wireless-mouse');
      expect(result.name).toBe('Pro Wireless Mouse');
      expect(result.stock).toBe(15);
    });
  });

  describe('Cart Service', () => {
    it('manages cart item lifecycle (fetch, add, update, remove, clear)', async () => {
      const mockCart: Cart = {
        cartId: 'cart-1',
        items: [
          {
            itemId: 'ci-1',
            productId: 'prod-1',
            name: 'Mechanical Keyboard',
            slug: 'mechanical-keyboard',
            sku: 'KEY-01',
            currentPrice: '99.99',
            quantity: 2,
            lineTotal: '199.98',
            availableStock: 10,
            isActive: true,
            isAvailable: true,
            category: null,
            image: null
          }
        ],
        subtotal: '199.98',
        itemCount: 2,
        distinctCount: 1
      };

      // 1. getCart
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Cart fetched', data: mockCart }
      });
      const cart = await cartService.getCart();
      expect(apiClient.get).toHaveBeenCalledWith('/cart');
      expect(cart.items).toHaveLength(1);

      // 2. addItem
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Item added', data: mockCart }
      });
      await cartService.addItem('prod-1', 2);
      expect(apiClient.post).toHaveBeenCalledWith('/cart/items', { productId: 'prod-1', quantity: 2 });

      // 3. updateItemQuantity
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Item updated', data: mockCart }
      });
      await cartService.updateItemQuantity('ci-1', 3);
      expect(apiClient.patch).toHaveBeenCalledWith('/cart/items/ci-1', { quantity: 3 });

      // 4. removeItem
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Item removed', data: mockCart }
      });
      await cartService.removeItem('ci-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/cart/items/ci-1');

      // 5. clearCart
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: {
          success: true,
          statusCode: 200,
          message: 'Cart cleared',
          data: { cartId: 'cart-1', items: [], subtotal: '0.00', itemCount: 0, distinctCount: 0 }
        }
      });
      const emptyCart = await cartService.clearCart();
      expect(apiClient.delete).toHaveBeenCalledWith('/cart');
      expect(emptyCart.items).toHaveLength(0);
    });
  });

  describe('Orders Service', () => {
    it('attaches Idempotency-Key header when checking out an order', async () => {
      const mockOrder: Partial<Order> = {
        id: 'ord-123',
        orderNumber: 'ORD-2026-TEST',
        status: 'PENDING_PAYMENT',
        totalAmount: '199.98'
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, statusCode: 201, message: 'Order created', data: { order: mockOrder } }
      });

      const payload = {
        shippingAddress: {
          fullName: 'John Doe',
          addressLine1: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'United States'
        },
        idempotencyKey: 'idemp-checkout-key-999'
      };

      const order = await ordersService.checkout(payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/orders/checkout',
        payload,
        {
          headers: {
            'Idempotency-Key': 'idemp-checkout-key-999'
          }
        }
      );
      expect(order.id).toBe('ord-123');
    });

    it('cancels pending order and triggers restock', async () => {
      const mockCancelledOrder: Partial<Order> = {
        id: 'ord-123',
        status: 'CANCELLED'
      };

      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Order cancelled', data: { order: mockCancelledOrder } }
      });

      const result = await ordersService.cancelOrder('ord-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/orders/ord-123/cancel');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('Payments Service', () => {
    it('submits simulated payment with method and idempotency key', async () => {
      const mockPaymentResult = {
        payment: {
          id: 'pay-1',
          orderId: 'ord-123',
          paymentIntentId: 'pi_sim_111222',
          idempotencyKey: 'idemp_pay_key_1',
          provider: 'SIMULATED',
          status: 'SUCCEEDED' as const,
          amount: '199.98',
          currency: 'USD',
          gatewayResponse: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        orderStatus: 'PAID' as const,
        isIdempotentReplay: false
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Payment processed', data: mockPaymentResult }
      });

      const payload = {
        paymentMethod: 'SIMULATED_CARD' as const,
        simulateOutcome: 'SUCCESS' as const,
        idempotencyKey: 'idemp_pay_key_1'
      };

      const result = await paymentsService.processPayment('ord-123', payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/payments/orders/ord-123/pay',
        payload,
        {
          headers: {
            'Idempotency-Key': 'idemp_pay_key_1'
          }
        }
      );
      expect(result.orderStatus).toBe('PAID');
      expect(result.payment.status).toBe('SUCCEEDED');
    });

    it('retrieves payment attempts ledger for an order', async () => {
      const mockPayments: Payment[] = [
        {
          id: 'pay-1',
          orderId: 'ord-123',
          paymentIntentId: 'pi_sim_111',
          idempotencyKey: 'idemp_1',
          provider: 'SIMULATED',
          status: 'SUCCEEDED',
          amount: '199.98',
          currency: 'USD',
          gatewayResponse: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Payments retrieved', data: mockPayments }
      });

      const result = await paymentsService.getOrderPayments('ord-123');

      expect(apiClient.get).toHaveBeenCalledWith('/payments/orders/ord-123');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('SUCCEEDED');
    });
  });

  describe('Auth Service', () => {
    it('executes login and returns user with dual-token set', async () => {
      const mockUser: User = {
        id: 'usr-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockAuthData = {
        user: mockUser,
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 900
        }
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Login successful', data: mockAuthData }
      });

      const result = await authService.login({ email: 'test@example.com', password: 'Password123!' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Password123!'
      });
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('test-access-token');
    });

    it('verifies admin role barrier at /auth/admin-check', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          statusCode: 200,
          message: 'Admin access verified',
          data: {
            authorized: true,
            user: { id: 'admin-1', email: 'admin@quickcart.com', role: 'ADMIN' }
          }
        }
      });

      const result = await authService.checkAdminAccess();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/admin-check');
      expect(result.authorized).toBe(true);
      expect(result.user.role).toBe('ADMIN');
    });

    it('logs out caller and passes _skipAuthRefresh flag to prevent refresh loops', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, statusCode: 200, message: 'Logged out successfully' }
      });

      await authService.logout('test-refresh-token');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/logout',
        { refreshToken: 'test-refresh-token' },
        { _skipAuthRefresh: true }
      );
    });
  });
});
