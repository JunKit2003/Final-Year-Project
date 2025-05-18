import React, { useContext } from "react";
import { Box, Typography, IconButton, useMediaQuery } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import { ThemeContext } from "../App"; // Import Theme Context
import { useTheme } from "@mui/material/styles";

const currentYear = new Date().getFullYear();

const Footer = () => {
  const { darkMode } = useContext(ThemeContext); // Get dark mode state
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Check if screen is small (mobile)

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "#222" : "#fff",
        color: darkMode ? "#fff" : "#000",
        padding: "30px 20px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: isMobile ? "space-between" : "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        flexDirection: isMobile ? "column" : "row",
        borderTop: `1px solid ${darkMode ? "#444" : "#ddd"}`, // Border for light mode clarity
      }}
    >
      {isMobile ? (
        /** MOBILE VIEW (Aligned Contact Left, Copyright Bottom Left, Payment Far Right) */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            width: "100%",
            alignItems: "center",
          }}
        >
          {/* Contact Us (Left Aligned) */}
          <Box sx={{ minWidth: "150px", textAlign: "left" }}>
            <Typography variant="h6" gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body2">Phone: +6011-3332 1767</Typography>
            <IconButton
              href="https://wa.me/+601133321767"
              target="_blank"
              sx={{
                backgroundColor: "#25D366",
                color: "#fff",
                "&:hover": { backgroundColor: "#1DA851" },
                marginTop: "8px",
              }}
            >
              <WhatsAppIcon />
            </IconButton>
          </Box>

          {/* Socials (Centered) */}
          <Box sx={{ minWidth: "150px", textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <IconButton
              href="https://www.facebook.com/faction.my/"
              target="_blank"
              sx={{
                backgroundColor: "#1877F2",
                color: "#fff",
                "&:hover": { backgroundColor: "#165DB5" },
                marginRight: "10px",
              }}
            >
              <FacebookIcon />
            </IconButton>

            <IconButton
              href="https://www.instagram.com/faction.my/"
              target="_blank"
              sx={{
                backgroundColor: "#E1306C",
                color: "#fff",
                "&:hover": { backgroundColor: "#B62A57" },
              }}
            >
              <InstagramIcon />
            </IconButton>
          </Box>

          {/* Copyright (Bottom Left) */}
          <Box
            sx={{
              minWidth: "150px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              height: "100px",
              gridColumn: "1 / span 1",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: "12px",
                opacity: 0.7,
                color: darkMode ? "#aaa" : "#555",
              }}
            >
              © 2024–{currentYear} Faction Bikeworks
            </Typography>
          </Box>

          {/* Payment Methods (Far Right) */}
          <Box
            sx={{
              minWidth: "150px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              height: "100px",
              gridColumn: "2 / span 1",
              textAlign: "right",
            }}
          >
            <Box sx={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
                alt="Visa"
                style={{ height: "30px", width: "50px", objectFit: "contain" }}
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg"
                alt="Mastercard"
                style={{ height: "30px", width: "50px", objectFit: "contain" }}
              />
              <img
                src={`${process.env.REACT_APP_BACKEND_HOST}/images/powered_by_stripe.png`}
                alt="Stripe"
                style={{ height: "30px", width: "80px", objectFit: "contain" }}
              />
            </Box>
          </Box>
        </Box>
      ) : (
        /** PC VIEW (Same as Before: | 1 | 2 | 3 | 4 |) */
        <>
          {/* Section 1: Copyright (Bottom Left) */}
          <Box
            sx={{
              flex: 1,
              minWidth: "200px",
              display: "flex",
              alignItems: "flex-end",
              height: "100px",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: "12px",
                opacity: 0.7,
                color: darkMode ? "#aaa" : "#555",
              }}
            >
              © 2024–{currentYear} Faction Bikeworks
            </Typography>
          </Box>

          {/* Section 2: Contact Info */}
          <Box sx={{ flex: 1, minWidth: "200px" }}>
            <Typography variant="h6" gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body2">Phone: +6011-3332 1767</Typography>
            <IconButton
              href="https://wa.me/+601133321767"
              target="_blank"
              sx={{
                backgroundColor: "#25D366",
                color: "#fff",
                "&:hover": { backgroundColor: "#1DA851" },
                marginTop: "8px",
              }}
            >
              <WhatsAppIcon />
            </IconButton>
          </Box>

          {/* Section 3: Socials (Round Icons Only) */}
          <Box sx={{ flex: 1, minWidth: "200px" }}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <IconButton
              href="https://www.facebook.com/faction.my/"
              target="_blank"
              sx={{
                backgroundColor: "#1877F2",
                color: "#fff",
                "&:hover": { backgroundColor: "#165DB5" },
                marginRight: "10px",
              }}
            >
              <FacebookIcon />
            </IconButton>

            <IconButton
              href="https://www.instagram.com/faction.my/"
              target="_blank"
              sx={{
                backgroundColor: "#E1306C",
                color: "#fff",
                "&:hover": { backgroundColor: "#B62A57" },
              }}
            >
              <InstagramIcon />
            </IconButton>
          </Box>

          {/* Section 4: Payment Logos (Bottom Right) */}
          <Box
            sx={{
              flex: 1,
              minWidth: "200px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              height: "100px",
            }}
          >
            <Box sx={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
                alt="Visa"
                style={{ height: "30px", width: "50px", objectFit: "contain" }}
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg"
                alt="Mastercard"
                style={{ height: "30px", width: "50px", objectFit: "contain" }}
              />
              <img
                src={`${process.env.REACT_APP_BACKEND_HOST}/images/powered_by_stripe.png`}
                alt="Stripe"
                style={{ height: "30px", width: "80px", objectFit: "contain" }}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Footer;
