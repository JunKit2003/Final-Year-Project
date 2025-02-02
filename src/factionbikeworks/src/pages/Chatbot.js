import React, { useContext } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import { ThemeContext } from "../App"; // Import Theme Context

const Chatbot = () => {
  const { darkMode } = useContext(ThemeContext); // Access Dark Mode state

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 3 }}>
      <Header />
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h4">Faction Bikeworks AI Chatbot</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Welcome to our AI chatbot! Feel free to ask any bike-related questions.
        </Typography>
      </Box>

      {/* Embed Botpress Chatbot */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <iframe
          src="https://cdn.botpress.cloud/webchat/v2.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/02/02/18/20250202183140-YKDEBF3S.json"
          width="100%"
          height="600px"
          style={{
            border: "none",
            maxWidth: "800px",
            borderRadius: "10px",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
            filter: darkMode ? "none" : "invert(1) hue-rotate(180deg)", // Only invert in Light Mode
            transition: "filter 0.3s ease-in-out",
          }}
          allow="microphone; clipboard-read; clipboard-write"
        ></iframe>
      </Box>
    </Box>
  );
};

export default Chatbot;
