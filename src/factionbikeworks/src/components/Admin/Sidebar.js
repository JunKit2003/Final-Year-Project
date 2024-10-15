import React, { useState } from 'react';
import { Drawer, List, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory'; // Icon for 'Manage Products'

const Sidebar = ({ setSelectedSection }) => {
  const [activeSection, setActiveSection] = useState('Dashboard'); // Keep track of the active section

  const handleSectionClick = (section) => {
    setActiveSection(section);
    setSelectedSection(section);
  };

  const highlightColor = "#f0f0f0"

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <List>
        {/* Home */}
        <ListItemButton
          selected={activeSection === 'Home'}
          onClick={() => handleSectionClick('Home')}
          sx={{
            '&.Mui-selected': { backgroundColor: highlightColor }, // Highlight selected state
          }}
        >
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>

        {/* Dashboard */}
        <ListItemButton
          selected={activeSection === 'Dashboard'}
          onClick={() => handleSectionClick('Dashboard')}
          sx={{
            '&.Mui-selected': { backgroundColor: highlightColor }, // Highlight selected state
          }}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {/* Manage Products */}
        <ListItemButton
          selected={activeSection === 'Manage Products'}
          onClick={() => handleSectionClick('Manage Products')}
          sx={{
            '&.Mui-selected': { backgroundColor: highlightColor }, // Highlight selected state
          }}
        >
          <ListItemIcon>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Manage Products" />
        </ListItemButton>

      {/* Manage Banners */}
      <ListItemButton
          selected={activeSection === 'Manage Banners'}
          onClick={() => handleSectionClick('Manage Banners')}
          sx={{
            '&.Mui-selected': { backgroundColor: highlightColor }, // Highlight selected state
          }}
        >
          <ListItemIcon>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Manage Banners" />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;
