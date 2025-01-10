import React, { useEffect, useState } from "react";
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
  const [sessionUser, setSessionUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [address, setAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Fetch session user by POSTing to /api/account/authenticate
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
        // Optionally redirect to login if not authenticated
      }
    };
    fetchSessionUser();
  }, []);

  // 2) Parse selected item IDs from the URL query parameter: "?selected=[...]"
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
        console.warn("Empty or invalid selected items. Redirecting to Cart...");
        window.location.href = "/cart";
        return;
      }
      setSelectedItemIds(parsedIds);
    } catch (err) {
      console.error("Failed to parse selected item IDs:", err);
      window.location.href = "/cart";
    }
  }, []);

  // 3) Once we have the sessionUser + selectedItemIds, fetch the cart and filter
  useEffect(() => {
    if (!sessionUser || !sessionUser.id) return;
    if (selectedItemIds.length === 0) return; // or wait for them to load

    const fetchSelectedCartItems = async () => {
      try {
        // Fetch user's full cart
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${sessionUser.id}`,
          { withCredentials: true }
        );

        // Filter only the selected items
        const fullCart = response.data;
        const filteredItems = fullCart.filter((item) =>
          selectedItemIds.includes(item.id)
        );

        // Update state
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
    if (!address) {
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
        items: cartItems.map((item) => ({
          variation_id: item.variation.id,
          quantity: item.quantity,
        })),
        shipping_address: address,
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
      setError("Failed to place order. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  // If user is not authenticated or we haven't finished loading
  if (!sessionUser) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">Authenticating user...</Typography>
      </Box>
    );
  }

  // If we have no cart items (meaning either empty or not loaded yet)
  if (cartItems.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">No selected items found in your cart.</Typography>
      </Box>
    );
  }

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
