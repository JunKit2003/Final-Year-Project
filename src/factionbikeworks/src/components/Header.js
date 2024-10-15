import React from 'react';
import { Box, Drawer, List, ListItemText, ListItemButton } from '@mui/material';
import useGlobalNavigation from '../routes/Navigation'; // Import the useGlobalNavigation hook

const drawerHeight = 80;

const Header = () => {
  const { goToAdminPage, goToAboutPage, goToHomePage, goToCatalogPage, goToLoginPage } = useGlobalNavigation(); // Destructure the functions required from the hook

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

      {/* Clickable Box for Logo */}
      <Box
        sx={{ width: '200px', display: 'flex', alignItems: 'center', paddingLeft: 2, cursor: 'pointer' }}
        onClick={goToHomePage} // Navigate to home when the logo is clicked
      >
        {/* Replace this with your logo */}
        <img
          src={`${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo.jpg`}
          alt="Faction Bikeworks Logo"
          style={{ height: '60px' }}
        />
      </Box>

      <List sx={{ display: 'flex', flexDirection: 'row', marginRight: 2 }}>
        <ListItemButton onClick={goToHomePage}> {/* Use the goToHomePage function */}
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton onClick={goToAboutPage}> {/* Use the goToAboutPage function */}
          <ListItemText primary="About" />
        </ListItemButton>
        <ListItemButton onClick={goToAdminPage}> {/* Use the goToAdminPage function */}
          <ListItemText primary="Admin" />
          </ListItemButton>
        <ListItemButton onClick={goToCatalogPage}> {/* Use the goToCatalogPage function */}
          <ListItemText primary="Catalog" />
        </ListItemButton>
        <ListItemButton onClick={goToLoginPage}> {/* Use the goToCatalogPage function */}
          <ListItemText primary="Login" />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Header;