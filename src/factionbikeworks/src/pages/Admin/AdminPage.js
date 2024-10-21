// src/pages/AdminPage.js
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from '../../components/Admin/Sidebar.js';
import useGlobalNavigation from '../../routes/Navigation'; // Import the useGlobalNavigation hook
import Dashboard from './Dashboard';
import ManageProducts from './ManageProducts';
import ManageBanners from './ManageBanners.js';
import axios from 'axios'; // Import axios

const AdminPage = () => {
  const { goToHomePage } = useGlobalNavigation();
  const [selectedSection, setSelectedSection] = useState('Dashboard');
  const [isAuthorized, setIsAuthorized] = useState(true); // State to track authorization

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`, 
          {}, // Empty body for the POST request
          { withCredentials: true } // Include cookies in the request
        );

        // Check if the response is OK
        if (response.status !== 200) {
          console.error('Response not OK:', response.data);
          setIsAuthorized(false);
          goToHomePage();
          return;
        }

        const data = response.data;

        // Check the user's category
        if (data.user && data.user.category === 'admin') {
          setIsAuthorized(true); // User is an admin, allow access
        } else {
          setIsAuthorized(false); // User is not an admin, deny access
          goToHomePage();
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
        goToHomePage();
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
