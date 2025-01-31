import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header"; // Import Header
import { Box, Typography, Paper, Button } from "@mui/material";

const OrderHistory = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1) Authenticate the user
    const authenticateUser = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );

        if (response.status !== 200 || !response.data.user) {
          window.location.href = "/login";
          return;
        }

        setSessionUser(response.data.user);
      } catch (err) {
        console.error("Error authenticating user:", err);
        window.location.href = "/login";
      }
    };

    authenticateUser();
  }, []);

  useEffect(() => {
    if (!sessionUser || !sessionUser.id) return;

    const fetchUserOrders = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/getUserOrders/${sessionUser.id}`,
          { withCredentials: true }
        );

        setOrders(response.data.orders || []);
      } catch (err) {
        console.error("Error fetching user orders:", err);
        setError("Failed to load your order history.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [sessionUser]);

  if (loading) {
    return (
      <Box>
        <Header /> {/* Include Header */}
        <Box sx={{ p: 3 }}>
          <Typography>Loading your order history...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Header />
        <Box sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Header /> {/* Include Header */}
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Order History
        </Typography>

        {orders.length === 0 ? (
          <Typography>You have no orders yet.</Typography>
        ) : (
          orders.map((order) => (
            <Paper key={order.id} sx={{ p: 2, my: 2 }}>
              <Typography>Order ID: {order.id}</Typography>
              <Typography>Status: {order.status}</Typography>
              <Typography>Total Amount: RM{order.totalAmount}</Typography>
              <Typography>
                Items: {Array.isArray(order.items) ? order.items.length : 0}
              </Typography>
              <Typography>Shipping Address: {order.shippingAddress}</Typography>
              {order.recipientName && (
                <Typography>Recipient: {order.recipientName}</Typography>
              )}

              <Button
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() =>
                  (window.location.href = `/vieworderlist/${order.id}`)
                }
              >
                View Details
              </Button>
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};

export default OrderHistory;
