import React, { useState } from 'react';
import { Drawer, List, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory'; // Icon for 'Manage Products'
import { useTheme } from '@mui/material/styles'; // Import Theme Hook
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const Sidebar = ({ setSelectedSection }) => {
  const [activeSection, setActiveSection] = useState('Manage products'); // Keep track of the active section
  const theme = useTheme(); // Get current theme (dark or light)

  const handleSectionClick = (section) => {
    setActiveSection(section);
    setSelectedSection(section);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          bgcolor: "background.default", // Ensure drawer follows theme background
          color: "text.primary", // Ensure text is visible
        },
      }}
    >
      <List>
        {/* Sidebar Items */}
        {[
          { label: "Exit Admin Panel", icon: <ExitToAppIcon /> },
          //{ label: "Dashboard", icon: <DashboardIcon /> },
          { label: "Manage Products", icon: <InventoryIcon /> },
          { label: "Manage Banners", icon: <InventoryIcon /> },
          { label: "Manage Orders", icon: <InventoryIcon /> },
          { label: "Manage Brand Images", icon: <InventoryIcon /> },
        ].map((item) => (
          <ListItemButton
            key={item.label}
            selected={activeSection === item.label}
            onClick={() => handleSectionClick(item.label)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: theme.palette.mode === "dark" ? "#424242" : "#f0f0f0",
                color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
              },
              '&.Mui-selected:hover': {
                backgroundColor: theme.palette.mode === "dark" ? "#616161" : "#e0e0e0",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
