import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Button } from "@mui/material";
import Header from "../components/Header";
import Footer from "../components/Footer";

const OrderHistory = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Authenticate the user on mount
  useEffect(() => {
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

  // Fetch user orders once the sessionUser is set
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

  // Fetch Products Data for Order Items
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsResp = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`
        );
        setProductData(productsResp.data.products || []);
      } catch (err) {
        console.error("Error fetching product data:", err);
      }
    };

    fetchProducts();
  }, []);

  // Helper Function: Find Variation Details for Ordered Items
  const getVariationDetails = (variationId) => {
    for (let product of productData) {
      for (let variation of product.variations) {
        if (variation.id === variationId) {
          return {
            productName: product.name,
            productBrand: product.brand,
            variationName: variation.name,
            variationPrice: variation.price,
            images: variation.images?.files || [],
          };
        }
      }
    }
    return null;
  };

  if (loading) {
    return (
      <>
        <Header />
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
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
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography variant="h5" color="error">
            {error}
          </Typography>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Order History
        </Typography>

        {orders.length === 0 ? (
          <Typography>You have no orders yet.</Typography>
        ) : (
          orders.map((order) => (
            <Paper key={order.id} sx={{ p: 2, my: 2 }}>
              {/* Render each order's items */}
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => {
                  const variation = getVariationDetails(item.variationId);
                  const itemTotal = (item.price * item.quantity).toFixed(2);
                  return (
                    <Paper
                      key={item.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2,
                        my: 1,
                      }}
                    >
                      {/* Left: Image */}
                      {variation && variation.images && variation.images.length > 0 ? (
                        <Box sx={{ width: 120, height: 120, mr: 2 }}>
                          <img
                            src={variation.images[0]}
                            alt="Product"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: 120,
                            height: 120,
                            mr: 2,
                            bgcolor: "#eee",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography>No Image</Typography>
                        </Box>
                      )}

                      {/* Right: Details */}
                      <Box>
                        <Typography variant="subtitle1">
                          Product Name: {variation ? variation.productName : "N/A"}
                        </Typography>
                        <Typography variant="subtitle1">
                          Variation: {variation ? variation.variationName : "N/A"}
                        </Typography>
                        <Typography variant="subtitle1">
                          Quantity: {item.quantity}
                        </Typography>
                        <Typography variant="subtitle1">
                          Amount Paid: RM{itemTotal}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })
              ) : (
                <Typography>No items found for this order.</Typography>
              )}

              {/* View Details Button */}
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

      <Footer />
    </Box>
  );
};

export default OrderHistory;
