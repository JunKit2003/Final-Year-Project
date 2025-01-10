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

  // Store product details
  const [product, setProduct] = useState(null);

  // Track which variation is selected from dropdown
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);

  // Store user data from /api/account/authenticate
  const [sessionUser, setSessionUser] = useState(null);

  // 1) Fetch user session data (POST request for authenticate API)
  useEffect(() => {
    const fetchSessionUser = async () => {
      try {
        // Because your authenticate endpoint is POST-based, we send a POST request here.
        // We pass an empty object (or any required data) as the second argument,
        // and include { withCredentials: true } to allow cookies/sessions.
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`,
          {},
          { withCredentials: true }
        );

        console.log("Authenticated User:", response.data.user);
        setSessionUser(response.data.user);
      } catch (err) {
        console.error("Error fetching session user:", err);
      }
    };

    fetchSessionUser();
  }, []);

  // 2) Fetch product details (POST request)
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
          console.log("Fetched Product:", response.data.product);
          setProduct(response.data.product);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      }
    };

    fetchProduct();
  }, [productId]);

  // Show loading text if product is not yet fetched
  if (!product) {
    return <Typography variant="h6">Loading product details...</Typography>;
  }

  // Variations for the product
  const variations = product.variations || [];
  const selectedVariation = variations[selectedVariationIndex] || {};

  // Variation images
  const variationImages = selectedVariation.images?.files || [];
  const defaultImageUrl = "https://via.placeholder.com/300";

  // Handle variation selector
  const handleVariationChange = (event) => {
    setSelectedVariationIndex(event.target.value);
  };

  // 3) Add item to cart using the session user ID
  const handleAddToCart = async () => {
    try {
      // Ensure the user is authenticated and we have a user ID
      if (!sessionUser || !sessionUser.id) {
        alert("User is not authenticated. Please log in.");
        return;
      }

      // POST to /api/cart/add with the user ID from session
      await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/cart/add`,
        {
          user_id: sessionUser.id,
          variation_id: selectedVariation.id,
          quantity: 1, // Or any other quantity
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      console.log("Item added to cart successfully!");
      // Optionally, display a success message or update cart UI
    } catch (error) {
      console.error("Error adding to cart:", error);
      // Optionally handle or display error to user
    }
  };

  // React-Slick settings
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
        <Paper elevation={3} sx={{ padding: 3, width: "80%", maxWidth: "800px" }}>
          <Grid container spacing={4}>
            {/* Left Column: Variation Images */}
            <Grid item xs={12} md={6}>
              <Card>
                {variationImages.length > 1 ? (
                  <Slider {...settings}>
                    {variationImages.map((image, index) => (
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
                    ))}
                  </Slider>
                ) : variationImages.length === 1 ? (
                  <div>
                    <img
                      src={variationImages[0]}
                      alt={`Variation ${selectedVariation.sku} - Single Image`}
                      style={{
                        width: "100%",
                        height: "400px",
                        objectFit: "contain",
                      }}
                    />
                  </div>
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
              </Card>
            </Grid>

            {/* Right Column: Variation Details */}
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

                {/* Variation Selector */}
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
                        {variation.name} - RM{variation.price}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Variation Info */}
                <Typography variant="h5" color="primary" gutterBottom sx={{ mt: 2 }}>
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
                  onClick={handleAddToCart}
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
