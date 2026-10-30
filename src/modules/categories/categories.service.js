const prisma = require('../../lib/prisma');
const AppError = require('../../utils/app-error');
const slugify = require('../../utils/slugify');

class CategoriesService {
  /**
   * List all categories (hierarchical tree or flat list)
   * @param {Object} options - { tree?: boolean }
   */
  async listCategories({ tree = true } = {}) {
    if (tree) {
      // Fetch top-level categories with recursive nested children
      const rootCategories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: {
              children: true,
              _count: { select: { products: true } }
            },
            orderBy: { name: 'asc' }
          },
          _count: { select: { products: true } }
        },
        orderBy: { name: 'asc' }
      });
      return rootCategories;
    }

    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });
    return categories;
  }

  /**
   * Retrieve single category by ID
   * @param {string} id - Category UUID
   */
  async getCategoryById(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { name: 'asc' }
        },
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    return category;
  }

  /**
   * Create a new category (Admin only)
   * @param {Object} data - { name, slug, description, parentId }
   */
  async createCategory({ name, slug, description, parentId }) {
    const finalSlug = slug ? slug.toLowerCase().trim() : slugify(name);

    // Verify slug uniqueness
    const existingSlug = await prisma.category.findUnique({
      where: { slug: finalSlug }
    });
    if (existingSlug) {
      throw AppError.conflict(`Category with slug '${finalSlug}' already exists`);
    }

    // Verify parent category exists if specified
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId }
      });
      if (!parent) {
        throw AppError.notFound('Parent category not found');
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description ? description.trim() : null,
        parentId: parentId || null
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } }
      }
    });

    return category;
  }

  /**
   * Update an existing category (Admin only)
   * @param {string} id - Category UUID
   * @param {Object} data - { name, slug, description, parentId }
   */
  async updateCategory(id, { name, slug, description, parentId }) {
    const category = await prisma.category.findUnique({
      where: { id }
    });
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (parentId && parentId === id) {
      throw AppError.badRequest('A category cannot be its own parent');
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId }
      });
      if (!parent) {
        throw AppError.notFound('Parent category not found');
      }
    }

    let finalSlug = category.slug;
    if (slug) {
      finalSlug = slug.toLowerCase().trim();
    } else if (name && !slug) {
      finalSlug = slugify(name);
    }

    if (finalSlug !== category.slug) {
      const existingSlug = await prisma.category.findUnique({
        where: { slug: finalSlug }
      });
      if (existingSlug && existingSlug.id !== id) {
        throw AppError.conflict(`Category with slug '${finalSlug}' already exists`);
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : category.name,
        slug: finalSlug,
        description: description !== undefined ? (description ? description.trim() : null) : category.description,
        parentId: parentId !== undefined ? parentId : category.parentId
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: true
      }
    });

    return updated;
  }

  /**
   * Delete category (Admin only)
   * @param {string} id - Category UUID
   */
  async deleteCategory(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      }
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (category._count.children > 0) {
      throw AppError.conflict('Cannot delete category with existing subcategories');
    }

    if (category._count.products > 0) {
      throw AppError.conflict('Cannot delete category with associated products');
    }

    await prisma.category.delete({
      where: { id }
    });

    return { deleted: true, id };
  }
}

module.exports = new CategoriesService();
