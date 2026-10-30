const { z } = require('zod');

const createCategorySchema = {
  body: z.object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(1, 'Category name cannot be empty')
      .max(100, 'Category name cannot exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug cannot be empty')
      .max(120, 'Slug cannot exceed 120 characters')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with optional hyphens')
      .optional(),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    parentId: z.string().uuid('Invalid parent category ID format').optional().nullable()
  })
};

const updateCategorySchema = {
  params: z.object({
    id: z.string().uuid('Invalid category ID format')
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Category name cannot be empty').max(100).optional(),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug cannot be empty')
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with optional hyphens')
      .optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    parentId: z.string().uuid('Invalid parent category ID format').optional().nullable()
  })
};

const categoryIdParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid category ID format')
  })
};

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema
};
