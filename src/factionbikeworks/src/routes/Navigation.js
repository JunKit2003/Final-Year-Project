// src/routes/navigation.js

import { useNavigate } from 'react-router-dom';

const useGlobalNavigation = () => {
  const navigate = useNavigate();


  const goToCatalogPage = () => navigate("/catalog")
  const goToAdminPage = () => navigate('/admin');
  const goToAboutPage = () => navigate('/about');
  const goToLoginPage = () => navigate('/login');
  const goToSignupPage = () => navigate('/signup');
  const goToCartPage = () => navigate('/cart')
  const goToPasswordResetPage = () => navigate('/passwordReset')
  const goToViewProductPage = (productId) => navigate(`/viewProduct/${productId}`); // Accept productId
  const goToHomePage = () => navigate('/');

  return {
    goToAdminPage,
    goToAboutPage,
    goToHomePage,
    goToCatalogPage,
    goToLoginPage,
    goToSignupPage,
    goToViewProductPage,
    goToCartPage,
    goToPasswordResetPage,
  };
};

export default useGlobalNavigation;