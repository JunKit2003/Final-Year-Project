import React, { useState } from "react";
import { DialogContent, DialogActions, Button, Dialog, Box } from "@mui/material";
import LoadingButton from "../LoadingButton";
import ImageUploadUI from "../ImageUploadUI";

const AddBannerForm = ({ handleSaveBanners, handleCloseForm, isSaving }) => {
  const [openImageUploadUI, setOpenImageUploadUI] = useState(false);
  const [imagesData, setImagesData] = useState({}); // State to manage uploaded images

  const handleOpenImageUploadUI = () => {
    setOpenImageUploadUI(true);
  };

  const handleCloseImageUploadUI = () => {
    setOpenImageUploadUI(false);
  };

  const handleSaveImages = (colorImages) => {
    // Update imagesData with the new images
    setImagesData((prevData) => ({
      ...prevData,
      ...colorImages,
    }));
    handleCloseImageUploadUI(); // Close the image upload UI
  };

  const handleSave = () => {
    const { files } = imagesData.banner; // Access the files array
    const formData = new FormData();
    
    // Check if files are present and append them
    if (files && files.length > 0) {
        for (let file of files) {
            formData.append("files", file); // Append each file
        }
    } else {
        console.error("No files to upload!");
        return;
    }

    console.log("FormData being sent:", formData);
    handleSaveBanners(formData); // Pass the FormData directly
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
          colors={["banner"]} // Pass a dummy 'colors' value like ["banner"] or an empty array []
          existingImagesData={imagesData} // Pass image data from parent state
          handleSave={handleSaveImages} // Handle saving images
          handleClose={handleCloseImageUploadUI} // Handle closing without saving
        />
      </Dialog>
    </>
  );
};

export default AddBannerForm;
