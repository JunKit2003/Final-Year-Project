import React, { useEffect, useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import Header from "../components/Header";
import Footer from "../components/Footer"; // ✅ Import Footer component
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";

const CheckoutPage = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [recipientName, setRecipientName] = useState("");
  const [address, setAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Fetch session user
  useEffect(() => {
    const fetchSessionUser = async () => {
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
    fetchSessionUser();
  }, []);

  // 2) Parse selected item IDs from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedStr = params.get("selected");

    if (!selectedStr) {
      console.warn("No selected items found. Redirecting to Cart...");
      window.location.href = "/cart";
      return;
    }

    try {
      const parsedIds = JSON.parse(selectedStr);
      if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
        console.warn("Invalid selected items. Redirecting to Cart...");
        window.location.href = "/cart";
        return;
      }
      setSelectedItemIds(parsedIds);
    } catch (err) {
      console.error("Failed to parse selected item IDs:", err);
      window.location.href = "/cart";
    }
  }, []);

  // 3) Fetch selected cart items
  useEffect(() => {
    if (!sessionUser || !sessionUser.id) return;
    if (selectedItemIds.length === 0) return;

    const fetchSelectedCartItems = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${sessionUser.id}`,
          { withCredentials: true }
        );

        const fullCart = response.data;
        const filteredItems = fullCart.filter((item) =>
          selectedItemIds.includes(item.id)
        );

        setCartItems(filteredItems);

        // Calculate total
        const total = filteredItems.reduce(
          (acc, item) => acc + item.variation.price * item.quantity,
          0
        );
        setTotalAmount(total);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setError("Failed to fetch cart items. Please try again.");
      }
    };

    fetchSelectedCartItems();
  }, [sessionUser, selectedItemIds]);

  // 4) Handle placing the order
  const handlePlaceOrder = async () => {
    if (!recipientName.trim()) {
      alert("Please enter a recipient name.");
      return;
    }
    if (!address.trim()) {
      alert("Please enter a shipping address.");
      return;
    }
    if (!sessionUser || !sessionUser.id) {
      alert("User is not authenticated. Please log in.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        user_id: sessionUser.id,
        recipient_name: recipientName,
        shipping_address: address,
        items: cartItems.map((item) => ({
          variation_id: item.variation.id,
          quantity: item.quantity,
        })),
        total_amount: totalAmount,
      };

      // Create an order
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/createOrder`,
        payload,
        { withCredentials: true }
      );

      // Initialize Stripe
      const apiKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
      if (!apiKey || typeof apiKey !== "string") {
        throw new Error("Stripe API key is missing or invalid.");
      }

      const stripe = await loadStripe(apiKey);
      if (!stripe) {
        throw new Error("Stripe failed to initialize. Please try again.");
      }

      // Redirect to Stripe Checkout
      await stripe.redirectToCheckout({ sessionId: response.data.sessionId });
    } catch (error) {
      console.error("Error placing order:", error);
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionUser) {
    return (
      <>
        <Header />
        <Box sx={{ p: 4, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography variant="h6">Authenticating user...</Typography>
        </Box>
        <Footer />
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Header />
        <Box sx={{ p: 4, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography variant="h6">No selected items found in your cart.</Typography>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Box sx={{ flex: 1, p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Checkout
        </Typography>

        {error && (
          <Typography variant="body1" color="error" gutterBottom>
            {error}
          </Typography>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Recipient Name</Typography>
          <TextField
            fullWidth
            label="Recipient Name"
            variant="outlined"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            margin="normal"
          />
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Shipping Address</Typography>
          <TextField
            fullWidth
            label="Shipping Address"
            variant="outlined"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            margin="normal"
          />
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Order Summary</Typography>
          {cartItems.map((item) => (
            <Grid container key={item.id} spacing={1}>
              <Grid item xs={6}>{item.variation.product.name}</Grid>
              <Grid item xs={3}>x{item.quantity}</Grid>
              <Grid item xs={3}>RM{item.variation.price * item.quantity}</Grid>
            </Grid>
          ))}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Total: RM{totalAmount}</Typography>
        </Paper>

        <Button
          variant="contained"
          color="primary"
          onClick={handlePlaceOrder}
          disabled={loading}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : "Place Order"}
        </Button>
      </Box>

      <Footer />
    </Box>
  );
};

export default CheckoutPage;


// Add a feature where if a user clicks on previous link while paying on stripe, it redirects them to payment failed page 