import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

const Cart = () => {
  const [sessionUser, setSessionUser] = useState(null);  // ← Store authenticated user
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();

  // 1) Fetch the user from /api/account/authenticate (POST)
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );
        setSessionUser(response.data.user);
      } catch (error) {
        console.error("Error authenticating user:", error);
      }
    };

    authenticateUser();
  }, []);

  // 2) Once we have the user, fetch their cart
  useEffect(() => {
    if (!sessionUser || !sessionUser.id) return;

    const fetchCartItems = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${sessionUser.id}`,
          { withCredentials: true }
        );
        setCartItems(response.data);
      } catch (error) {
        console.error("Error fetching cart items:", error);
      }
    };

    fetchCartItems();
  }, [sessionUser]);

  // Handle selecting/deselecting an individual item
  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle "Select All" toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  // Remove an item from the cart
  const handleRemove = async (cartItemId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${cartItemId}`,
        { withCredentials: true }
      );
      setCartItems((prevItems) =>
        prevItems.filter((item) => item.id !== cartItemId)
      );
    } catch (error) {
      console.error("Error removing cart item:", error);
    }
  };

  // Proceed to checkout without using localStorage
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select items to checkout.");
      return;
    }

    // Option 1: Pass selectedItems in a URL param
    // navigate(`/checkoutPage?selectedItems=${encodeURIComponent(JSON.stringify(selectedItems))}`);

    // Option 2: Use a global state management (Redux/Context) to store selectedItems

    // For now, we'll use a simple param approach:
    navigate(
      `/checkoutPage?selected=${encodeURIComponent(JSON.stringify(selectedItems))}`
    );
  };

  // If user not yet authenticated or cart not fetched, optionally show a loading message
  if (!sessionUser) {
    return (
      <>
        <Header />
        <Box textAlign="center" mt={4}>
          <Typography variant="h5">Authenticating user...</Typography>
        </Box>
      </>
    );
  }

  // If the cart is empty, show a message
  if (!cartItems || cartItems.length === 0) {
    return (
      <>
        <Header />
        <Box 
  sx={{ 
    bgcolor: "background.default", 
    color: "text.primary", 
    minHeight: "100vh",  // Ensures full-page height
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center"
  }}
>
  <Typography variant="h5">Your cart is empty.</Typography>
</Box>


      </>
    );
  }

  return (
    <div>
      <Header />
      <Box 
      sx={{ 
        p: 4, 
        bgcolor: "background.default", 
        color: "text.primary", 
        minHeight: "100vh",  // Ensures full height
        display: "flex", 
        flexDirection: "column" 
      }}
>

        <Typography variant="h4" gutterBottom>
          My Cart
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={selectAll}
              onChange={handleSelectAll}
            />
          }
          label="Select All"
        />

        <Grid container spacing={3}>
          {cartItems.map((item) => {
            const variation = item.variation || {};
            const product = variation.product || {};

            return (
              <Grid item xs={12} md={6} key={item.id}>
              <Paper elevation={3} sx={{ bgcolor: "background.paper" }}>
                <Card sx={{ bgcolor: "background.paper" }}>
                    <CardContent>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                          />
                        }
                        label="Select"
                      />
                      <Typography variant="h6">
                        {product.name || "Unnamed Product"}
                      </Typography>
                      <Typography variant="body1">
                        Price: RM{variation.price}
                      </Typography>
                      <Typography variant="body2">
                        Quantity: {item.quantity}
                      </Typography>
                      <Typography variant="body2">
                        Variation: {variation.name || "N/A"}
                      </Typography>

                      <Button
                        variant="contained"
                        color="error"
                        sx={{ mt: 2 }}
                        onClick={() => handleRemove(item.id)}
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Box textAlign="center" mt={4}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCheckout}
            disabled={selectedItems.length === 0}
          >
            Proceed to Checkout
          </Button>
        </Box>
      </Box>
    </div>
  );
};

export default Cart;
