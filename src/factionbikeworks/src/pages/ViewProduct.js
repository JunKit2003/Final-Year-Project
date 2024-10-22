import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Use react-router for route parameters
import Header from "../components/Header";
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Paper,
} from "@mui/material";
import axios from "axios";

const ViewProduct = () => {
  const { productId } = useParams(); // Get the productId from the URL
  const [product, setProduct] = useState(null);

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

  const imagesData = product.imagesData || {};
  const defaultImageUrl = "https://via.placeholder.com/300";
  const imageUrl = imagesData[product.colors[0]]?.files[0] || defaultImageUrl;

  return (
    <div>
      <Header />
      <Box sx={{ padding: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Paper elevation={3} sx={{ padding: 3, width: '80%', maxWidth: '800px' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardMedia component="img" height="400" image={imageUrl} alt={product.name} />
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
                <Typography variant="h5" color="primary" gutterBottom>
                  RM{product.price}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {product.description || "No description available"}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Category: {product.category}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {product.status}
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2 }}>
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
