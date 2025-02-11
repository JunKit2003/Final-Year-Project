import React, { useEffect, useState } from 'react';
import { Box, IconButton, Drawer } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu'; // Import menu icon
import Sidebar from '../../components/Admin/Sidebar.js';
import useGlobalNavigation from '../../routes/Navigation';
import Dashboard from './Dashboard';
import ManageProducts from './ManageProducts';
import ManageBanners from './ManageBanners.js';
import ManageOrders from './ManageOrders.js';
import ManageBrandImages from './ManageBrandImages.js';
import axios from 'axios';

const AdminPage = () => {
  const { goToHomePage } = useGlobalNavigation();
  const [selectedSection, setSelectedSection] = useState('Dashboard');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Detect mobile view
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State for drawer toggle

  useEffect(() => {
    // Handle window resize
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`, 
          {}, 
          { withCredentials: true }
        );

        if (response.status !== 200 || !(response.data.user && response.data.user.category === 'Admin')) {
          setIsAuthorized(false);
          goToHomePage();
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
        goToHomePage();
      }
    };

    checkAuthorization();
  }, [goToHomePage]);

  if (!isAuthorized) return null;

  return (
    <Box sx={{ display: 'flex' }}>
      {isMobile ? (
        <>
          <IconButton 
            sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}
            onClick={() => setIsDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            anchor="left"
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          >
            <Sidebar selectedSection={selectedSection} setSelectedSection={setSelectedSection} />
          </Drawer>
        </>
      ) : (
        <Sidebar selectedSection={selectedSection} setSelectedSection={setSelectedSection} />
      )}

      <Box sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        {selectedSection === 'Home' && goToHomePage()}
        {selectedSection === 'Dashboard' && <Dashboard />}
        {selectedSection === 'Manage Products' && <ManageProducts />}
        {selectedSection === 'Manage Banners' && <ManageBanners />}
        {selectedSection === 'Manage Orders' && <ManageOrders />}
        {selectedSection === 'Manage Brand Images' && <ManageBrandImages />}
      </Box>
    </Box>
  );
};

export default AdminPage;
