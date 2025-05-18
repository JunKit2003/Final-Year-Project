import React, { useState, useEffect, useContext } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import useGlobalNavigation from "../routes/Navigation";
import { ThemeContext } from "../App";

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Access navigation helpers
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

  // State for auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userCategory, setUserCategory] = useState("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // State for dark mode
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  // State for mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Toggle mobile drawer
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Dynamically change the logo based on dark mode
  const logoSrc = darkMode
    ? `${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo_dark.jpg`
    : `${process.env.REACT_APP_BACKEND_HOST}/images/faction_logo.png`;

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
    // eslint-disable-next-line
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

  // Renders your nav items (Home, About, Catalog, etc.)
  const renderNavItems = (
    <List sx={{ display: "flex", flexDirection: "column", minWidth: 200 }}>
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

      {/* Dark Mode Toggle */}
      <ListItemButton onClick={() => setDarkMode(!darkMode)}>
        <ListItemText primary={darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"} />
      </ListItemButton>
    </List>
  );

  return (
    <>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          // White in light mode, dark gray in dark mode
          backgroundColor: darkMode ? "#000" : "#fff",
          // Text color: white in dark mode, black in light mode
          color: darkMode ? "#fff" : "#000",
          width: "100%", // ensure the app bar spans full width
          boxShadow: "none", // remove typical MUI shadow, optional
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            // Let the nav items wrap on narrower screens so there's no horizontal scroll
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Left side: Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={goToHomePage}
          >
            <img
              src={logoSrc}
              alt="Faction Bikeworks Logo"
              style={{ height: "60px" }}
            />
          </Box>

          {/* Right side: either nav items (desktop) or menu icon (mobile) */}
          {isMobile ? (
            <IconButton
              edge="end"
              onClick={handleDrawerToggle}
              aria-label="open drawer"
              sx={{
                color: darkMode ? "#fff" : "#000",
              }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            // Desktop horizontal nav (still can wrap if very narrow)
            <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
              <List sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", p: 0 }}>
                {/* Inline each nav item for desktop */}
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
                <ListItemButton onClick={() => setDarkMode(!darkMode)}>
                  <ListItemText
                    primary={darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
                  />
                </ListItemButton>
              </List>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer (shown only on small screens) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: "block", sm: "block", md: "none" }, // hide on md+
        }}
        PaperProps={{
          // match the app bar style in mobile
          sx: {
            backgroundColor: darkMode ? "#333" : "#fff",
            color: darkMode ? "#fff" : "#000",
            pt: 8, // ✅ Push content down to prevent overlap with AppBar
          },
        }}
      >
        {renderNavItems}
      </Drawer>

      {/* Spacer so that page content isn't hidden behind the fixed AppBar
          This <Toolbar /> has the default minHeight of ~64px on desktop, 56px on mobile.
          Adjust if needed. */}
      <Toolbar />

      {/* Logout confirmation dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
      >
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
    </>
  );
};

export default Header;
