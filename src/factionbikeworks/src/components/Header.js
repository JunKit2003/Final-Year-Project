import React, { useState, useEffect, useContext } from "react";
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
} from "@mui/material";
import useGlobalNavigation from "../routes/Navigation";
import axios from "axios";
import { ThemeContext } from "../App"; // Import Theme Context

const drawerHeight = 80;

const Header = () => {
  const {
    goToAdminPage,
    goToAboutPage,
    goToHomePage,
    goToCatalogPage,
    goToLoginPage,
    goToCartPage, 
    goToOrderHistoryPage,
    goToChatbotPage,
  } = useGlobalNavigation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userCategory, setUserCategory] = useState("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const { darkMode, setDarkMode } = useContext(ThemeContext); // Access dark mode state

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
        null,
        { withCredentials: true }
      );
      if (response.status === 200 && response.data.user) {
        setIsLoggedIn(true);
        setUserName(response.data.user.username);
        setUserCategory(response.data.user.category);
      }
    } catch (error) {
      console.error("Failed to fetch authentication status", error);
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
        { withCredentials: true }
      );
      if (response.status === 200) {
        setIsLoggedIn(false);
        setUserName("");
        setUserCategory("");
        goToHomePage();
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  // Dynamically change the logo based on dark mode
  const logoSrc = darkMode
    ? `${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo_dark.jpg`
    : `${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo.png`;

  return (
    <Drawer
      sx={{
        height: drawerHeight,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          height: drawerHeight,
          boxSizing: "border-box",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
      }}
      variant="permanent"
      anchor="top"
    >
      <Box
        sx={{
          width: "200px",
          display: "flex",
          alignItems: "center",
          paddingLeft: 2,
          cursor: "pointer",
        }}
        onClick={goToHomePage}
      >
        <img
          src={logoSrc}
          alt="Faction Bikeworks Logo"
          style={{ height: "60px", transition: "opacity 0.3s ease-in-out" }}
        />
      </Box>

      <List sx={{ display: "flex", flexDirection: "row", marginRight: 2 }}>
        <ListItemButton onClick={goToHomePage}>
          <ListItemText primary="Home" />
        </ListItemButton>

        <ListItemButton onClick={goToAboutPage}>
          <ListItemText primary="About" />
        </ListItemButton>

        {isLoggedIn && userCategory === "Admin" && (
          <ListItemButton onClick={goToAdminPage}>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}

        <ListItemButton onClick={goToCatalogPage}>
          <ListItemText primary="Catalog" />
        </ListItemButton>

        {isLoggedIn && (
          <ListItemButton onClick={goToCartPage}>
            <ListItemText primary="Cart" />
          </ListItemButton>
        )}

        <ListItemButton onClick={goToChatbotPage}>
                  <ListItemText primary="Chatbot" />
                </ListItemButton>

        {isLoggedIn && (
          <ListItemButton onClick={goToOrderHistoryPage}>
            <ListItemText primary="Order History" />
          </ListItemButton>
        )}

        {isLoggedIn ? (
          <ListItemButton onClick={() => setLogoutDialogOpen(true)}>
            <ListItemText primary={userName} />
          </ListItemButton>
        ) : (
          <ListItemButton onClick={goToLoginPage}>
            <ListItemText primary="Login" />
          </ListItemButton>
        )}

        {/* Dark Mode Toggle Button */}
        <ListItemButton onClick={() => setDarkMode(!darkMode)}>
          <ListItemText primary={darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"} />
        </ListItemButton>
      </List>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Are you sure you want to log out?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
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
