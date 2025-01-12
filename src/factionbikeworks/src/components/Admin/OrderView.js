import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Pagination } from "@mui/material";
import LoadingButton from "../LoadingButton";

const OrderView = ({
  orders,
  handleFulfillOrder, // Called when user clicks "Fulfill Order"
  isUpdating,         // Indicates if an order-fulfill operation is in progress
  itemsPerPage = 6,
  resetPage,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const shouldResetPage = useRef(false);

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

  // Slice the orders to show for current page
  const currentOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
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
        {currentOrders.map((order) => (
          <Box
            key={order.id}
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
            {/* Order details */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Order #{order.id}
            </Typography>
            <Typography>User ID: {order.userId}</Typography>
            <Typography>Shipping: {order.shippingAddress}</Typography>
            <Typography>Total: RM{order.totalAmount}</Typography>
            <Typography>Status: {order.status}</Typography>
            <Typography>
              Items: {Array.isArray(order.items) ? order.items.length : 0}
            </Typography>

            {/* Action buttons */}
            <Box sx={{ mt: 2 }}>
              {/* Fulfill Order Button */}
              <LoadingButton
                variant="outlined"
                color="primary"
                onClick={() => handleFulfillOrder(order.id)}
                isLoading={isUpdating}
                disabled={
                  order.status === "Completed" ||
                  order.status === "Fulfilled" ||
                  order.status === "Cancelled"
                }
              >
                {order.status === "Fulfilled" || order.status === "Completed"
                  ? "Fulfilled"
                  : "Fulfill Order"}
              </LoadingButton>
            </Box>
          </Box>
        ))}
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
