// src/pages/AdminPage.js
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from '../../components/Admin/Sidebar.js';
import useGlobalNavigation from '../../routes/Navigation'; // Import the useGlobalNavigation hook
import Dashboard from './Dashboard';
import ManageProducts from './ManageProducts';
import ManageBanners from './ManageBanners.js';

const AdminPage = () => {
  const { goToHomePage } = useGlobalNavigation();
  const [selectedSection, setSelectedSection] = useState('Dashboard');
  const [isAuthorized, setIsAuthorized] = useState(true); // State to track authorization

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await fetch('${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate', {
          method: 'POST',
          credentials: 'include', // Include cookies for session management
        });
        const data = await response.json();

        if (!response.ok || data.message.includes('Access denied')) {
          setIsAuthorized(false);
          goToHomePage(); // Redirect to home page if not authorized
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
        goToHomePage(); // Redirect on error as well
      }
    };

    checkAuthorization();
  }, [goToHomePage]);

  if (!isAuthorized) {
    return null; // Optionally, return a loading spinner or null until authorization is checked
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar for navigation */}
      <Sidebar selectedSection={selectedSection} setSelectedSection={setSelectedSection} />

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {selectedSection === 'Home' && goToHomePage()}
        {selectedSection === 'Dashboard' && <Dashboard />}
        {selectedSection === 'Manage Products' && <ManageProducts />}
        {selectedSection === 'Manage Banners' && <ManageBanners />}
      </Box>
    </Box>
  );
};

export default AdminPage;
