const { Router } = require('express');
const productsController = require('./products.controller');
const validate = require('../../middlewares/validate');
const { authenticate, authenticateOptional, requireRole } = require('../../middlewares/auth');
const {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSlugParamSchema
} = require('./products.validation');

const router = Router();

// Public Catalog Endpoints (Optional Auth for Admin visibility)
router.get(
  '/',
  authenticateOptional,
  validate(listProductsQuerySchema),
  productsController.listProducts.bind(productsController)
);

router.get(
  '/slug/:slug',
  authenticateOptional,
  validate(productSlugParamSchema),
  productsController.getProductBySlug.bind(productsController)
);

router.get(
  '/:id',
  authenticateOptional,
  validate(productIdParamSchema),
  productsController.getProductById.bind(productsController)
);

// Admin-Only Product Management Endpoints
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createProductSchema),
  productsController.createProduct.bind(productsController)
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateProductSchema),
  productsController.updateProduct.bind(productsController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(productIdParamSchema),
  productsController.deleteProduct.bind(productsController)
);

module.exports = router;
