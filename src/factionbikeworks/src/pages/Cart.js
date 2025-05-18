import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
import Header from "../components/Header";
import Footer from "../components/Footer";

// Helper Component: ProductImage
const ProductImage = ({ productId, sku, fallbackUrl, style }) => {
  const possibleExtensions = [".jpg", ".png", ".jpeg", ".gif", ".webp", ];
  const [extIndex, setExtIndex] = useState(0);

  // Construct base URL without extension
  const baseUrl = `${process.env.REACT_APP_BACKEND_HOST}/images/product_images/${productId}/${sku}/image_1`;

  const handleError = () => {
    // If there are more extensions to try, move to the next one
    if (extIndex < possibleExtensions.length - 1) {
      setExtIndex(extIndex + 1);
    }
  };

  return (
    <img
      src={baseUrl + possibleExtensions[extIndex]}
      onError={handleError}
      alt="Product"
      style={style}
      // If all extensions fail, the browser will display a broken image.
      // You could add additional logic to display fallbackUrl if needed.
      onLoad={(e) => {
        // Optional: if image loads, nothing to do.
      }}
    />
  );
};

const Cart = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();
  const defaultImageUrl = "https://via.placeholder.com/300";

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
        .filter(
          (item) =>
            item.variation?.stock > 0 &&
            item.quantity <= item.variation?.stock
        )
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

  // Proceed to checkout
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select valid items to checkout.");
      return;
    }
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
        <Footer />
      </>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Box
        sx={{
          flex: 1,
          p: 4,
          bgcolor: "background.default",
          color: "text.primary",
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

            // Build image URL using product.id and variation.sku with fallback handled in ProductImage
            return (
              <Grid item xs={12} md={6} key={item.id}>
                <Paper
                  elevation={3}
                  sx={{
                    bgcolor:
                      isOutOfStock || exceedsStock
                        ? "grey.300"
                        : "background.paper",
                    opacity: isOutOfStock || exceedsStock ? 0.5 : 1,
                  }}
                >
                  <Card
                    sx={{
                      bgcolor:
                        isOutOfStock || exceedsStock
                          ? "grey.300"
                          : "background.paper",
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {/* Left: Image using ProductImage component */}
                        <Box sx={{ width: 120, height: 120, mr: 2 }}>
                          {product.id && variation.sku ? (
                            <ProductImage
                              productId={product.id}
                              sku={variation.sku}
                              fallbackUrl={defaultImageUrl}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",
                                height: "100%",
                                bgcolor: "#eee",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Typography>No Image</Typography>
                            </Box>
                          )}
                        </Box>
                        {/* Right: Details */}
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onChange={() =>
                                  handleSelectItem(
                                    item.id,
                                    variation.stock,
                                    item.quantity
                                  )
                                }
                                disabled={isOutOfStock || exceedsStock}
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
                          <Typography
                            variant="body2"
                            color={isOutOfStock || exceedsStock ? "error" : "textPrimary"}
                          >
                            {isOutOfStock
                              ? "Out of Stock"
                              : exceedsStock
                              ? `Only ${variation.stock} available!`
                              : "In Stock"}
                          </Typography>
                          <Button
                            variant="contained"
                            color="error"
                            sx={{ mt: 2 }}
                            onClick={() => handleRemove(item.id)}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
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
      <Footer />
    </Box>
  );
};

export default Cart;
