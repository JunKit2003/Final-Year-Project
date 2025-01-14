import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import LoadingButton from "../../components/LoadingButton";
import BrandImageView from "../../components/Admin/BrandImageView";
import AddBrandImageForm from "../../components/Admin/AddBrandImageForm";

const ManageBrandImages = () => {
  const [brandImages, setBrandImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState(null);
  const [severity, setSeverity] = useState("error");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    fetchBrandImages();
  }, []);

  const fetchBrandImages = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/product/getBrandImages`
      );
      console.log("Fetched Brand Images:", response.data.brands); // Debugging step
      setBrandImages(response.data.brands || []);
    } catch (error) {
      setSnackbarMessage(
        error?.response?.data?.message || "Error fetching brand images!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleSaveBrandImage = async (formData) => {
    setIsSaving(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/brands/add`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSnackbarMessage("Brand image added successfully!");
      setSeverity("success");
      setOpenSnackbar(true);
      fetchBrandImages();
      handleCloseForm();
    } catch (error) {
      setSnackbarMessage(
        error?.response?.data?.message || "Error saving brand image!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrandImage = async (id) => {
    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/brands/delete/${id}`
      );
      setSnackbarMessage("Brand image deleted successfully!");
      setSeverity("success");
      setOpenSnackbar(true);
      setBrandImages(brandImages.filter((brand) => brand.id !== id));
    } catch (error) {
      setSnackbarMessage(
        error?.response?.data?.message || "Error deleting brand image!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setIsDeleting(false);
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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Manage Brand Images</Typography>
        <LoadingButton
          variant="contained"
          color="primary"
          onClick={handleOpenForm}
          isLoading={isSaving}
          sx={{ mt: 2 }}
        >
          Add Brand Image
        </LoadingButton>
      </Box>

      <BrandImageView
        brandImages={brandImages}
        handleDeleteBrandImage={handleDeleteBrandImage}
        isDeleting={isDeleting}
      />

      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>Add Brand Image</DialogTitle>
        <AddBrandImageForm
          handleSaveBrandImage={handleSaveBrandImage}
          handleCloseForm={handleCloseForm}
          isSaving={isSaving}
        />
      </Dialog>

      <PopupDisplay
        message={snackbarMessage}
        severity={severity}
        open={openSnackbar}
        onClose={handleCloseSnackbar}
      />
    </Box>
  );
};

export default ManageBrandImages;
