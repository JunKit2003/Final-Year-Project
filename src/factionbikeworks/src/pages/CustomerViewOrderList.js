import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Button } from "@mui/material";
import Header from "../components/Header";

const CustomerViewOrderList = () => {
  const { uid, orderId } = useParams();
  const navigate = useNavigate();

  const [sessionUser, setSessionUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Authenticate User on Mount
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );

        if (!response.data.user) {
          navigate("/login");
          return;
        }

        setSessionUser(response.data.user);
      } catch (err) {
        console.error("Error authenticating user:", err);
        navigate("/login");
      }
    };

    authenticateUser();
  }, [navigate]);

  // Fetch Order + Validate Access
  useEffect(() => {
    if (!sessionUser || !sessionUser.id) return;

    const routeUserId = Number(uid);

    if (sessionUser.id !== routeUserId) {
      setError("You do not have permission to view this order.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const payload = { orderId: Number(orderId), userId: sessionUser.id };

        const orderResponse = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/getCustomerOrder`,
          payload,
          { withCredentials: true }
        );

        const fetchedOrder = orderResponse.data.order;
        if (!fetchedOrder) {
          setError("Order not found or you do not have permission.");
          return;
        }

        setOrder(fetchedOrder);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to fetch the order or unauthorized access.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [sessionUser, uid, orderId]);

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

  // Loading State
  if (loading) {
    return (
      <Box>
        <Header />
        <Box sx={{ p: 3 }}>
          <Typography>Loading order details...</Typography>
        </Box>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box>
        <Header />
        <Box sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Box>
    );
  }

  // No Order Found
  if (!order) {
    return (
      <Box>
        <Header />
        <Box sx={{ p: 3 }}>
          <Typography color="error">Order not found.</Typography>
        </Box>
      </Box>
    );
  }

  // Render Read-Only Order Details
  return (
    <Box>
      <Header />
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Order Details
        </Typography>

        <Paper sx={{ p: 2, my: 2 }}>
          <Typography>Order ID: {order.id}</Typography>
          <Typography>Status: {order.status}</Typography>
          <Typography>Total Amount: RM{order.totalAmount}</Typography>
          <Typography>Shipping Address: {order.shippingAddress}</Typography>
          {order.recipientName && <Typography>Recipient: {order.recipientName}</Typography>}

          <Typography variant="h6" sx={{ mt: 3 }}>
            Items:
          </Typography>
          {order.items && order.items.length > 0 ? (
            order.items.map((item) => {
              const variation = getVariationDetails(item.variationId);

              return (
                <Paper key={item.id} sx={{ p: 2, my: 1 }}>
                  <Typography>Item ID: {item.id}</Typography>
                  <Typography>Variation ID: {item.variationId}</Typography>
                  <Typography>Quantity: {item.quantity}</Typography>
                  <Typography>Price: RM{item.price}</Typography>

                  {variation ? (
                    <>
                      <Typography>Product Name: {variation.productName}</Typography>
                      <Typography>Brand: {variation.productBrand}</Typography>
                      <Typography>Variation Name: {variation.variationName}</Typography>
                      <Typography>Variation Price: RM{variation.variationPrice}</Typography>
                      {variation.images.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography>Images:</Typography>
                          {variation.images.map((imgUrl, idx) => (
                            <Box
                              key={idx}
                              component="img"
                              src={imgUrl}
                              alt="Variation"
                              sx={{ maxWidth: 100, m: 1 }}
                            />
                          ))}
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography color="error">
                      Could not find product data for variation ID {item.variationId}
                    </Typography>
                  )}
                </Paper>
              );
            })
          ) : (
            <Typography>No items found for this order.</Typography>
          )}
        </Paper>

        <Button variant="contained" onClick={() => navigate("/orderHistory")}>
          Back to Order History
        </Button>
      </Box>
    </Box>
  );
};

export default CustomerViewOrderList;
