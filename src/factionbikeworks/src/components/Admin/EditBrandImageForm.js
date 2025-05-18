import React, { useState, useEffect } from "react";
import {
  DialogContent,
  DialogActions,
  Button,
  Dialog,
  Box,
} from "@mui/material";
import LoadingButton from "../LoadingButton";
import ImageUploadUI from "../ImageUploadUI";

const EditBrandImageForm = ({
  initialBrandData,
  handleUpdateBrandImage,
  handleCloseForm,
  isSaving,
}) => {
  const [openImageUploadUI, setOpenImageUploadUI] = useState(false);
  const [imagesData, setImagesData] = useState({});

  useEffect(() => {
    if (!initialBrandData) return;

    console.log("Initial brand data:", initialBrandData);

    // Safely set imagesData if imagePath exists
    if (initialBrandData.imagePath) {
      setImagesData({
        brand: {
          files: [], // Empty initially as no new files are uploaded
          names: [initialBrandData.imagePath], // Existing image path
        },
      });
    }
  }, [initialBrandData]);

  const handleOpenImageUploadUI = () => {
    setOpenImageUploadUI(true);
  };

  const handleCloseImageUploadUI = () => {
    setOpenImageUploadUI(false);
  };

  const handleSaveImages = (imageData) => {
    setImagesData((prevData) => ({
      ...prevData,
      ...imageData,
    }));
    handleCloseImageUploadUI();
  };

  const handleSave = () => {
    const { files } = imagesData.brand || {};
    const formData = new FormData();

    // Add new files or existing image path to FormData
    if (files && files.length > 0) {
      for (const file of files) {
        formData.append("files", file);
      }
    } else if (imagesData.brand?.names[0]) {
      formData.append("existingImagePath", imagesData.brand.names[0]);
    } else {
      console.error("No files or image paths provided!");
      return;
    }

    // Debugging FormData
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    handleUpdateBrandImage(formData);
  };

  return (
    <>
      <DialogContent sx={{ maxHeight: "600px", overflowY: "auto" }}>
        <Box sx={{ mt: 3, mb: 3, textAlign: "center" }}>
          <Button onClick={handleOpenImageUploadUI} color="primary" variant="contained">
            Change Brand Image
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCloseForm} color="primary">
          Cancel
        </Button>
        <LoadingButton onClick={handleSave} color="primary" isLoading={isSaving}>
          Save Changes
        </LoadingButton>
      </DialogActions>

      {/* Image Upload Dialog */}
      <Dialog
        open={openImageUploadUI}
        onClose={handleCloseImageUploadUI}
        maxWidth="md"
        fullWidth
      >
        <ImageUploadUI
          variations={[{ sku: "brand", name: initialBrandData?.brandName }]}
          existingImagesData={imagesData}
          handleSave={handleSaveImages}
          handleClose={handleCloseImageUploadUI}
        />
      </Dialog>
    </>
  );
};

export default EditBrandImageForm;
