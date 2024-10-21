import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Box, Typography, Grid, Card, CardContent, Button } from "@mui/material";
import Slider from "react-slick";
import axios from "axios"; // Import axios
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function Home() {
  const [images, setImages] = useState([]);
  const [brands, setBrands] = useState([]); // Changed from categories to brands
  const [showAllBrands, setShowAllBrands] = useState(false); // Changed state name

  useEffect(() => {
    // Fetch advertisement images using axios
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

    // Fetch brands dynamically using axios
    const fetchBrands = async () => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/product/getBrands`, {}, {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        const data = response.data;
        console.log("Fetched brands:", data.brands); // Log brands data to console
        setBrands(data.brands);
      } catch (error) {
        console.error("Error fetching brands:", error);
      }
    };

    fetchImages();
    fetchBrands();
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

  // Display all brands or limit the display to the first 5
  const displayedBrands = showAllBrands ? brands : brands.slice(0, 5);

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

      {/* Shop Items by Brands Section */}
      <Box sx={{ padding: 4, backgroundColor: "#f9f9f9" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Shop by Brands
        </Typography>
        <Grid container spacing={4}>
          {/* Display dynamically fetched brands */}
          {displayedBrands.map((brand, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="div">
                    {brand} {/* Display brand name */}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Show More Button */}
        {!showAllBrands && (
          <Box sx={{ textAlign: "center", marginTop: 2 }}>
            <Button variant="contained" onClick={() => setShowAllBrands(true)}>
              Show More
            </Button>
          </Box>
        )}
      </Box>

      {/* Embedded Map Section */}
      <Box sx={{ width: "100%", margin: 0, padding: 0 }}>
        <iframe
          title="map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.815222182998!2d101.62756258489375!3d3.1434261450361616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc495f03e40a99%3A0x50f6e08edd4ee8b8!2sFaction%20Bikeworks!5e0!3m2!1sen!2smy!4v1728336895257!5m2!1sen!2smy"
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>
    </div>
  );
}

export default Home;
