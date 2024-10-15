// src/routes/navigation.js

import { useNavigate } from 'react-router-dom';

const useGlobalNavigation = () => {
  const navigate = useNavigate();

  const goToCatalogPage = () => navigate("/catalog")
  const goToAdminPage = () => navigate('/admin');
  const goToAboutPage = () => navigate('/about');
  const goToLoginPage = () => navigate('/login');
  const goToHomePage = () => navigate('/');

  return {
    goToAdminPage,
    goToAboutPage,
    goToHomePage,
    goToCatalogPage,
    goToLoginPage,
  };
};

export default useGlobalNavigation;