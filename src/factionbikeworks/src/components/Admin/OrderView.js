import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Pagination, Button } from "@mui/material";
import { useNavigate } from "react-router-dom"; // for redirecting

const OrderView = ({
  orders,
  itemsPerPage = 6,
  resetPage,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const shouldResetPage = useRef(false);
  const navigate = useNavigate();

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // If resetPage changes, flag that we should reset
  useEffect(() => {
    if (resetPage) {
      shouldResetPage.current = true;
    }
  }, [resetPage]);

  // If flagged, or if current page is beyond totalPages, reset to page 1
  useEffect(() => {
    if (shouldResetPage.current || currentPage > totalPages) {
      setCurrentPage(1);
      shouldResetPage.current = false;
    }
  }, [totalPages, currentPage]);

  // Slice the orders for the current page
  const currentOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Navigate to /admin/viewOrderList/:orderId
  const handleViewOrder = (orderId) => {
    // Adjust your path if needed:
    // If your route is "/admin/viewOrderList/:orderId":
    navigate(`/admin/viewOrderList/${orderId}`);
  };

  if (orders.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          p: 3,
        }}
      >
        <Typography variant="h6">No orders available!</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 3,
      }}
    >
      {/* Grid of Orders */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "center",
          width: "100%",
        }}
      >
        {currentOrders.map((order) => {
          const {
            id,
            userId,
            shippingAddress,
            totalAmount,
            status,
            items,
            recipientName, // NEW
          } = order;

          return (
            <Box
              key={id}
              sx={{
                width: "300px",
                border: "1px solid grey",
                borderRadius: 2,
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                Order #{id}
              </Typography>
              <Typography>User ID: {userId}</Typography>
              {/* Show recipientName if available */}
              {recipientName && (
                <Typography>Recipient: {recipientName}</Typography>
              )}
              <Typography>Shipping: {shippingAddress}</Typography>
              <Typography>Total: RM{totalAmount}</Typography>
              <Typography>Status: {status}</Typography>
              <Typography>
                Items: {Array.isArray(items) ? items.length : 0}
              </Typography>

              {/* Always show the "View Order" button */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleViewOrder(id)}
                >
                  View Order
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Pagination */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        sx={{ mt: 3 }}
        color="primary"
      />
    </Box>
  );
};

export default OrderView;
