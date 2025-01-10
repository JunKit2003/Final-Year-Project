import React, { useState, useEffect } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
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
  const [cartItems, setCartItems] = useState([]);
  const [address, setAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Retrieve userId from localStorage (fall back to 1 if not found)
  const userId = localStorage.getItem("userId") || 1;

  useEffect(() => {
    fetchSelectedCartItems();
  }, []);

  const fetchSelectedCartItems = async () => {
    try {
      const selectedItems =
        JSON.parse(localStorage.getItem("selectedItems")) || [];

      if (selectedItems.length === 0) {
        console.warn("No selected items found. Redirecting to Cart...");
        window.location.href = "/cart";
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${userId}`
      );

      const filteredItems = response.data.filter((item) =>
        selectedItems.includes(item.id)
      );

      setCartItems(filteredItems);

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

  const handlePlaceOrder = async () => {
    if (!address) {
      alert("Please enter a shipping address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Prepare payload for backend
      const payload = {
        user_id: userId,
        items: cartItems.map((item) => ({
          variation_id: item.variation.id,
          quantity: item.quantity,
        })),
        shipping_address: address,
        total_amount: totalAmount,
      };

      // Call the backend to create an order
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/createOrder`,
        payload
      );

      // Use the environment variable (NOT a literal string)
      const apiKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;

      // Log the Stripe API key to confirm it's not undefined
      console.log("Stripe API Key:", apiKey);

      if (!apiKey || typeof apiKey !== "string") {
        throw new Error("Stripe API key is missing or invalid.");
      }

      // Initialize Stripe
      const stripe = await loadStripe(apiKey);
      if (!stripe) {
        throw new Error("Stripe failed to initialize. Please try again.");
      }

      // Redirect to Stripe Checkout using the returned sessionId
      await stripe.redirectToCheckout({ sessionId: response.data.sessionId });
    } catch (error) {
      console.error("Error placing order:", error);
      setError("Failed to place order. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      {error && (
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
      )}

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
            <Grid item xs={6}>
              {item.variation.product.name}
            </Grid>
            <Grid item xs={3}>
              x{item.quantity}
            </Grid>
            <Grid item xs={3}>
              RM{item.variation.price * item.quantity}
            </Grid>
          </Grid>
        ))}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6">Total: RM{totalAmount}</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Payment Method</Typography>
        <Typography>Stripe (Credit/Debit Card)</Typography>
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
  );
};

export default CheckoutPage;
