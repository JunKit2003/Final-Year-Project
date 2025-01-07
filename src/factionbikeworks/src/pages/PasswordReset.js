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
 *  Step 1: User enters email + passes reCAPTCHA => request a reset code.
 *  Step 2: User enters the code + new password => reset password.
 *
 * Endpoints assumed:
 *  - POST /api/account/request-password-reset  => body: { email, recaptchaToken }
 *  - POST /api/account/reset-password         => body: { email, code, newPassword }
 */

function PasswordReset() {
  // Navigation
  const navigate = useNavigate();

  // Step management: 1 = request reset code, 2 = enter code/new password
  const [step, setStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Messages & Errors
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Mock function to handle reCAPTCHA (replace with actual reCAPTCHA flow)
  const handleRecaptcha = async () => {
    try {
      // Typically you'd integrate something like `react-google-recaptcha`:
      //   <ReCAPTCHA
      //     sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
      //     onChange={(token) => setRecaptchaToken(token)}
      //   />
      // For now, let's mock it:
      const fakeToken = "fakeRecaptchaToken123";
      setRecaptchaToken(fakeToken);
    } catch (err) {
      console.error("reCAPTCHA error:", err);
      setErrorMessage("reCAPTCHA verification failed. Please try again.");
    }
  };

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

    // Mock reCAPTCHA flow (if you haven't called it yet)
    if (!recaptchaToken) {
      await handleRecaptcha();
    }

    try {
      // Call your backend endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/account/requestPasswordReset`,
        {
          email,
          recaptchaToken, // pass the token from reCAPTCHA
        }
      );

      if (response.data.success) {
        setSuccessMessage(
          "A reset code was sent to your email. Please check your inbox."
        );
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
      if (error.response) {
        setErrorMessage(error.response.data.message || "Failed to send reset code.");
      } else {
        setErrorMessage("Network error. Please try again.");
      }
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
        // Redirect to login or somewhere else after a brief delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErrorMessage(response.data.message || "Failed to reset password.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      if (error.response) {
        setErrorMessage(error.response.data.message || "Failed to reset password.");
      } else {
        setErrorMessage("Network error. Please try again.");
      }
    }
  };

  /**
   * Renders the appropriate form based on current step
   */
  const renderForm = () => {
    // STEP 1: Request Reset Code
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
            {/* If you had an actual reCAPTCHA component, you'd place it here */}
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
              Send Reset Code
            </Button>
          </form>
        </>
      );
    }

    // STEP 2: Enter Code + New Password
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Card sx={{ width: 400, padding: 4 }}>
          <CardContent>{renderForm()}</CardContent>
        </Card>
      </Box>
    </div>
  );
}

export default PasswordReset;
