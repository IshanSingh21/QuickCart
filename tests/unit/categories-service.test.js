jest.mock('../../src/lib/prisma', () => ({
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const prisma = require('../../src/lib/prisma');
const categoriesService = require('../../src/modules/categories/categories.service');
const AppError = require('../../src/utils/app-error');

describe('Categories Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listCategories', () => {
    it('should return hierarchical category tree when tree=true', async () => {
      const mockRootCategories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          parentId: null,
          children: [{ id: 'cat-2', name: 'Audio', slug: 'audio', parentId: 'cat-1' }]
        }
      ];
      prisma.category.findMany.mockResolvedValue(mockRootCategories);

      const result = await categoriesService.listCategories({ tree: true });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { parentId: null } })
      );
      expect(result).toEqual(mockRootCategories);
    });

    it('should return flat category list when tree=false', async () => {
      const mockAllCategories = [
        { id: 'cat-1', name: 'Electronics' },
        { id: 'cat-2', name: 'Audio' }
      ];
      prisma.category.findMany.mockResolvedValue(mockAllCategories);

      const result = await categoriesService.listCategories({ tree: false });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: { parentId: null } })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Electronics', slug: 'electronics' };
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await categoriesService.getCategoryById('cat-1');
      expect(result).toEqual(mockCategory);
    });

    it('should throw 404 Not Found when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(categoriesService.getCategoryById('nonexistent')).rejects.toThrow(AppError);
    });
  });

  describe('createCategory', () => {
    it('should create a category with auto-generated slug', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 'cat-new',
        name: 'Home Appliances',
        slug: 'home-appliances',
        parentId: null
      });

      const result = await categoriesService.createCategory({
        name: 'Home Appliances'
      });

      expect(result.slug).toBe('home-appliances');
      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Home Appliances',
            slug: 'home-appliances'
          })
        })
      );
    });

    it('should throw 409 Conflict if category slug already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'existing', slug: 'electronics' });

      await expect(
        categoriesService.createCategory({ name: 'Electronics', slug: 'electronics' })
      ).rejects.toThrow(AppError);

      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('should throw 404 Not Found if specified parent category does not exist', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        categoriesService.createCategory({
          name: 'Speakers',
          parentId: '11111111-1111-1111-1111-111111111111'
        })
      ).rejects.toThrow('Parent category not found');
    });
  });

  describe('updateCategory', () => {
    it('should throw 400 Bad Request if category is set as its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', slug: 'cat-1' });

      await expect(
        categoriesService.updateCategory('cat-1', { parentId: 'cat-1' })
      ).rejects.toThrow('A category cannot be its own parent');
    });

    it('should update category details successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Old Name',
        slug: 'old-name'
      });
      prisma.category.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Updated Name',
        slug: 'updated-name'
      });

      const result = await categoriesService.updateCategory('cat-1', {
        name: 'Updated Name'
      });

      expect(result.name).toBe('Updated Name');
      expect(prisma.category.update).toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('should throw 409 Conflict if category has subcategories', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-parent',
        _count: { children: 2, products: 0 }
      });

      await expect(categoriesService.deleteCategory('cat-parent')).rejects.toThrow(
        'Cannot delete category with existing subcategories'
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should throw 409 Conflict if category has associated products', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-with-prods',
        _count: { children: 0, products: 5 }
      });

      await expect(categoriesService.deleteCategory('cat-with-prods')).rejects.toThrow(
        'Cannot delete category with associated products'
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should delete category if unused', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-empty',
        _count: { children: 0, products: 0 }
      });
      prisma.category.delete.mockResolvedValue({ id: 'cat-empty' });

      const result = await categoriesService.deleteCategory('cat-empty');
      expect(result.deleted).toBe(true);
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-empty' } });
    });
  });
});
