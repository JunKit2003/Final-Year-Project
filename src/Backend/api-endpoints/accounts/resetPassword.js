// src/Backend/api-endpoints/accounts/resetPassword.js

import bcrypt from 'bcrypt';
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
} from '../../database/utils.js';
import { db } from '../../database/index.js';

/**
 * POST /api/account/reset-password
 * Body: { email, code, newPassword }
 */
export default async function resetPassword(req, res) {
  try {
    // 1. Extract form data
    const { email, code, newPassword } = req.body;

    // 2. Validate input
    if (!email || !code || !newPassword) {
      throw new InputValidationError(
        "All fields (email, code, newPassword) are required."
      );
    }

    // 3. Ping DB
    await pingDatabase();

    // 4. Find user by email
    const user = await db.Account.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or code." });
    }

    // 5. Check token matches
    if (user.password_reset_token !== code) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset code." });
    }

    // 6. Check token expiration
    if (
      !user.password_reset_token_expiration ||
      user.password_reset_token_expiration < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Reset code expired." });
    }

    // 7. Validate and hash new password
    if (newPassword.length < 6) {
      throw new InputValidationError("Password must be at least 6 characters.");
    }
    // 7. Validate and hash new password
    // console.log("Reset Password - Plaintext Password:", newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // console.log("Reset Password - Hashed Password:", hashedPassword);

    // 8. Update user password and clear token
    user.password = hashedPassword;
    // console.log("Stored in DB :", user.password)
    user.password_reset_token = null;
    user.password_reset_token_expiration = null;
    await user.save();

    // 9. Return success
    return res.status(200).json({
      success: true,
      message: "Your password has been reset successfully!",
    });

  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res
        .status(500)
        .json({ success: false, message: "Unable to connect to the database!" });
    } else {
      console.error("Error in reset-password:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to reset password at this time.",
      });
    }
  }
}
