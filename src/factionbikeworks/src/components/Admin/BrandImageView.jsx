import React from "react";
import { Box, Typography } from "@mui/material";
import LoadingButton from "../LoadingButton";
import { API_BASE } from "../../lib/api";

const BrandImageView = ({
  brandImages,
  handleEditBrandImage,
  isEditing,
}) => {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
      {brandImages.map((brand) => {
        const { imageUrl, id, brandName } = brand;

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
            <Typography variant="h6">{brandName}</Typography>

            {imageUrl ? (
              <img
                src={`${API_BASE}${imageUrl}`}
                alt={`Brand ${brandName}`}
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "10px",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "200px",
                  background: "grey",
                  borderRadius: "15px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                No Image Available!
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              {/* Edit Button */}
              <LoadingButton
                variant="outlined"
                color="primary"
                onClick={() => handleEditBrandImage(brand)}
                isLoading={isEditing}
              >
                Edit
              </LoadingButton>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default BrandImageView;