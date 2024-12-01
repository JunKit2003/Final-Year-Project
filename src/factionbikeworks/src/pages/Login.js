import React, { useState } from "react";
import { Box, Button, TextField, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "../AxiosSingleton";
import Header from "../components/Header"; // Import Header component

function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/login`,
        {
          emailOrUsername,
          password,
        }
      );

      console.log("Login successful:", response.data);

      if (response.data.user) {
        setSuccessMessage("Login successful!");
        setErrorMessage("");

        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setErrorMessage("Login failed: No user data received.");
      }
    } catch (error) {
      if (error.response) {
        setErrorMessage(error.response.data.message || "Login failed!");
        setSuccessMessage("");
      } else {
        setErrorMessage("Login failed: Network error.");
        setSuccessMessage("");
      }
    }
  };

  return (
    <div>
      <Header /> {/* Add Header component */}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Card sx={{ width: 400, padding: 4 }}>
          <CardContent>
            <Typography variant="h5" align="center" gutterBottom>
              Login
            </Typography>
            <form onSubmit={handleLogin}>
              <TextField
                label="Email or Username"
                variant="outlined"
                fullWidth
                margin="normal"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
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
              {errorMessage && (
                <Typography color="error" variant="body2" align="center" sx={{ marginTop: 2 }}>
                  {errorMessage}
                </Typography>
              )}
              {successMessage && (
                <Typography color="green" variant="body2" align="center" sx={{ marginTop: 2 }}>
                  {successMessage}
                </Typography>
              )}
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ marginTop: 3 }}>
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </div>
  );
}

export default Login;
