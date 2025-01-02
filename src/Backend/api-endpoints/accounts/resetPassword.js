// src/Backend/api-endpoints/accounts/resetPassword.js

import bcrypt from 'bcrypt';
import { db } from '../../database/index.js';
import { InputValidationError } from '../../database/utils.js';

/**
 * POST /api/account/reset-password
 * Body: { email, code, newPassword }
 */
export default async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      throw new InputValidationError(
        "All fields (email, code, newPassword) are required."
      );
    }

    // 1. Find user by email
    const user = await db.Account.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or code." });
    }

    // 2. Check token matches
    if (user.password_reset_token !== code) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset code." });
    }

    // 3. Check token expiration
    if (
      !user.password_reset_token_expiration ||
      user.password_reset_token_expiration < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Reset code expired." });
    }

    // 4. Hash new password
    if (newPassword.length < 6) {
      throw new InputValidationError("Password must be at least 6 characters.");
    }
    const hashed = await bcrypt.hash(newPassword, 10);

    // 5. Update user password and clear token
    user.password = hashed;
    user.password_reset_token = null;
    user.password_reset_token_expiration = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your password has been reset successfully!",
    });
  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error in reset-password:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password at this time.",
    });
  }
}
