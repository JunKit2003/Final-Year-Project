import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  IconButton,
  Checkbox,
  FormControlLabel,
  Typography,
  Fab,
} from "@mui/material";
import { Cancel as CancelIcon, Add as AddIcon } from "@mui/icons-material";

const ImageUploadUI = ({
  variations = [], // All product variations
  existingImagesData = {}, // Existing images keyed by SKU
  handleClose,
  handleSave,
}) => {
  const [selectedVariations, setSelectedVariations] = useState([]);
  const [images, setImages] = useState({});

  /**
   * Merge existing images with empty placeholders for
   * variations that do not have any images yet.
   * Then select all variations by default for the UI.
   */
  useEffect(() => {
    const newImages = {};

    // For each variation, create or copy existing images
    variations.forEach(({ sku }) => {
      if (existingImagesData[sku]) {
        // Copy existing arrays so we don't mutate props
        newImages[sku] = {
          files: [...existingImagesData[sku].files],
          names: [...existingImagesData[sku].names],
        };
      } else {
        // Initialize with empty arrays if none exist
        newImages[sku] = { files: [], names: [] };
      }
    });

    setImages(newImages);

    // Select all variations by default so user sees them
    setSelectedVariations(variations.map((v) => v.sku));
  }, [existingImagesData, variations]);

  // Toggle whether the UI for a variation is shown,
  // but do NOT remove anything from images state.
  const handleVariationToggle = (sku) => {
    setSelectedVariations((prev) =>
      prev.includes(sku) ? prev.filter((v) => v !== sku) : [...prev, sku]
    );
  };

  // Handle file selection (append new images to existing ones)
  const handleFileChange = (sku, event) => {
    const files = Array.from(event.target.files);

    setImages((prevImages) => ({
      ...prevImages,
      [sku]: {
        files: [...(prevImages[sku]?.files || []), ...files],
        names: [
          ...(prevImages[sku]?.names || []),
          ...files.map((file) => file.name),
        ],
      },
    }));
  };

  // Remove a single image from the array by index
  const handleRemoveImage = (sku, index) => {
    setImages((prevImages) => {
      const updatedFiles = prevImages[sku].files.filter((_, i) => i !== index);
      const updatedNames = prevImages[sku].names.filter((_, i) => i !== index);

      return {
        ...prevImages,
        [sku]: {
          files: updatedFiles,
          names: updatedNames,
        },
      };
    });
  };

  // Pass ALL images back to the parent (so no old images are lost)
  const saveImages = () => {
    handleSave(images);
    handleClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Upload Images for Variations
      </Typography>

      {variations.map((variation) => (
        <Box key={variation.sku} sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedVariations.includes(variation.sku)}
                onChange={() => handleVariationToggle(variation.sku)}
              />
            }
            label={`Upload Images for ${variation.name} (sku: ${variation.sku})`}
          />

          {/* Only show the upload UI if variation is "checked" */}
          {selectedVariations.includes(variation.sku) && (
            <Box sx={{ mt: 2, ml: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  mt: 2,
                }}
              >
                {images[variation.sku]?.files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: "100px",
                      height: "160px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      border: "1px solid lightgrey",
                      borderRadius: "8px",
                      p: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={
                        file instanceof File
                          ? URL.createObjectURL(file)
                          : file
                      }
                      alt={`Preview of ${file.name || "uploaded image"}`}
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                    <TextField
                      label="Image Name"
                      value={images[variation.sku]?.names[index] || ""}
                      onChange={(e) =>
                        setImages((prevImages) => ({
                          ...prevImages,
                          [variation.sku]: {
                            ...prevImages[variation.sku],
                            names: prevImages[variation.sku].names.map(
                              (name, i) =>
                                i === index ? e.target.value : name
                            ),
                          },
                        }))
                      }
                      sx={{ mb: 1, width: "100%" }}
                    />

                    <IconButton
                      size="small"
                      onClick={() => handleRemoveImage(variation.sku, index)}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  id={`file-upload-${variation.sku}`}
                  multiple
                  onChange={(e) => handleFileChange(variation.sku, e)}
                />
                <label htmlFor={`file-upload-${variation.sku}`}>
                  <Fab color="primary" component="span" size="small">
                    <AddIcon />
                  </Fab>
                </label>
              </Box>
            </Box>
          )}
        </Box>
      ))}

      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
        <Button onClick={saveImages} variant="contained">
          Save Images
        </Button>
      </Box>
    </Box>
  );
};

export default ImageUploadUI;
