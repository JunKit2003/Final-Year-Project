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
  TextField,
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Catalog() {
  const { brandname } = useParams(); // Capture the brand name from the route
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Optional: Keep track if there's a brand filter from the URL
  const [brandFilter, setBrandFilter] = useState("");

  useEffect(() => {
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
        setProducts(data.products);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchCategories();
    fetchProducts();
  }, []);

  // Whenever the brandname from the URL changes, set the brand filter
  useEffect(() => {
    if (brandname) {
      setBrandFilter(brandname);
      // You could also decide to clear or set category to "All" here if desired
      // setSelectedCategory("All");
    } else {
      setBrandFilter(""); // No brand filter if no param
    }
  }, [brandname]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter products based on:
  // 1. Selected category (if not "All")
  // 2. Brand filter from URL param (if present)
  // 3. Search term matching product name or brand
  const filteredProducts = products.filter((product) => {
    // Category filter (if not "All")
    const matchCategory =
      selectedCategory === "All" || product.category === selectedCategory;

    // Brand filter (if brandFilter is not empty)
    const matchBrand =
      !brandFilter || (product.brand && product.brand === brandFilter);

    // Search term filter (match name or brand)
    const lowerSearch = searchTerm.toLowerCase();
    const matchSearch =
      product.name.toLowerCase().includes(lowerSearch) ||
      (product.brand && product.brand.toLowerCase().includes(lowerSearch));

    return matchCategory && matchBrand && matchSearch;
  });

  const defaultImageUrl = "https://via.placeholder.com/300";

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <Header />

      {/* Category Filter Section */}
      <Box sx={{ padding: 4, backgroundColor: "#f9f9f9" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Shop by Categories
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant={selectedCategory === "All" ? "contained" : "outlined"}
              onClick={() => setSelectedCategory("All")}
            >
              All
            </Button>
          </Grid>
          {categories.map((category, index) => (
            <Grid item key={index}>
              <Button
                variant={selectedCategory === category ? "contained" : "outlined"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Search Field */}
        <Box sx={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
          <TextField
            label="Search by product name or brand"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
            sx={{ maxWidth: 400 }}
          />
        </Box>
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
            const hasImages = uniqueVariationImages.length > 0;

            // Compute the minimum price from variations
            const prices = product.variations.map((v) => parseFloat(v.price));
            const minPrice = Math.min(...prices);

            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Link
                  to={`/viewProduct/${product.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Card>
                    {/* Show either the first image, or the default placeholder if none */}
                    <CardMedia
                      component="img"
                      height="200"
                      image={hasImages ? uniqueVariationImages[0] : defaultImageUrl}
                      alt="Product Image"
                      style={{ objectFit: "contain" }}
                    />
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
