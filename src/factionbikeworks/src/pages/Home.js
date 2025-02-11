import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer"; // Import Footer
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
import { Link } from "react-router-dom";
import axios from "axios";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTheme } from "@mui/material/styles";

function Home() {
  const [images, setImages] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/banner/get`,
          {},
          {
            headers: { "Content-Type": "application/json" },
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

    const fetchBrandImages = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/product/getBrandImages`,
          {},
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          }
        );
        const data = response.data;
        setBrands(data.brands);
      } catch (error) {
        console.error("Error fetching brand images:", error);
      }
    };

    fetchImages();
    fetchBrandImages();
  }, []);

  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const brandSliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  const brandChunks = chunkArray(brands, 6);

  return (
    // OverflowX hidden to prevent horizontal scroll
    <div style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
      <Header />

      <Box
        sx={{
          width: "100%",
          margin: 0,
          padding: 0,
          backgroundColor: "black",
        }}
      >
        <Slider {...bannerSettings}>
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

      <Box
        sx={{
          padding: { xs: 2, sm: 4 },
          bgcolor: "background.default",
        }}
      >
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          }}
        >
          Shop by Brands
        </Typography>

        {!showAllBrands && (
          <>
            <Grid container spacing={4} columns={3}>
              {brands.slice(0, 3).map((brand, index) => {
                const fullImageUrl = `${process.env.REACT_APP_BACKEND_HOST}${brand.imageUrl}`;
                return (
                  <Grid item xs={1} key={brand.id || index}>
                    <Link
                      to={`/catalog/${brand.brandName}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Card>
                        {brand.imageUrl && (
                          <CardMedia
                            component="img"
                            image={fullImageUrl}
                            alt={brand.brandName}
                            sx={{
                              height: { xs: 150, sm: 200 },
                              objectFit: "contain",
                            }}
                          />
                        )}
                        <CardContent
                          sx={{
                            textAlign: "center",
                            padding: { xs: 1, sm: 2 },
                            pt: { xs: 0.5, sm: 2 },
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{
                              fontSize: {
                                xs: "0.9rem",
                                sm: "1rem",
                                md: "1.25rem",
                              },
                              mt: { xs: 0.5, sm: 1 },
                            }}
                          >
                            {brand.brandName}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Link>
                  </Grid>
                );
              })}
            </Grid>

            {brands.length > 3 && (
              <Box sx={{ textAlign: "center", marginTop: 2 }}>
                <Button variant="contained" onClick={() => setShowAllBrands(true)}>
                  Show More
                </Button>
              </Box>
            )}
          </>
        )}

        {showAllBrands && (
          <>
            <Slider {...brandSliderSettings}>
              {brandChunks.map((chunk, i) => (
                <div key={i}>
                  <Grid container spacing={4} columns={3} sx={{ padding: 2 }}>
                    {chunk.map((brand, index) => {
                      const fullImageUrl = `${process.env.REACT_APP_BACKEND_HOST}${brand.imageUrl}`;
                      return (
                        <Grid item xs={1} key={brand.id || index}>
                          <Link
                            to={`/catalog/${brand.brandName}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <Card>
                              {brand.imageUrl && (
                                <CardMedia
                                  component="img"
                                  image={fullImageUrl}
                                  alt={brand.brandName}
                                  sx={{
                                    height: { xs: 150, sm: 200 },
                                    objectFit: "contain",
                                  }}
                                />
                              )}
                              <CardContent
                                sx={{
                                  textAlign: "center",
                                  padding: { xs: 1, sm: 2 },
                                  pt: { xs: 0.5, sm: 2 },
                                }}
                              >
                                <Typography
                                  variant="h6"
                                  component="div"
                                  sx={{
                                    fontSize: {
                                      xs: "0.9rem",
                                      sm: "1rem",
                                      md: "1.25rem",
                                    },
                                    mt: { xs: 0.5, sm: 1 },
                                  }}
                                >
                                  {brand.brandName}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Link>
                        </Grid>
                      );
                    })}
                  </Grid>
                </div>
              ))}
            </Slider>

            <Box sx={{ textAlign: "center", marginTop: 2 }}>
              <Button variant="contained" onClick={() => setShowAllBrands(false)}>
                Show Less
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ width: "100%", margin: 0, padding: 0 }}>
        <iframe
          title="map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.815222182998!2d101.62756258489375!3d3.1434261450361616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc495f03e40a99%3A0x50f6e08edd4ee8b8!2sFaction%20Bikeworks!5e0!3m2!1sen!2smy!4v1728336895257!5m2!1sen!2smy"
          width="100%"
          height="450"
          style={{
            border: 0,
            filter: theme.palette.mode === "dark" ? "invert(1)" : "invert(0)",
            transition: "filter 0.3s ease-in-out",
          }}
          allowFullScreen
          loading="lazy"
        />
      </Box>

      <Footer />
    </div>
  );
}

export default Home;
