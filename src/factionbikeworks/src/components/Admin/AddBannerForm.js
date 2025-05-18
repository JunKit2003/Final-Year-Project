import React, { useState } from "react";
import { DialogContent, DialogActions, Button, Dialog, Box } from "@mui/material";
import LoadingButton from "../LoadingButton";
import ImageUploadUI from "../ImageUploadUI";

const AddBannerForm = ({ handleSaveBanners, handleCloseForm, isSaving }) => {
  const [openImageUploadUI, setOpenImageUploadUI] = useState(false);
  const [imagesData, setImagesData] = useState({}); // State to manage uploaded images

  // Open the image upload UI
  const handleOpenImageUploadUI = () => {
    setOpenImageUploadUI(true);
  };

  // Close the image upload UI
  const handleCloseImageUploadUI = () => {
    setOpenImageUploadUI(false);
  };

  // Save uploaded images
  const handleSaveImages = (newImages) => {
    // Update imagesData with new images
    setImagesData((prevData) => ({
      ...prevData,
      ...newImages,
    }));
    handleCloseImageUploadUI(); // Close the image upload UI
  };

  // Save banners by sending FormData
  const handleSave = () => {
    // Retrieve files from the "banner" variation
    const { files } = imagesData.banner || {}; // Handle case where "banner" might not exist
    const formData = new FormData();

    if (files && files.length > 0) {
      // Append each file to FormData
      for (let file of files) {
        formData.append("files", file);
      }
    } else {
      console.error("No files to upload!");
      return;
    }

    console.log("FormData being sent:", formData);
    handleSaveBanners(formData); // Pass FormData to parent handler
  };

  return (
    <>
      <DialogContent
        sx={{
          maxHeight: "600px",
          overflowY: "auto",
        }}
      >
        <Box sx={{ mt: 1, mb: 3 }}>
          <Button onClick={handleOpenImageUploadUI} color="primary" variant="contained">
            Upload Banner Images
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseForm} color="primary">
          Cancel
        </Button>
        <LoadingButton onClick={handleSave} color="primary" isLoading={isSaving}>
          Save Banners
        </LoadingButton>
      </DialogActions>

      {/* Image Upload UI */}
      <Dialog open={openImageUploadUI} onClose={handleCloseImageUploadUI} maxWidth="md" fullWidth>
        <ImageUploadUI
          variations={[{ sku: "banner", name: "Banner" }]} // Dummy "banner" variation
          existingImagesData={imagesData} // Existing image data
          handleSave={handleSaveImages} // Save handler
          handleClose={handleCloseImageUploadUI} // Close handler
        />
      </Dialog>
    </>
  );
};

export default AddBannerForm;
