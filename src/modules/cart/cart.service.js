const { Prisma } = require('@prisma/client');
const prisma = require('../../lib/prisma');
const AppError = require('../../utils/app-error');

class CartService {
  /**
   * Formats a raw cart query result with authoritative live product pricing
   * Enforces Server-Side Price Authority: line totals and subtotal are calculated dynamically.
   * @param {Object} cart
   */
  formatCart(cart) {
    if (!cart) return null;

    let subtotalDecimal = new Prisma.Decimal(0);
    let totalItemCount = 0;

    const formattedItems = (cart.items || []).map((item) => {
      const product = item.product;
      const unitPriceDecimal = new Prisma.Decimal(product.price);
      const lineTotalDecimal = unitPriceDecimal.mul(item.quantity);
      subtotalDecimal = subtotalDecimal.add(lineTotalDecimal);
      totalItemCount += item.quantity;

      const isAvailable = product.isActive && product.stock >= item.quantity;

      return {
        itemId: item.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        currentPrice: unitPriceDecimal.toFixed(2),
        quantity: item.quantity,
        lineTotal: lineTotalDecimal.toFixed(2),
        availableStock: product.stock,
        isActive: product.isActive,
        isAvailable,
        category: product.category || null,
        image: product.images && product.images.length > 0 ? product.images[0].url : null
      };
    });

    return {
      cartId: cart.id,
      items: formattedItems,
      subtotal: subtotalDecimal.toFixed(2),
      itemCount: totalItemCount,
      distinctCount: formattedItems.length
    };
  }

  /**
   * Ensure user has an active cart record
   * @param {string} userId - Authenticated user UUID
   * @param {Object} tx - Optional Prisma transaction client
   */
  async getOrCreateCart(userId, tx = prisma) {
    let cart = await tx.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId }
      });
    }

    return cart;
  }

  /**
   * Fetch full cart details with live prices and item availability
   * @param {string} userId - Authenticated user UUID
   */
  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    const fullCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                  take: 1
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return this.formatCart(fullCart);
  }

  /**
   * Add item to cart with stock validation and server-side price lookup
   * @param {string} userId - Authenticated user UUID
   * @param {Object} data - { productId, quantity }
   */
  async addItem(userId, { productId, quantity = 1 }) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify product exists and is active
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product || !product.isActive) {
        throw AppError.notFound('Product not found or currently unavailable');
      }

      // 2. Obtain user's cart
      const cart = await this.getOrCreateCart(userId, tx);

      // 3. Check if product already exists in user's cart
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId
          }
        }
      });

      const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      // 4. Verify inventory availability
      if (product.stock < targetQuantity) {
        throw AppError.conflict(
          `Requested quantity (${targetQuantity}) exceeds available stock (${product.stock})`
        );
      }

      // 5. Upsert CartItem (atomic increment or insert)
      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: targetQuantity }
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: targetQuantity
          }
        });
      }

      // 6. Return fresh formatted cart
      const updatedCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    take: 1
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      return this.formatCart(updatedCart);
    });
  }

  /**
   * Update item quantity in user's cart
   * Enforces strict ownership check: item must belong to the user's cart.
   * @param {string} userId - Authenticated user UUID
   * @param {string} itemId - CartItem UUID
   * @param {number} quantity - New desired quantity
   */
  async updateItemQuantity(userId, itemId, quantity) {
    return prisma.$transaction(async (tx) => {
      // 1. Enforce ownership: Fetch item and verify ownership through cart.userId
      const item = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
          product: true
        }
      });

      if (!item || item.cart.userId !== userId) {
        throw AppError.notFound('Cart item not found');
      }

      // 2. Validate product availability and inventory
      if (!item.product.isActive) {
        throw AppError.conflict('Product is discontinued or no longer available');
      }

      if (item.product.stock < quantity) {
        throw AppError.conflict(
          `Requested quantity (${quantity}) exceeds available stock (${item.product.stock})`
        );
      }

      // 3. Update item quantity
      await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity }
      });

      // 4. Return updated cart
      const updatedCart = await tx.cart.findUnique({
        where: { id: item.cartId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    take: 1
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      return this.formatCart(updatedCart);
    });
  }

  /**
   * Remove a single item from the cart
   * Enforces strict ownership check.
   * @param {string} userId - Authenticated user UUID
   * @param {string} itemId - CartItem UUID
   */
  async removeItem(userId, itemId) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true }
      });

      if (!item || item.cart.userId !== userId) {
        throw AppError.notFound('Cart item not found');
      }

      await tx.cartItem.delete({
        where: { id: itemId }
      });

      const updatedCart = await tx.cart.findUnique({
        where: { id: item.cartId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    take: 1
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      return this.formatCart(updatedCart);
    });
  }

  /**
   * Clear all items from user's cart
   * @param {string} userId - Authenticated user UUID
   */
  async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    return {
      cartId: cart.id,
      items: [],
      subtotal: '0.00',
      itemCount: 0,
      distinctCount: 0
    };
  }
}

module.exports = new CartService();
