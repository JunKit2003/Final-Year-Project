import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CardMedia,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Header from "../components/Header";
import Footer from "../components/Footer";

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
    const matchCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchBrand =
      !brandFilter || (product.brand && product.brand === brandFilter);
    const lowerSearch = searchTerm.toLowerCase();
    const matchSearch =
      product.name.toLowerCase().includes(lowerSearch) ||
      (product.brand && product.brand.toLowerCase().includes(lowerSearch));

    return matchCategory && matchBrand && matchSearch;
  });

  const defaultImageUrl = "https://via.placeholder.com/300";

  return (
    <div style={{ margin: 0, padding: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      {/* Main Content Wrapper */}
      <Box sx={{ flex: 1 }}>
        {/* Filter Section */}
        <Box sx={{ padding: 4, bgcolor: "background.default", color: "text.primary" }}>
          <Typography variant="h4" align="center" gutterBottom>
            Shop by Categories
          </Typography>
          {/* Place category filter and search bar side by side */}
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 2 }}>
            <FormControl variant="outlined" sx={{ minWidth: 200 }}>
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="All">All</MenuItem>
                {categories.map((category, index) => (
                  <MenuItem key={index} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Search by product name or brand"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ maxWidth: 400, flexGrow: 1 }}
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
                          {product.category || "No category available"}
                        </Typography>
                        <Typography variant="h6">
                          Starting from RM{minPrice}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Link>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      <Footer />
    </div>
  );
}

export default Catalog;
