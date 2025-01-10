import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";

const PaymentSuccess = () => {
  const [message, setMessage] = useState("Verifying your payment...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1) Extract Stripe session ID from the URL
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    // 2) Retrieve userId from localStorage (fallback to 1)
    const userId = localStorage.getItem("userId") || 1;

    if (!sessionId) {
      // If no session ID is found, show error and stop
      setMessage("No session ID was found in the URL. Could not verify payment.");
      setLoading(false);
      return;
    }

    // 3) Define a function to finalize the payment
    const finalizePayment = async () => {
      try {
        // Call the backend API to mark the order as "Paid" and clear the cart
        const response = await axios.patch(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/markOrderPaidAndClearCart`,
          {
            session_id: sessionId,
            user_id: userId,
          }
        );

        // Set success message
        setMessage(
          "Payment successful! Your order has been marked as Paid and items removed from the cart."
        );
      } catch (err) {
        console.error("Error finalizing payment:", err);
        setError("There was an issue finalizing your payment. Please try again.");
        setMessage("Failed to verify your payment.");
      } finally {
        setLoading(false);
      }
    };

    // 4) Call finalizePayment
    finalizePayment();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payment Status
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {message}
            </Typography>
          </Box>
        ) : (
          <Typography variant="h6" color={error ? "error" : "success"}>
            {error || message}
          </Typography>
        )}
      </Paper>

      {!loading && (
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          href="/"
        >
          Return to Home
        </Button>
      )}
    </Box>
  );
};

export default PaymentSuccess;
