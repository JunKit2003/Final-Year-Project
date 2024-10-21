import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Box, Typography, Grid, Card, CardContent, Button, CardMedia } from "@mui/material";
import Slider from "react-slick";
import axios from "axios"; // Import axios
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function Catalog() {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    // Fetch advertisement images
    const fetchImages = async () => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/banner/get`, {}, {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Include cookies if necessary
        });

        const data = response.data;
        if (data.banners) {
          const imageUrls = data.banners.map((banner) =>
            `${process.env.REACT_APP_BACKEND_HOST}${banner.imageUrl}`
          );
          setImages(imageUrls);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    // Fetch categories dynamically from the API
    const fetchCategories = async () => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/product/getCategories`, {}, {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        const data = response.data;
        setCategories(data.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    // Fetch products dynamically from the API
    const fetchProducts = async () => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/product/get`, {}, {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        const data = response.data;
        console.log("Fetched products:", data.products); // Log products to check if they're coming through
        setProducts(data.products);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchImages();
    fetchCategories();
    fetchProducts();
  }, []);

  // Define the settings for the slider component
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  // Default image if no image data is available
  const defaultImageUrl = "https://via.placeholder.com/300";

  // Filter products by selected category
  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <Header />

      {/* Advertisement Carousel Section */}
      <Box sx={{ width: "100%", margin: 0, padding: 0, backgroundColor: "black" }}>
        <Slider {...settings}>
          {images.map((image, index) => (
            <div key={index}>
              <img
                src={image}
                alt={`Banner ${index + 1}`}
                style={{
                  width: "100%",
                  height: "600px",
                  objectFit: "contain",
                  display: "block",
                  margin: 0,
                  padding: 0,
                }}
              />
            </div>
          ))}
        </Slider>
      </Box>

      {/* Category Filter Section */}
      <Box sx={{ padding: 4, backgroundColor: "#f9f9f9" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Shop by Categories
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Button variant={selectedCategory === "All" ? "contained" : "outlined"} onClick={() => setSelectedCategory("All")}>
            All
          </Button>
          {categories.map((category, index) => (
            <Button
              key={index}
              variant={selectedCategory === category ? "contained" : "outlined"}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </Grid>
      </Box>

      {/* Products Section */}
      <Box sx={{ padding: 4 }}>
        <Grid container spacing={4}>
          {filteredProducts.map((product, index) => {
            const imagesData = product.imagesData || {};
            const imageUrl = imagesData[product.colors[0]]?.files[0] || defaultImageUrl;

            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={imageUrl}
                    alt={product.name}
                  />
                  <CardContent>
                    <Typography variant="h5">{product.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {product.description || "No description available"}
                    </Typography>
                    <Typography variant="h6">RM{product.price}</Typography>
                    <Button variant="contained" sx={{ mt: 2 }}>Add to Cart</Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </div>
  );
}

export default Catalog;
