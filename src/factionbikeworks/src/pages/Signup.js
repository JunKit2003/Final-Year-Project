import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import axios from "../AxiosSingleton";
import Header from "../components/Header"; 
import Footer from "../components/Footer"; // ✅ Import Footer component

function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      // Post request to your signup API
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/signup`,
        {
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          password,
          phone_number: phoneNumber,
          category: "Customer", // Ensures admin accounts can't be created from the signup form
        }
      );

      console.log("Signup response:", response.data);

      if (response.data.user) {
        setSuccessMessage("Signup successful!");
        setErrorMessage("");

        // Redirect user after some delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErrorMessage("Signup failed: No user data received.");
      }
    } catch (error) {
      if (error.response) {
        setErrorMessage(error.response.data.message || "Signup failed!");
        setSuccessMessage("");
      } else {
        setErrorMessage("Signup failed: Network error.");
        setSuccessMessage("");
      }
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card sx={{ width: 400, padding: 4 }}>
          <CardContent>
            <Typography variant="h5" align="center" gutterBottom>
              Sign Up
            </Typography>
            <form onSubmit={handleSignup}>
              <TextField
                label="First Name"
                variant="outlined"
                fullWidth
                margin="normal"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <TextField
                label="Last Name"
                variant="outlined"
                fullWidth
                margin="normal"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <TextField
                label="Phone Number"
                variant="outlined"
                fullWidth
                margin="normal"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              {errorMessage && (
                <Typography
                  color="error"
                  variant="body2"
                  align="center"
                  sx={{ marginTop: 2 }}
                >
                  {errorMessage}
                </Typography>
              )}
              {successMessage && (
                <Typography
                  color="green"
                  variant="body2"
                  align="center"
                  sx={{ marginTop: 2 }}
                >
                  {successMessage}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ marginTop: 3 }}
              >
                Sign Up
              </Button>
            </form>
            {/* Login Link */}
            <Typography variant="body2" align="center" sx={{ marginTop: 2 }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  textDecoration: "none",
                  color: "#1976D2",
                  fontWeight: "bold",
                }}
              >
                Log in here
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Footer />
    </Box>
  );
}

export default Signup;
