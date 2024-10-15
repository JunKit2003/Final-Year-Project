import React, { useState } from "react";
import { Box, Button, TextField, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom"; // Assuming you're using react-router for navigation

function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_HOST}/api/account/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed!");
      }

      // Handle successful login (e.g., save token, redirect)
      navigate("/admin"); // Redirect to admin page on success
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
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
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ marginTop: 3 }}>
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
