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
  const [sessionUser, setSessionUser] = useState(null);
  const [message, setMessage] = useState("Verifying your payment...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1) Authenticate user to get sessionUser
    const authenticateUser = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );
        setSessionUser(response.data.user);
      } catch (err) {
        console.error("Error authenticating user:", err);
      }
    };
    authenticateUser();
  }, []);

  useEffect(() => {
    // Only proceed once we have the sessionUser
    if (!sessionUser || !sessionUser.id) return;

    // 2) Extract Stripe session ID from the URL
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    if (!sessionId) {
      setMessage("No session ID found in the URL. Could not verify payment.");
      setLoading(false);
      return;
    }

    // 3) Call the backend to finalize payment
    const finalizePayment = async () => {
      try {
        await axios.patch(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/markOrderPaidAndClearCart`,
          {
            session_id: sessionId,
            user_id: sessionUser.id, // ← Use sessionUser.id
          },
          { withCredentials: true }
        );

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

    finalizePayment();
  }, [sessionUser]);

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
