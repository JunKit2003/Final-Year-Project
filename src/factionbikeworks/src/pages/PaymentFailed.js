import React, { useEffect, useState } from "react";
import axios from "axios";
import { CircularProgress, Box, Typography, Button } from "@mui/material";
import Header from "../components/Header";
import Footer from "../components/Footer";

const PaymentFailed = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Canceling order...");
  const [error, setError] = useState("");

  useEffect(() => {
    // 1) Authenticate user
    axios
      .post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
        {},
        { withCredentials: true }
      )
      .then((res) => {
        setSessionUser(res.data.user);
      })
      .catch((err) => {
        setError("Failed to authenticate user.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!sessionUser) return;

    // 2) Get session_id from URL
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setError("No session_id found in URL. Cannot cancel order.");
      setLoading(false);
      return;
    }

    // 3) Call cancelOrder API
    axios
      .delete(`${process.env.REACT_APP_BACKEND_HOST}/api/cart/cancelOrder`, {
        data: {
          session_id: sessionId,
          user_id: sessionUser.id,
        },
        withCredentials: true,
      })
      .then(() => {
        setMessage("Order canceled. You have not been charged.");
      })
      .catch((err) => {
        setError("Failed to cancel order. " + (err.response?.data?.message || ""));
      })
      .finally(() => setLoading(false));
  }, [sessionUser]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography variant="h4">Processing Transaction...</Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>{message}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Box sx={{ flex: 1, p: 3, textAlign: "center" }}>
        <Typography variant="h4">Payment Failed</Typography>
        <Typography color={error ? "error" : "success"} sx={{ mt: 2 }}>
          {error || message}
        </Typography>

        {/* Return to Home Button */}
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          onClick={() => window.location.href = "/"}
        >
          Return to Home
        </Button>
      </Box>

      <Footer />
    </Box>
  );
};

export default PaymentFailed;
