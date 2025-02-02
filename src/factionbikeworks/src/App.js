import "./App.css";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles"; // Import MUI ThemeProvider
import CssBaseline from "@mui/material/CssBaseline"; // Apply MUI global styles
import AppRoutes from "./routes/AppRoutes"; // Import routing configuration

function App() {
  // Load theme from localStorage or system preference
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [darkMode, setDarkMode] = useState(
    storedTheme ? storedTheme === "dark" : prefersDark
  );

  // Apply dark mode class to <body>
  useEffect(() => {
	if (darkMode) {
	  document.body.classList.add("dark-mode");
	  document.documentElement.style.backgroundColor = "#121212";
	  localStorage.setItem("theme", "dark");
	} else {
	  document.body.classList.remove("dark-mode");
	  document.documentElement.style.backgroundColor = "#ffffff";
	  localStorage.setItem("theme", "light");
	}
  }, [darkMode]);
  

  // Create a Material-UI theme for Dark & Light modes
  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: darkMode ? "#90caf9" : "#1976d2",
      },
      background: {
        default: darkMode ? "#121212" : "#ffffff",
        paper: darkMode ? "#1e1e1e" : "#ffffff",
      },
      text: {
        primary: darkMode ? "#ffffff" : "#000000",
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Ensures MUI components follow theme */}
      <Router>
        <div className="app-container">
          {/* Dark Mode Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="toggle-button"
          >
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>

          <AppRoutes /> {/* Load all routes */}
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
