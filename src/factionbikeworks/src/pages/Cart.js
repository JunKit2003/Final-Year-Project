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
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") || 1;

  useEffect(() => {
    // Reset selected items in localStorage
    localStorage.removeItem("selectedItems");

    // Fetch cart items
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/${userId}`,
        { withCredentials: true }
      );
      setCartItems(response.data);
    } catch (error) {
      console.error("Error fetching cart items:", error);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select items to checkout.");
      return;
    }
    localStorage.setItem("selectedItems", JSON.stringify(selectedItems));
    navigate("/checkoutPage");
  };

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

  return (
    <div>
      <Header />
      <Box sx={{ p: 4 }}>
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
                <Paper elevation={3}>
                  <Card>
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
