const { z } = require('zod');

const listProductsQuerySchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .default(10)
        .transform((val) => Math.min(val, 50)),
      search: z.string().trim().optional(),
      category: z.string().trim().optional(),
      minPrice: z.coerce.number().min(0, 'minPrice must be non-negative').optional(),
      maxPrice: z.coerce.number().min(0, 'maxPrice must be non-negative').optional(),
      sortBy: z.enum(['createdAt', 'price', 'name']).default('createdAt'),
      order: z.enum(['asc', 'desc']).default('desc'),
      isActive: z.enum(['true', 'false', 'all']).optional()
    })
    .refine(
      (data) => {
        if (data.minPrice !== undefined && data.maxPrice !== undefined) {
          return data.maxPrice >= data.minPrice;
        }
        return true;
      },
      {
        message: 'maxPrice must be greater than or equal to minPrice',
        path: ['maxPrice']
      }
    )
};

const createProductSchema = {
  body: z.object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(1, 'Product name cannot be empty')
      .max(255, 'Product name cannot exceed 255 characters'),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug cannot be empty')
      .max(280, 'Slug cannot exceed 280 characters')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    sku: z
      .string({ required_error: 'SKU is required' })
      .trim()
      .min(1, 'SKU cannot be empty')
      .max(50, 'SKU cannot exceed 50 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty'),
    price: z.coerce
      .number({ required_error: 'Price is required' })
      .positive('Price must be greater than 0')
      .max(999999.99, 'Price cannot exceed 999,999.99'),
    stock: z.coerce
      .number()
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative')
      .default(0),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .uuid('Invalid category ID format'),
    isActive: z.boolean().default(true),
    images: z
      .array(
        z.object({
          url: z.string().url('Image URL must be valid'),
          altText: z.string().trim().max(255).optional().nullable(),
          isPrimary: z.boolean().default(false),
          sortOrder: z.number().int().default(0)
        })
      )
      .optional()
  })
};

const updateProductSchema = {
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Product name cannot be empty').max(255).optional(),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug cannot be empty')
      .max(280)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    sku: z.string().trim().min(1, 'SKU cannot be empty').max(50).optional(),
    description: z.string().trim().min(1, 'Description cannot be empty').optional(),
    price: z.coerce
      .number()
      .positive('Price must be greater than 0')
      .max(999999.99)
      .optional(),
    stock: z.coerce
      .number()
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative')
      .optional(),
    categoryId: z.string().uuid('Invalid category ID format').optional(),
    isActive: z.boolean().optional(),
    images: z
      .array(
        z.object({
          url: z.string().url('Image URL must be valid'),
          altText: z.string().trim().max(255).optional().nullable(),
          isPrimary: z.boolean().default(false),
          sortOrder: z.number().int().default(0)
        })
      )
      .optional()
  })
};

const productIdParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  })
};

const productSlugParamSchema = {
  params: z.object({
    slug: z.string().trim().min(1, 'Slug is required')
  })
};

module.exports = {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSlugParamSchema
};
