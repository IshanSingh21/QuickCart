const { Router } = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const categoriesRoutes = require('../modules/categories/categories.routes');
const productsRoutes = require('../modules/products/products.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const ordersRoutes = require('../modules/orders/orders.routes');
const paymentsRoutes = require('../modules/payments/payments.routes');

const router = Router();

// Mount module routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);

module.exports = router;
