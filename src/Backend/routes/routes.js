import { Router } from 'express';
import { 
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductCategories,
    getProductBrands,
    addBanner,
    getBanners,
    deleteBanner,
    login,
    authenticate
} from '../api-endpoints/index.js'; // Import necessary endpoints

import { uploadMultiple } from '../file-uploads/multerConfig.js';

const router = Router();

// All API Endpoints go here

// Product-related routes
router.post('/product/add', uploadMultiple, addProduct);
router.post('/product/get', getProducts);
router.put('/product/edit/:id', uploadMultiple, updateProduct);
router.delete('/product/delete/:id', deleteProduct);
router.post('/product/getCategories', getProductCategories);
router.post('/product/getBrands', getProductBrands);



// Banner-related routes
router.post('/banner/add', uploadMultiple, addBanner);
router.post('/banner/get', getBanners);
router.delete('/banner/delete/:id', deleteBanner);



// Account-related routes
router.post('/account/login', login);
router.post('/account/authenticate', authenticate);


export default router;