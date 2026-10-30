const { Prisma } = require('@prisma/client');
const prisma = require('../../lib/prisma');
const config = require('../../config/env');
const AppError = require('../../utils/app-error');
const slugify = require('../../utils/slugify');

class ProductsService {
  /**
   * Format product object for response serialization
   */
  formatProduct(product) {
    if (!product) return null;
    return {
      ...product,
      price: product.price ? product.price.toString() : '0.00'
    };
  }

  /**
   * List products with search, category filtering, price bounds, sorting, and pagination
   * @param {Object} query - Query parameters
   * @param {Object|null} user - Authenticated user context
   */
  async listProducts(query = {}, user = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(
      Math.max(1, parseInt(query.limit, 10) || config.pagination.defaultPageSize),
      config.pagination.maxPageSize
    );
    const skip = (page - 1) * limit;

    const where = {};

    // Product Active State Rule: Public users can only see active products.
    // Admins can see all, active, or inactive products based on query.
    const isAdmin = user && user.role === 'ADMIN';
    if (!isAdmin) {
      where.isActive = true;
    } else if (query.isActive === 'true') {
      where.isActive = true;
    } else if (query.isActive === 'false') {
      where.isActive = false;
    }

    // Text Search Rule: Case-insensitive match on product name or description
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Category Filtering: Accept either category UUID or category slug
    if (query.category && query.category.trim()) {
      const categoryIdent = query.category.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryIdent);

      const category = await prisma.category.findFirst({
        where: isUuid ? { id: categoryIdent } : { slug: categoryIdent },
        include: { children: { select: { id: true } } }
      });

      if (category) {
        // Include products from parent category and any direct subcategories
        const categoryIds = [category.id, ...category.children.map((c) => c.id)];
        where.categoryId = { in: categoryIds };
      } else {
        // Category specified but not found -> return empty result set safely
        where.categoryId = '00000000-0000-0000-0000-000000000000';
      }
    }

    // Price Filtering: Bounds check
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    // Sorting
    const allowedSortFields = ['createdAt', 'price', 'name'];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const order = query.order === 'asc' ? 'asc' : 'desc';

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
          }
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit
      })
    ]);

    const formattedProducts = products.map((p) => this.formatProduct(p));

    return {
      products: formattedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieve product detail by UUID
   * @param {string} id - Product UUID
   * @param {Object|null} user - Authenticated user context
   */
  async getProductById(id, user = null) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
        }
      }
    });

    if (!product) {
      throw AppError.notFound('Product not found');
    }

    // Public / Customer visibility check
    const isAdmin = user && user.role === 'ADMIN';
    if (!product.isActive && !isAdmin) {
      throw AppError.notFound('Product not found');
    }

    return this.formatProduct(product);
  }

  /**
   * Retrieve product detail by slug
   * @param {string} slug - Product URL slug
   * @param {Object|null} user - Authenticated user context
   */
  async getProductBySlug(slug, user = null) {
    const product = await prisma.product.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
        }
      }
    });

    if (!product) {
      throw AppError.notFound('Product not found');
    }

    const isAdmin = user && user.role === 'ADMIN';
    if (!product.isActive && !isAdmin) {
      throw AppError.notFound('Product not found');
    }

    return this.formatProduct(product);
  }

  /**
   * Create product (Admin only)
   * @param {Object} data - Product creation attributes
   */
  async createProduct({ name, slug, sku, description, price, stock, categoryId, isActive, images }) {
    const finalSlug = slug ? slug.toLowerCase().trim() : slugify(name);
    const normalizedSku = sku.toUpperCase().trim();

    // Check category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    // Check slug uniqueness
    const existingSlug = await prisma.product.findUnique({
      where: { slug: finalSlug }
    });
    if (existingSlug) {
      throw AppError.conflict(`Product with slug '${finalSlug}' already exists`);
    }

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: normalizedSku }
    });
    if (existingSku) {
      throw AppError.conflict(`Product with SKU '${normalizedSku}' already exists`);
    }

    const createdProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        sku: normalizedSku,
        description: description.trim(),
        price: new Prisma.Decimal(price),
        stock: stock !== undefined ? stock : 0,
        categoryId,
        isActive: isActive !== undefined ? isActive : true,
        images:
          images && images.length > 0
            ? {
                create: images.map((img, idx) => ({
                  url: img.url,
                  altText: img.altText || null,
                  isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
                  sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx
                }))
              }
            : undefined
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: true
      }
    });

    return this.formatProduct(createdProduct);
  }

  /**
   * Update product (Admin only)
   * @param {string} id - Product UUID
   * @param {Object} data - Updated attributes
   */
  async updateProduct(id, data) {
    const product = await prisma.product.findUnique({
      where: { id }
    });
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
      });
      if (!category) {
        throw AppError.notFound('Category not found');
      }
    }

    let finalSlug = product.slug;
    if (data.slug) {
      finalSlug = data.slug.toLowerCase().trim();
    } else if (data.name && !data.slug) {
      finalSlug = slugify(data.name);
    }

    if (finalSlug !== product.slug) {
      const existingSlug = await prisma.product.findUnique({
        where: { slug: finalSlug }
      });
      if (existingSlug && existingSlug.id !== id) {
        throw AppError.conflict(`Product with slug '${finalSlug}' already exists`);
      }
    }

    let normalizedSku = product.sku;
    if (data.sku) {
      normalizedSku = data.sku.toUpperCase().trim();
      if (normalizedSku !== product.sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku: normalizedSku }
        });
        if (existingSku && existingSku.id !== id) {
          throw AppError.conflict(`Product with SKU '${normalizedSku}' already exists`);
        }
      }
    }

    // Handle updates inside an interactive transaction if images are provided
    const updated = await prisma.$transaction(async (tx) => {
      if (data.images !== undefined) {
        // Replace existing images
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.images.length > 0) {
          await tx.productImage.createMany({
            data: data.images.map((img, idx) => ({
              productId: id,
              url: img.url,
              altText: img.altText || null,
              isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
              sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx
            }))
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : product.name,
          slug: finalSlug,
          sku: normalizedSku,
          description: data.description !== undefined ? data.description.trim() : product.description,
          price: data.price !== undefined ? new Prisma.Decimal(data.price) : product.price,
          stock: data.stock !== undefined ? data.stock : product.stock,
          categoryId: data.categoryId !== undefined ? data.categoryId : product.categoryId,
          isActive: data.isActive !== undefined ? data.isActive : product.isActive,
          version: { increment: 1 } // Optimistic Concurrency Control counter
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
          }
        }
      });
    });

    return this.formatProduct(updated);
  }

  /**
   * Delete product (Admin only)
   * Soft-deletes if referenced by orders/cart to preserve historical data, otherwise hard deletes
   * @param {string} id - Product UUID
   */
  async deleteProduct(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            cartItems: true
          }
        }
      }
    });

    if (!product) {
      throw AppError.notFound('Product not found');
    }

    const isReferenced = product._count.orderItems > 0 || product._count.cartItems > 0;

    if (isReferenced) {
      // Soft-delete to preserve foreign-key relational integrity for past orders
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      return { deleted: true, softDeleted: true, id };
    }

    // Hard-delete when completely unreferenced
    await prisma.product.delete({
      where: { id }
    });

    return { deleted: true, softDeleted: false, id };
  }
}

module.exports = new ProductsService();
