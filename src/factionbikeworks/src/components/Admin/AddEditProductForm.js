import React, { useEffect, useState } from "react";
import {
  DialogContent,
  DialogActions,
  Button,
  Dialog,
  Box,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import LoadingButton from "../LoadingButton";
import ImageUploadUI from "../ImageUploadUI";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";

const AddEditProductForm = ({
  initialProductData,
  handleSaveProduct,
  handleCloseForm,
  isSaving,
}) => {
  const CHARACTER_LIMITS = {
    category: 50,
    name: 100,
    brand: 100,
    description: 500,
  };

  const [currentProduct, setCurrentProduct] = useState(initialProductData);
  const [variations, setVariations] = useState(
    initialProductData.variations || []
  );
  const [imagesData, setImagesData] = useState({});
  const [hasImageChanges, setHasImageChanges] = useState(false);
  const [openImageUploadUI, setOpenImageUploadUI] = useState(false);

  useEffect(() => {
    if (initialProductData.variations) {
      const imagesData = {};
      initialProductData.variations.forEach((variation) => {
        const { sku, images } = variation;
        if (images) {
          imagesData[sku] = images;
        }
      });
  
      console.log("Extracted Images Data:", imagesData); // Debugging step
      setImagesData(imagesData);
    } else {
      console.warn("No variations found for the product.");
    }
  }, [initialProductData]);
  

  
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentProduct((prevProduct) => ({
      ...prevProduct,
      [name]: value,
    }));
  };

  const handleVariationChange = (index, field, value) => {
    const updatedVariations = [...variations];
    updatedVariations[index][field] = value;
    setVariations(updatedVariations);
  };

  const addVariation = () => {
    setVariations([
      ...variations,
      {
        name:"",
        sku: "",
        price: "",
        stock: "",
        intendedUse: "",
        status: "Available",
      },
    ]);
  };

  const removeVariation = (index) => {
    const updatedVariations = [...variations];
    updatedVariations.splice(index, 1);
    setVariations(updatedVariations);
  };

  const handleOpenImageUploadUI = () => {
    setOpenImageUploadUI(true);
  };

  const handleCloseImageUploadUI = () => {
    setOpenImageUploadUI(false);
  };

  const handleSaveImages = (variationImages) => {
    setImagesData((prevData) => {
      const mergedData = {
        ...prevData,
        ...variationImages,
      };

      const isSame = JSON.stringify(prevData) === JSON.stringify(mergedData);
      if (!isSame) {
        setHasImageChanges(true);
      }

      return mergedData;
    });

    handleCloseImageUploadUI();
  };

  const handleSave = () => {
    const formData = new FormData();
  
    // Append product details
    formData.append("name", currentProduct.name || "");
    formData.append("brand", currentProduct.brand || "");
    formData.append("category", currentProduct.category || "");
    formData.append("description", currentProduct.description || "");
    formData.append("hasImageChanges", hasImageChanges.toString());
  
    // Stringify and append variations
    formData.append("variations", JSON.stringify(variations));
  
    // Handle images (if any)
    if (hasImageChanges) {
      Object.keys(imagesData).forEach((sku) => {
        const { files: skuFiles, names: skuNames } = imagesData[sku];
        skuFiles.forEach((file, index) => {
          formData.append("files", file);
          formData.append("names", skuNames[index]);
          formData.append("keys", sku); // SKU acts as the key
        });
      });
    }
  
    // Send formData via Axios
    handleSaveProduct(formData);
  };

  console.log("existingImagesData:", imagesData); // Log the data here
  return (
    <>
      <DialogContent
        sx={{
          maxHeight: "600px",
          overflowY: "auto",
        }}
      >
        <TextField
          label="Category"
          name="category"
          value={currentProduct.category}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: CHARACTER_LIMITS.category }}
        />
        <TextField
          label="Name"
          name="name"
          value={currentProduct.name}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: CHARACTER_LIMITS.name }}
        />
        <TextField
          label="Brand"
          name="brand"
          value={currentProduct.brand}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: CHARACTER_LIMITS.brand }}
        />
        <TextField
          label="Description"
          name="description"
          value={currentProduct.description}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          multiline
          rows={4}
          inputProps={{ maxLength: CHARACTER_LIMITS.description }}
        />

        {/* Variations */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Variations</Typography>
          {variations.map((variation, index) => (
            <Box
              key={index}
              sx={{
                border: "1px solid #ccc",
                borderRadius: 2,
                padding: 2,
                marginTop: 2,
                position: "relative",
              }}
            >
              <IconButton
                onClick={() => removeVariation(index)}
                sx={{ position: "absolute", top: 8, right: 8 }}
              >
                <RemoveCircleOutline />
              </IconButton>
              <TextField
                  label="Name"
                  value={variation.name}
                  onChange={(e) =>
                    handleVariationChange(index, "name", e.target.value)
                  }
                  fullWidth
                  margin="normal"
                />
              <TextField
                label="SKU"
                value={variation.sku}
                onChange={(e) =>
                  handleVariationChange(index, "sku", e.target.value)
                }
                fullWidth
                margin="normal"
              />
              <TextField
                label="Price"
                value={variation.price}
                onChange={(e) =>
                  handleVariationChange(index, "price", e.target.value)
                }
                fullWidth
                margin="normal"
                type="number"
                inputProps={{ min: 0, step: "0.01" }}
              />
              <TextField
                label="Stock"
                value={variation.stock}
                onChange={(e) =>
                  handleVariationChange(index, "stock", e.target.value)
                }
                fullWidth
                margin="normal"
                type="number"
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Intended Use"
                value={variation.intendedUse}
                onChange={(e) =>
                  handleVariationChange(index, "intendedUse", e.target.value)
                }
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
              
              </Box>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddCircleOutline />}
            onClick={addVariation}
            sx={{ mt: 2 }}
          >
            Add Variation
          </Button>
        </Box>

        {/* Image Upload */}
        <Box sx={{ mt: 3 }}>
          <Button
            onClick={handleOpenImageUploadUI}
            color="primary"
            variant="contained"
          >
            Add Images for Variations
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseForm} color="primary">
          Cancel
        </Button>
        <LoadingButton
          onClick={handleSave}
          color="primary"
          isLoading={isSaving}
        >
          Save
        </LoadingButton>
      </DialogActions>

      <Dialog
        open={openImageUploadUI}
        onClose={handleCloseImageUploadUI}
        maxWidth="md"
        fullWidth
      >
        

        <ImageUploadUI
          variations={variations}
          existingImagesData={imagesData}
          handleSave={handleSaveImages}
          handleClose={handleCloseImageUploadUI}
        />



      </Dialog>
    </>
    
  );
};

export default AddEditProductForm;
