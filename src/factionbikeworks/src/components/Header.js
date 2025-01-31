import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
} from '@mui/material';
import useGlobalNavigation from '../routes/Navigation';
import axios from 'axios';

const drawerHeight = 80;

const Header = () => {
  const {
    goToAdminPage,
    goToAboutPage,
    goToHomePage,
    goToCatalogPage,
    goToLoginPage,
    goToCartPage, 
    goToOrderHistoryPage, // <--- Make sure this is imported from useGlobalNavigation
  } = useGlobalNavigation();
  
  // State to manage login status, user name, and user category
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userCategory, setUserCategory] = useState('');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
        null,
        {
          withCredentials: true,
        }
      );
      if (response.status === 200 && response.data.user) {
        setIsLoggedIn(true);
        setUserName(response.data.user.username);
        setUserCategory(response.data.user.category);
      }
    } catch (error) {
      console.error('Failed to fetch authentication status', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/logout`,
        null,
        {
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        setIsLoggedIn(false);
        setUserName('');
        setUserCategory('');
        goToHomePage();
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleDialogClose = () => {
    setLogoutDialogOpen(false);
  };

  return (
    <Drawer
      sx={{
        height: drawerHeight,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          height: drawerHeight,
          boxSizing: 'border-box',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      }}
      variant="permanent"
      anchor="top"
    >
      <Box
        sx={{ width: '200px', display: 'flex', alignItems: 'center', paddingLeft: 2, cursor: 'pointer' }}
        onClick={goToHomePage}
      >
        <img
          src={`${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo.jpg`}
          alt="Faction Bikeworks Logo"
          style={{ height: '60px' }}
        />
      </Box>

      <List sx={{ display: 'flex', flexDirection: 'row', marginRight: 2 }}>
        <ListItemButton onClick={goToHomePage}>
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton onClick={goToAboutPage}>
          <ListItemText primary="About" />
        </ListItemButton>

        {/* Show Admin button only for admin users */}
        {isLoggedIn && userCategory === 'Admin' && (
          <ListItemButton onClick={goToAdminPage}>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}

        <ListItemButton onClick={goToCatalogPage}>
          <ListItemText primary="Catalog" />
        </ListItemButton>

        {/* ADD THE CART BUTTON HERE */}
        {isLoggedIn && (
          <ListItemButton onClick={goToCartPage}>
            <ListItemText primary="Cart" />
          </ListItemButton>
        )}

        {/* ADD THE ORDER HISTORY BUTTON HERE */}
        {isLoggedIn && (
          <ListItemButton onClick={goToOrderHistoryPage}>
            <ListItemText primary="Order History" />
          </ListItemButton>
        )}

        {/* Login / Username (Logout) Button */}
        {isLoggedIn ? (
          <ListItemButton onClick={handleLogoutClick}>
            <ListItemText primary={userName} />
          </ListItemButton>
        ) : (
          <ListItemButton onClick={goToLoginPage}>
            <ListItemText primary="Login" />
          </ListItemButton>
        )}
      </List>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Are you sure you want to log out?</DialogTitle>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleLogout} color="secondary">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default Header;
