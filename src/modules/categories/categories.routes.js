const { Router } = require('express');
const categoriesController = require('./categories.controller');
const validate = require('../../middlewares/validate');
const { authenticate, requireRole } = require('../../middlewares/auth');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema
} = require('./categories.validation');

const router = Router();

// Public routes
router.get('/', categoriesController.listCategories.bind(categoriesController));
router.get('/:id', validate(categoryIdParamSchema), categoriesController.getCategoryById.bind(categoriesController));

// Admin-only management routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createCategorySchema),
  categoriesController.createCategory.bind(categoriesController)
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateCategorySchema),
  categoriesController.updateCategory.bind(categoriesController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(categoryIdParamSchema),
  categoriesController.deleteCategory.bind(categoriesController)
);

module.exports = router;
