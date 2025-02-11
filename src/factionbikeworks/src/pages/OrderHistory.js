import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import Header from "../components/Header";
import Footer from "../components/Footer"; // ✅ Import Footer component
import { Box, Typography, Paper, Button } from "@mui/material";

const OrderHistory = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate(); // ✅ Initialize navigate

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
      <>
        <Header />
        <Box sx={{ p: 3, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography variant="h5">Loading your order history...</Typography>
        </Box>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Box sx={{ p: 3, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography variant="h5" color="error">{error}</Typography>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3 }}>
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

              {/* ✅ Pass both userId and orderId in the URL */}
              <Button
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => navigate(`/customerViewOrderList/${order.userId}/${order.id}`)}
              >
                View Details
              </Button>
            </Paper>
          ))
        )}
      </Box>

      {/* Footer Component */}
      <Footer />
    </Box>
  );
};

export default OrderHistory;
