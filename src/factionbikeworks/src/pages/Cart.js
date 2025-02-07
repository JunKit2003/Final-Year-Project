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
  const [sessionUser, setSessionUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();

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
  const handleSelectItem = (itemId, stock, quantity) => {
    if (stock === 0 || quantity > stock) return; // Prevent selecting invalid items
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle "Select All" toggle (excluding invalid items)
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      const availableItems = cartItems
        .filter((item) => item.variation?.stock > 0 && item.quantity <= item.variation?.stock)
        .map((item) => item.id);
      setSelectedItems(availableItems);
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

  // Check stock before proceeding to checkout
  const validateStockBeforeCheckout = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${sessionUser.id}`,
        { withCredentials: true }
      );
      const updatedCart = response.data;

      // Check if any selected item has quantity exceeding stock
      let outOfStockItems = [];
      updatedCart.forEach((item) => {
        if (selectedItems.includes(item.id) && item.quantity > item.variation.stock) {
          outOfStockItems.push({
            name: item.variation.product?.name || "Unknown Product",
            availableStock: item.variation.stock,
          });
        }
      });

      // If there are out-of-stock items, refresh cart and alert user
      if (outOfStockItems.length > 0) {
        setCartItems(updatedCart); // Refresh cart with latest stock data

        let errorMessage = "Some items in your cart are no longer available in the requested quantity:\n";
        outOfStockItems.forEach((item) => {
          errorMessage += `- ${item.name}: Only ${item.availableStock} left in stock\n`;
        });

        alert(errorMessage);
        return false; // Prevent checkout
      }

      return true; // Stock is sufficient, allow checkout
    } catch (error) {
      console.error("Error validating stock before checkout:", error);
      alert("Could not verify stock. Please try again.");
      return false;
    }
  };

  // Proceed to checkout with stock validation
  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      alert("Please select valid items to checkout.");
      return;
    }

    const stockIsValid = await validateStockBeforeCheckout();
    if (!stockIsValid) return;

    navigate(
      `/checkoutPage?selected=${encodeURIComponent(JSON.stringify(selectedItems))}`
    );
  };

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

  if (!cartItems || cartItems.length === 0) {
    return (
      <>
        <Header />
        <Box
          sx={{
            bgcolor: "background.default",
            color: "text.primary",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
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
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h4" gutterBottom>
          My Cart
        </Typography>

        <FormControlLabel
          control={<Checkbox checked={selectAll} onChange={handleSelectAll} />}
          label="Select All"
        />

        <Grid container spacing={3}>
          {cartItems.map((item) => {
            const variation = item.variation || {};
            const product = variation.product || {};
            const isOutOfStock = variation.stock === 0;
            const exceedsStock = item.quantity > variation.stock;

            return (
              <Grid item xs={12} md={6} key={item.id}>
                <Paper
                  elevation={3}
                  sx={{
                    bgcolor: isOutOfStock || exceedsStock ? "grey.300" : "background.paper",
                    opacity: isOutOfStock || exceedsStock ? 0.5 : 1,
                  }}
                >
                  <Card sx={{ bgcolor: isOutOfStock || exceedsStock ? "grey.300" : "background.paper" }}>
                    <CardContent>
                      <Typography variant="h6">{product.name || "Unnamed Product"}</Typography>
                      <Typography variant="body1">Price: RM{variation.price}</Typography>
                      <Typography variant="body2">Quantity: {item.quantity}</Typography>
                      <Typography variant="body2" color={isOutOfStock || exceedsStock ? "error" : "textPrimary"}>
                        {isOutOfStock ? "Out of Stock" : exceedsStock ? `Only ${variation.stock} available!` : "In Stock"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Box textAlign="center" mt={4}>
          <Button variant="contained" color="primary" onClick={handleCheckout} disabled={selectedItems.length === 0}>
            Proceed to Checkout
          </Button>
        </Box>
      </Box>
    </div>
  );
};

export default Cart;
