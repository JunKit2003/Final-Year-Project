import { Router } from 'express';
import { 
    getProducts,
    getProductCategories,
    getProductBrands,
    getBanners,
    login,
    logout,
    authenticate,
    signup,
    addToCart,
    getCartItems,
    removeCartItem,
    requestPasswordReset,
    resetPassword,
    testEmail,
    createOrder,
    markOrderPaidAndClearCart,
    getBrandImages,
    cancelOrder,
    getUserOrders,
    getCustomerOrder,
} from '../api-endpoints/index.js'; // Import necessary endpoints

import { requireAdmin, requireOwnCartItem, requireSelf } from '../middleware/auth.js';
import { db } from '../database/index.js';
import adminRouter from '../features/admin-router.js';
import { publicSite } from '../features/settings/routes.js';

const router = Router();

// Site content and settings (public) and the admin API (admin only, see features/).
router.get('/site', publicSite);
router.use('/admin', adminRouter);

// Access rules (identity comes from the session, never from ids in the request):
//   public    - catalogue, banners, sign in/up, password reset
//   self      - cart and order endpoints: the user id in the request must be the signed-in user
//   admin     - everything under /admin (features/admin-router.js) and testEmail

const ownCartItem = requireOwnCartItem((id) => db.Cart.findByPk(id));

// Product-related routes
router.post('/product/get', getProducts);
router.post('/product/getCategories', getProductCategories);
router.post('/product/getBrands', getProductBrands);
router.post('/product/getBrandImages', getBrandImages);

// Banner-related routes
router.post('/banner/get', getBanners);

// Account-related routes
router.post('/account/login', login);
router.post('/account/logout', logout);
router.post('/account/authenticate', authenticate);
router.post('/account/signup', signup);
router.post('/account/requestPasswordReset', requestPasswordReset);
router.post('/account/resetPassword', resetPassword);
router.post('/account/testEmail', requireAdmin, testEmail); // sends mail: never public

// Cart-related routes
router.delete('/cart/cancelOrder', requireSelf('body', 'user_id'), cancelOrder);
router.post('/cart/add', requireSelf('body', 'user_id'), addToCart);
router.post('/cart/createOrder', requireSelf('body', 'user_id'), createOrder);
router.patch('/cart/markOrderPaidAndClearCart', requireSelf('body', 'user_id'), markOrderPaidAndClearCart);
router.get('/cart/getUserOrders/:userId', requireSelf('params', 'userId', { allowAdmin: true }), getUserOrders);
router.post("/cart/getCustomerOrder", requireSelf('body', 'userId', { allowAdmin: true }), getCustomerOrder);
// Parameterised routes last so they don't shadow the named ones above.
router.get('/cart/:user_id', requireSelf('params', 'user_id'), getCartItems);
router.delete('/cart/:cart_item_id', ownCartItem, removeCartItem);

export default router;