// src/routes/AppRoutes.js

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load the components
const Home = lazy(() => import('../pages/Home.js'));
const About = lazy(() => import('../pages/About.js'));
const AdminPage = lazy(() => import('../pages/Admin/AdminPage.js')); // Only declare AdminPage once
const Catalog = lazy(() => import('../pages/Catalog.js'));
const Login = lazy(() => import('../pages/Login.js'));

const AppRoutes = () => {
  return (
    <Suspense fallback={null}> {/* No visual indicator */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
