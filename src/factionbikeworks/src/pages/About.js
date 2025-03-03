import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer'; // Import the Footer component
import { Box, Typography, Grid, Link } from '@mui/material';

function About() {
  return (
    <Box>
      {/* Header component */}
      <Header />

      <Box sx={{ padding: '40px 20px', maxWidth: '800px', margin: 'auto' }}>
        {/* Introduction Section */}
        <Typography variant="h3" gutterBottom>
          About Us
        </Typography>

        <Typography variant="body1" paragraph>
          Hello there!
        </Typography>

        <Typography variant="body1" paragraph>
          We’re stoked that you’ve made it here to our web store - a site giving you easy access to all the great MTB brands that we distribute and stock.
        </Typography>

        <Typography variant="body1" paragraph>
          Since 2022, Faction's mission has been to deliver best-in-class MTB products to our customers, something that has stayed true to this day.
        </Typography>

        <Typography variant="body1" paragraph>
          Take your time to explore our range and discover Deity Components, Trek Bike, Industry Nine, Michelin, Oneup Components, Cush Core, and Peatys.
        </Typography>

        <Typography variant="body1" paragraph>
          Better still, drop by Faction Bikeworks, our physical retail store at the foothills of Bukit Kiara to get your queries answered in person, grab a post-ride drink, or arrange a test ride!
        </Typography>

        <Typography variant="body1" paragraph>
          Don’t forget to follow us on Facebook and Instagram – it’s the best way to receive our latest updates on products and promotions.
        </Typography>

        <Typography variant="body1" paragraph>
          If you require further information on any item or think that we can help make your ride more enjoyable, please do not hesitate to contact us at the channels listed below.
        </Typography>

        <Typography variant="body1" paragraph>
          Also, if there are certain products from the above manufacturers that you are interested in, but are not listed or available on our site, feel free to mail us for more information on special orders.
        </Typography>

        <Typography variant="h6" gutterBottom>
          Happy Trails!
        </Typography>

        <Typography variant="h6" gutterBottom>
          Faction Bikeworks
        </Typography>

        {/* Contact Section */}
        <Box sx={{ marginTop: '40px' }}>
          <Typography variant="h5" gutterBottom>
            Get in touch with us through the following channels:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Email:</strong></Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Contact Number:</strong> +6011-3332 1767
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Located in:</strong> Wisma WIM</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Address:</strong> G-8, Wisma WIM, Jln Abang Haji Openg, Taman Tun Dr Ismail, 60000 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Store Operating Hours:</strong>
              </Typography>
              <Typography variant="body2">Weekdays: 11:00am - 7:30pm</Typography>
              <Typography variant="body2">Saturday: 11:00am - 4:00pm</Typography>
              <Typography variant="body2">Closed on Sunday and Public Holidays, Gone Riding!</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Footer Social Media Links */}
        <Box sx={{ marginTop: '40px' }}>
          <Typography variant="h6">Follow Us</Typography>
          <Typography variant="body1">
            <Link href="https://www.facebook.com/faction.my" target="_blank" rel="noopener" sx={{ marginRight: '15px' }}>
              Facebook
            </Link>
            <Link href="https://www.instagram.com/faction.my/" target="_blank" rel="noopener">
              Instagram
            </Link>
          </Typography>
        </Box>
      </Box>

      {/* Footer Component */}
      <Footer />
    </Box>
  );
}

export default About;
