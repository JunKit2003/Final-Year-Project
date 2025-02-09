import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import axios from "../AxiosSingleton";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header"; // Optional: your header component

/**
 * Two-step Password Reset flow:
 *  Step 1: User enters email => request a reset code.
 *  Step 2: User enters the code + new password => reset password.
 *
 * Endpoints assumed:
 *  - POST /api/account/request-password-reset  => body: { email }
 *  - POST /api/account/reset-password         => body: { email, code, newPassword }
 */

function PasswordReset() {
  const navigate = useNavigate();

  // Step management: 1 = request reset code, 2 = enter code/new password
  const [step, setStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Messages & Errors
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Step 1: Request reset code
   */
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email) {
      setErrorMessage("Email is required to reset your password.");
      return;
    }

    try {
      // Call your backend endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/requestPasswordReset`,
        { email }
      );

      if (response.data.success) {
        setSuccessMessage("A reset code was sent to your email. Please check your inbox.");
        // Move to step 2 after a brief delay
        setTimeout(() => {
          setStep(2);
          setErrorMessage("");
          setSuccessMessage("");
        }, 1500);
      } else {
        setErrorMessage(response.data.message || "Failed to send reset code.");
      }
    } catch (error) {
      console.error("Error requesting reset code:", error);
      setErrorMessage(error.response?.data?.message || "Network error. Please try again.");
    }
  };

  /**
   * Step 2: Verify code & reset password
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!code || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      // Call your backend endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/resetPassword`,
        {
          email,
          code,
          newPassword,
        }
      );

      if (response.data.success) {
        setSuccessMessage("Your password has been reset successfully!");
        // Redirect to login page after a brief delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErrorMessage(response.data.message || "Failed to reset password.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setErrorMessage(error.response?.data?.message || "Network error. Please try again.");
    }
  };

  /**
   * Renders the appropriate form based on current step
   */
  const renderForm = () => {
    if (step === 1) {
      return (
        <>
          <Typography variant="h5" align="center" gutterBottom>
            Forgot Password
          </Typography>
          <form onSubmit={handleRequestResetCode}>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Send Reset Code
            </Button>
          </form>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Typography variant="h5" align="center" gutterBottom>
            Reset Your Password
          </Typography>
          <form onSubmit={handleResetPassword}>
            <TextField
              label="Reset Code"
              variant="outlined"
              fullWidth
              margin="normal"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <TextField
              label="New Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <TextField
              label="Confirm New Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              Reset Password
            </Button>
          </form>
        </>
      );
    }
  };

  return (
    <div>
      <Header />
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Card sx={{ width: 400, padding: 4 }}>
          <CardContent>{renderForm()}</CardContent>
        </Card>
      </Box>
    </div>
  );
}

export default PasswordReset;
