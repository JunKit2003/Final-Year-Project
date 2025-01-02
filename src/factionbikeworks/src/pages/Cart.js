import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header"; // Import the Header component
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);

  // Get userId (normally from auth context or localStorage)
  const userId = localStorage.getItem("userId") || 1;

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch cart items on component mount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCartItems();
    // eslint-disable-next-line
  }, []);

  const fetchCartItems = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${userId}`,
        {
          withCredentials: true,
        }
      );
      setCartItems(response.data);
    } catch (error) {
      console.error("Error fetching cart items:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle removing an item from cart
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRemove = async (cartItemId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${cartItemId}`,
        {
          withCredentials: true,
        }
      );
      // Update state to reflect the removal
      setCartItems((prevItems) =>
        prevItems.filter((item) => item.id !== cartItemId)
      );
    } catch (error) {
      console.error("Error removing cart item:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // If no items in the cart
  // ─────────────────────────────────────────────────────────────────────────────
  if (!cartItems || cartItems.length === 0) {
    return (
      <>
        <Header />
        <Box textAlign="center" mt={4}>
          <Typography variant="h5">Your cart is empty.</Typography>
        </Box>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Cart Items
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <Header /> {/* Header imported from Home Page */}
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Cart
        </Typography>

        <Grid container spacing={3}>
          {cartItems.map((item) => {
            // If you included Variation + Product data in your response:
            const variation = item.variation || {};
            const product = variation.product || {};

            return (
              <Grid item xs={12} md={6} key={item.id}>
                <Paper elevation={3}>
                  <Card>
                    <CardContent>
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
      </Box>
    </div>
  );
};

export default Cart;
