import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import OrderView from "../../components/Admin/OrderView";
import { API_BASE } from "../../lib/api";

const ManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [resetPage, setResetPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState(null);
  const [severity, setSeverity] = useState("error");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const autoHideDuration = 6000;

  // Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Dropdown filter for Status
  const [selectedStatus, setSelectedStatus] = useState("Paid");

  // Search Inputs
  const [typedUserId, setTypedUserId] = useState("");
  const [typedRecipientName, setTypedRecipientName] = useState("");

  useEffect(() => {
    fetchOrders();
    // Fetch once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/cart/getOrders`
      );
      const ordersFetched = response.data.orders || [];
      setOrders(ordersFetched);
      // Immediately filter for "Paid" status (assuming selectedStatus is "Paid")
      const filtered = ordersFetched.filter(order => order.status === selectedStatus);
      setFilteredOrders(filtered);
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Error fetching orders!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };
  

  // Whenever selectedStatus, typedUserId, or typedRecipientName changes, re-filter the orders
  useEffect(() => {
    filterOrders();
    // eslint-disable-next-line
  }, [selectedStatus, typedUserId, typedRecipientName]);

  // Filtering Logic
  const filterOrders = () => {
    let updated = [...orders];

    // 1) Filter by userId if typed
    if (typedUserId.trim() !== "") {
      updated = updated.filter(
        (order) =>
          order.userId &&
          order.userId.toString().includes(typedUserId.trim())
      );
    }

    // 2) Filter by recipient name if typed
    if (typedRecipientName.trim() !== "") {
      updated = updated.filter(
        (order) =>
          order.recipientName &&
          order.recipientName.toLowerCase().includes(typedRecipientName.trim().toLowerCase())
      );
    }

    // 3) Filter by status if not "All"
    if (selectedStatus !== "All") {
      updated = updated.filter((order) => order.status === selectedStatus);
    }

    setFilteredOrders(updated);
    setResetPage(true);
  };

  // Handle Status Dropdown Change
  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  // Handle User ID Input Change
  const handleUserIdChange = (event) => {
    setTypedUserId(event.target.value);
  };

  // Handle Recipient Name Input Change
  const handleRecipientNameChange = (event) => {
    setTypedRecipientName(event.target.value);
  };

  // Show confirmation dialog
  const handleConfirmFulfill = (orderId) => {
    setSelectedOrderId(orderId);
    setConfirmDialogOpen(true);
  };

  // Actually complete the order
  const handleFulfillOrder = async () => {
    if (!selectedOrderId) return;
    setIsUpdating(true);
    setConfirmDialogOpen(false);

    try {
      await axios.patch(
        `${API_BASE}/api/cart/fulfillOrders/${selectedOrderId}`,
        {}
      );

      setSnackbarMessage("Order marked as Completed!");
      setSeverity("success");
      setOpenSnackbar(true);

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderId ? { ...o, status: "Completed" } : o
        )
      );
      setFilteredOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderId ? { ...o, status: "Completed" } : o
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
      setSelectedOrderId(null);
    }
  };

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
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Manage Orders</Typography>
      </Box>

      {/* Search By & Filters Section */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        {/* Status Dropdown */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={selectedStatus}
            onChange={handleStatusChange}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </FormControl>

        {/* User ID Search Box */}
        <TextField
          label="Search by User ID"
          variant="outlined"
          value={typedUserId}
          onChange={handleUserIdChange}
        />

        {/* Recipient Name Search Box */}
        <TextField
          label="Search by Recipient Name"
          variant="outlined"
          value={typedRecipientName}
          onChange={handleRecipientNameChange}
        />
      </Box>

      {/* Orders List */}
      <OrderView
        orders={filteredOrders}
        handleFulfillOrder={handleConfirmFulfill}
        isUpdating={isUpdating}
        itemsPerPage={50}
        resetPage={resetPage}
      />

      <PopupDisplay
        message={snackbarMessage}
        severity={severity}
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        autoHideDuration={autoHideDuration}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Order Completion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this order as <strong>Completed</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleFulfillOrder} color="primary" variant="contained">
            Yes, Mark as Completed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageOrders;
