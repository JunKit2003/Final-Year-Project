import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const ViewOrderList = () => {
  const { orderId } = useParams();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [order, setOrder] = useState(null);
  const [productData, setProductData] = useState([]);

  // Helper function to redirect non-admin users to home
  const goToHomePage = () => {
    window.location.href = "/";
  };

  // 1) Check if Admin
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );

        if (response.status !== 200) {
          setIsAuthorized(false);
          goToHomePage();
          return;
        }

        const data = response.data;
        if (data.user && data.user.category === "Admin") {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          goToHomePage();
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
        goToHomePage();
      }
    };

    checkAuthorization();
  }, []);

  // 2) Fetch Orders + Products once Admin check is done
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        // Fetch all orders
        const ordersResp = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/cart/getOrders`
        );
        const allOrders = ordersResp.data.orders || [];

        // Find the order with the matching orderId
        const foundOrder = allOrders.find(
          (o) => o.id === parseInt(orderId, 10)
        );
        setOrder(foundOrder || null);

        // Fetch all products (with their variations)
        const productsResp = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`
        );
        const allProducts = productsResp.data.products || [];
        setProductData(allProducts);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized, orderId]);

  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return <Typography>Loading order data...</Typography>;
  }

  if (!order) {
    return <Typography>No order found with ID #{orderId}</Typography>;
  }

  // Helper to find Variation details
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

  // Handle "Complete Order" button press: open confirmation dialog
  const handleCompleteOrderClick = () => {
    setConfirmDialogOpen(true);
  };

  // Confirm completing the order
  const handleConfirmCompleteOrder = async () => {
    try {
      setCompleting(true);
      setConfirmDialogOpen(false);

      await axios.patch(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/fulfillOrders/${order.id}`,
        {}, // PATCH requires a body, even if empty
        { withCredentials: true } // Ensures session cookies are sent
      );
      

      // Update state to "Completed"
      setOrder({ ...order, status: "Completed" });
    } catch (err) {
      console.error("Error completing the order:", err);
    } finally {
      setCompleting(false);
    }
  };

  // Close the confirmation dialog
  const handleDialogClose = () => {
    setConfirmDialogOpen(false);
  };

  // Go back to Admin Panel
  const handleBackToAdmin = () => {
    window.location.href = "/admin";
  };

  // Render order info
  return (
    <Box sx={{ p: 3 }}>
      {/* Back to Admin Button */}
      <Button variant="outlined" color="secondary" onClick={handleBackToAdmin}>
        Back to Admin Panel
      </Button>

      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
        Order Details
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography>Order ID: {order.id}</Typography>
        <Typography>User ID: {order.userId}</Typography>

        {/* Display the recipientName if present */}
        {order.recipientName && (
          <Typography>Recipient Name: {order.recipientName}</Typography>
        )}

        <Typography>Shipping Address: {order.shippingAddress}</Typography>
        <Typography>Total: RM{order.totalAmount}</Typography>
        <Typography>Status: {order.status}</Typography>

        {/* If status is "Paid", show a "Complete Order" button */}
        {order.status === "Paid" && (
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleCompleteOrderClick}
            disabled={completing}
          >
            {completing ? "Completing..." : "Complete Order"}
          </Button>
        )}

        {order.status === "Completed" && (
          <Typography sx={{ mt: 2 }} color="success.main">
            Order is already completed
          </Typography>
        )}

        <Typography variant="h6" sx={{ mt: 3 }}>
          Items:
        </Typography>
        {order.items && order.items.length > 0 ? (
          order.items.map((item) => {
            const variation = getVariationDetails(item.variationId);
            return (
              <Paper key={item.id} sx={{ p: 2, mt: 1 }}>
                <Typography>ID: {item.id}</Typography>
                <Typography>Variation ID: {item.variationId}</Typography>
                <Typography>Quantity: {item.quantity}</Typography>
                <Typography>Unit Price: RM{item.price}</Typography>

                {variation ? (
                  <>
                    <Typography>
                      Product Name: {variation.productName}
                    </Typography>
                    <Typography>Brand: {variation.productBrand}</Typography>
                    <Typography>
                      Variation Name: {variation.variationName}
                    </Typography>
                    <Typography>
                      Variation Price: RM{variation.variationPrice}
                    </Typography>
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
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Complete Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this order as{" "}
            <strong>Completed</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCompleteOrder}
            color="primary"
            variant="contained"
          >
            Yes, Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewOrderList;
