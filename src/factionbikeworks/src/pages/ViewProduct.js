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
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const ViewProduct = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [sessionUser, setSessionUser] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchSessionUser = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );
        setSessionUser(response.data.user);
      } catch (err) {
        console.error("Error fetching session user:", err);
      }
    };
    fetchSessionUser();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`,
          { productId },
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          }
        );
        if (response.data.product) {
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
  const variationImages = selectedVariation.images?.files || [];
  const defaultImageUrl = "https://via.placeholder.com/300";

  const handleVariationChange = (event) => {
    setSelectedVariationIndex(event.target.value);
  };

  const handleAddToCart = async () => {
    try {
      if (!sessionUser || !sessionUser.id) {
        alert("User is not authenticated. Please log in.");
        return;
      }

      await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/add`,
        {
          user_id: sessionUser.id,
          variation_id: selectedVariation.id,
          quantity: 1,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      setOpenSnackbar(true);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
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
          bgcolor: "background.default",
          color: "text.primary",
          minHeight: "100vh",
        }}
      >
        <Paper elevation={3} sx={{ padding: 3, width: "80%", maxWidth: "800px" }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                {variationImages.length > 1 ? (
                  <Slider {...settings}>
                    {variationImages.map((image, index) => (
                      <div key={index}>
                        <img
                          src={image}
                          alt={`Variation ${selectedVariation.sku} - ${index + 1}`}
                          style={{ width: "100%", height: "400px", objectFit: "contain" }}
                        />
                      </div>
                    ))}
                  </Slider>
                ) : variationImages.length === 1 ? (
                  <div>
                    <img
                      src={variationImages[0]}
                      alt={`Variation ${selectedVariation.sku}`}
                      style={{ width: "100%", height: "400px", objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <div>
                    <img
                      src={defaultImageUrl}
                      alt="Default"
                      style={{ width: "100%", height: "400px", objectFit: "contain" }}
                    />
                  </div>
                )}
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

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="variation-select-label">Select Variation</InputLabel>
                  <Select
                    labelId="variation-select-label"
                    value={selectedVariationIndex}
                    label="Select Variation"
                    onChange={handleVariationChange}
                  >
                    {variations.map((variation, index) => (
                      <MenuItem key={index} value={index}>
                        {variation.name} - RM{variation.price}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="h5" color="primary" gutterBottom sx={{ mt: 2 }}>
                  Price: RM{selectedVariation.price}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Stock: {selectedVariation.stock}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {selectedVariation.stock === 0 ? "Out of Stock" : "Available"}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Intended Use: {selectedVariation.intendedUse}
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    mt: 2,
                    opacity: selectedVariation.stock === 0 ? 0.5 : 1,
                  }}
                  disabled={selectedVariation.stock === 0}
                  onClick={handleAddToCart}
                >
                  {selectedVariation.stock === 0 ? "Out of Stock" : "Add to Cart"}
                </Button>
              </CardContent>
            </Grid>
          </Grid>
        </Paper>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={3000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setOpenSnackbar(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            Item added to cart successfully!
          </Alert>
        </Snackbar>
      </Box>
    </div>
  );
};

export default ViewProduct;
