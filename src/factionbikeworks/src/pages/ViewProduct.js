import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import axios from "axios";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const ViewProduct = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`,
          { productId },
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        if (response.data.product) {
          console.log(response.data.product);
          setProduct(response.data.product);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      }
    };

    fetchProduct();
  }, [productId]);

  if (!product) {
    return <Typography variant="h6">Loading product details...</Typography>;
  }

  const variations = product.variations || [];
  const selectedVariation = variations[selectedVariationIndex] || {};

  // Correctly access images using the SKU as the key
  const variationImages = selectedVariation.images?.files || [];

  const defaultImageUrl = "https://via.placeholder.com/300";

  const handleVariationChange = (event) => {
    setSelectedVariationIndex(event.target.value);
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <div>
      <Header />
      <Box
        sx={{
          padding: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{ padding: 3, width: "80%", maxWidth: "800px" }}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                {/* Carousel to display multiple images */}
                <Slider {...settings}>
                  {variationImages.length > 0 ? (
                    variationImages.map((image, index) => (
                      <div key={index}>
                        <img
                          src={image}
                          alt={`Variation ${selectedVariation.sku} - Image ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "400px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div>
                      <img
                        src={defaultImageUrl}
                        alt="Default"
                        style={{
                          width: "100%",
                          height: "400px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                </Slider>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Brand: {product.brand}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {product.description || "No description available"}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Category: {product.category}
                </Typography>

                {/* Variations Selector */}
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="variation-select-label">
                    Select Variation
                  </InputLabel>
                  <Select
                    labelId="variation-select-label"
                    value={selectedVariationIndex}
                    label="Select Variation"
                    onChange={handleVariationChange}
                  >
                    {variations.map((variation, index) => (
                      <MenuItem key={index} value={index}>
                        {variation.sku} - RM{variation.price}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Variation Details */}
                <Typography variant="h5" color="primary" gutterBottom>
                  Price: RM{selectedVariation.price}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Stock: {selectedVariation.stock}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {selectedVariation.status}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Intended Use: {selectedVariation.intendedUse}
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  disabled={selectedVariation.status !== "Available"}
                >
                  Add to Cart
                </Button>
              </CardContent>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </div>
  );
};

export default ViewProduct;
s