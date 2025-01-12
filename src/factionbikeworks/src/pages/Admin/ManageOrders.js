import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import LoadingButton from "../../components/LoadingButton";
import FilterSearch from "../../components/FilterSearch";
import OrderView from "../../components/Admin/OrderView"; // You’ll create something like ProductView, but for Orders
import { formatInput } from "../../utils";

/**
 * ManageOrders:
 * - Fetches and displays a list of orders.
 * - Allows basic filtering (e.g. by status, user ID).
 * - Provides a button on each order to mark it as fulfilled/completed.
 */

const ManageOrders = () => {
  // State for orders + filtered orders
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Optional: store distinct statuses or user IDs for filtering
  const [statusOptions, setStatusOptions] = useState([]);
  const [resetPage, setResetPage] = useState(false);

  // State for UI feedback
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState(null);
  const [severity, setSeverity] = useState("error");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const autoHideDuration = 6000;

  // Example filter config (similar to ManageProducts)
  // Adjust as needed for your order fields
  const filters = [
    { label: "Status", value: "status" },
    { label: "User ID", value: "userId" },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  // 1) Fetch all orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Example endpoint – adjust to match your backend route
      // Could be POST or GET, depending on your design
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/getOrders`
      );

      // Suppose the response data has { orders: [...] }
      const ordersFetched = response.data.orders || [];
      setOrders(ordersFetched);
      setFilteredOrders(ordersFetched);

      // If you want status-based filtering, gather distinct statuses
      const uniqueStatuses = Array.from(
        new Set(ordersFetched.map((order) => formatInput(order.status)))
      );
      setStatusOptions(uniqueStatuses);
    } catch (error) {
      console.log(error);
      setSnackbarMessage(
        error.response?.data?.message || "Error fetching orders!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // 2) Handle filter + search
  // Similar logic to ManageProducts => FilterSearch
  const handleSearch = (searchCriteria) => {
    const { searchQueries, selectedFilters } = searchCriteria;

    let filtered = orders;

    if (selectedFilters.includes("status") && searchQueries.status) {
      filtered = filtered.filter((order) =>
        order.status
          .toLowerCase()
          .includes(searchQueries.status.toLowerCase())
      );
    }

    if (selectedFilters.includes("userId") && searchQueries.userId) {
      filtered = filtered.filter(
        (order) =>
          order.userId &&
          order.userId.toString().includes(searchQueries.userId.toString())
      );
    }

    setFilteredOrders(filtered);
    setResetPage(true);
  };

  // 3) Mark an order as “Fulfilled” (or “Completed”)
  // Example endpoint => /api/order/fulfill/:orderId
  // Adjust as needed
  const handleFulfillOrder = async (orderId) => {
    setIsUpdating(true);
    try {
      await axios.patch(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/fulfill/${orderId}`,
        {}
      );
      // Refresh data or update local state
      setSnackbarMessage("Order marked as fulfilled!");
      setSeverity("success");
      setOpenSnackbar(true);

      // Update state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "Fulfilled" } : o
        )
      );
      setFilteredOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "Fulfilled" } : o
        )
      );
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Error fulfilling order!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Close the snackbar
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setSnackbarMessage(null);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Title */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Manage Orders</Typography>
      </Box>

      {/* Search and Filter Component */}
      <FilterSearch
        filters={filters}
        onSearch={handleSearch}
        categoryOptions={statusOptions} // or rename to statusOptions
      />

      {/* OrderView (similar to ProductView) – displays a paginated list of orders */}
      <OrderView
        orders={filteredOrders}
        handleFulfillOrder={handleFulfillOrder}
        isUpdating={isUpdating}
        itemsPerPage={50}
        resetPage={resetPage}
      />

      {/* Snackbar for displaying errors or success messages */}
      <PopupDisplay
        message={snackbarMessage}
        severity={severity}
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        autoHideDuration={autoHideDuration}
      />
    </Box>
  );
};

export default ManageOrders;
