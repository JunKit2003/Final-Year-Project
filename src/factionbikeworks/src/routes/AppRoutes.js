// src/routes/AppRoutes.js

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load the components
const Home = lazy(() => import('../pages/Home.js'));
const About = lazy(() => import('../pages/About.js'));
const AdminPage = lazy(() => import('../pages/Admin/AdminPage.js')); 
const Catalog = lazy(() => import('../pages/Catalog.js'));
const Login = lazy(() => import('../pages/Login.js'));
const Signup = lazy(() => import('../pages/Signup.js'));
const ViewProduct = lazy(() => import('../pages/ViewProduct.js'));
const Cart = lazy(() => import('../pages/Cart.js'));
const PasswordReset = lazy(() => import('../pages/PasswordReset.js'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage.js'));
const PaymentSuccess = lazy(() => import('../pages/PaymentSuccess.js'));
const PaymentFailed = lazy(() => import('../pages/PaymentFailed.js'));
const ViewOrderList = lazy(() => import('../pages/Admin/ViewOrderList.js'))
const OrderHistory = lazy(() => import('../pages/OrderHistory.js'))
const CustomerViewOrderList = lazy(() => import('../pages/CustomerViewOrderList.js'))


const AppRoutes = () => {
  return (
    <Suspense fallback={null}> {/* No visual indicator */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/catalog/:brandname?" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/PasswordReset" element={<PasswordReset />} />
        <Route path="/viewProduct/:productId" element={<ViewProduct />} />
        <Route path="/checkoutPage" element={<CheckoutPage />} />
        <Route path="/paymentSuccess" element={<PaymentSuccess />} />
        <Route path="/paymentFailed" element={<PaymentFailed />} />
        <Route path="/admin/viewOrderList/:orderId" element={<ViewOrderList />} />
        <Route path="/orderHistory" element={<OrderHistory />} />
        <Route path="/customerViewOrderList/:uid/:orderId" element={<CustomerViewOrderList />} />


        
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
