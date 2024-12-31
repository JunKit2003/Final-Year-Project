import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CardMedia,
} from "@mui/material";

import Slider from "react-slick";
import axios from "axios";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Link } from "react-router-dom";

function Catalog() {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/banner/get`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        const data = response.data;
        if (data.banners) {
          const imageUrls = data.banners.map(
            (banner) =>
              `${process.env.REACT_APP_BACKEND_HOST}${banner.imageUrl}`
          );
          setImages(imageUrls);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/getCategories`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        const data = response.data;
        setCategories(data.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        const data = response.data;
        console.log(data);
        setProducts(data.products);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchImages();
    fetchCategories();
    fetchProducts();
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  const defaultImageUrl = "https://via.placeholder.com/300";

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
          (product) => product.category === selectedCategory
        );

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <Header />

      {/* Advertisement Carousel Section */}
      <Box
        sx={{
          width: "100%",
          margin: 0,
          padding: 0,
          backgroundColor: "black",
        }}
      >
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
          <Button
            variant={selectedCategory === "All" ? "contained" : "outlined"}
            onClick={() => setSelectedCategory("All")}
          >
            All
          </Button>
          {categories.map((category, index) => (
            <Button
              key={index}
              variant={
                selectedCategory === category ? "contained" : "outlined"
              }
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
            // Extract unique images from all variations
            const variationImages = product.variations.flatMap(
              (variation) => variation.images?.files || []
            );
            const uniqueVariationImages = Array.from(new Set(variationImages));

            // Fallback to default image if no images are found
            const hasImages = uniqueVariationImages.length > 0;

            const prices = product.variations.map((v) => parseFloat(v.price));
            const minPrice = Math.min(...prices);

            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Link to={`/viewProduct/${product.id}`} style={{ textDecoration: "none" }}>
                  <Card>
                    {/* Product Images Carousel */}
                    {hasImages ? (
                      uniqueVariationImages.length > 1 ? (
                        <Slider {...settings}>
                          {uniqueVariationImages.map((image, idx) => (
                            <div key={idx}>
                              <CardMedia
                                component="img"
                                height="200"
                                image={image}
                                alt={`Product Image ${idx + 1}`}
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                          ))}
                        </Slider>
                      ) : (
                        <CardMedia
                          component="img"
                          height="200"
                          image={uniqueVariationImages[0]}
                          alt="Product Image"
                          style={{ objectFit: "contain" }}
                        />
                      )
                    ) : (
                      <CardMedia
                        component="img"
                        height="200"
                        image={defaultImageUrl}
                        alt="Default Image"
                        style={{ objectFit: "contain" }}
                      />
                    )}


                    <CardContent>
                      <Typography variant="h5">{product.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {product.description || "No description available"}
                      </Typography>
                      <Typography variant="h6">
                        Starting from RM{minPrice}
                      </Typography>
                      <Button variant="contained" sx={{ mt: 2 }}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </div>
  );
}

export default Catalog;
