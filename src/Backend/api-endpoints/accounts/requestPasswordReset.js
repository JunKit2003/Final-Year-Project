// src/Backend/api-endpoints/accounts/requestPasswordReset.js

import crypto from 'crypto';
import { transporter } from '../../config/nodemailer.js'; // Named import
import { db } from '../../database/index.js';
import { InputValidationError } from '../../database/utils.js';

/**
 * POST /api/account/request-password-reset
 * Body: { email, recaptchaToken }
 */
export default async function requestPasswordReset(req, res) {
  try {
    const { email, recaptchaToken } = req.body;

    if (!email) {
      throw new InputValidationError("Email is required for password reset.");
    }

    // (Optional) reCAPTCHA validation

    // 1. Check if user exists
    const user = await db.Account.findOne({ where: { email } });
    if (!user) {
      // Generic response for security: always return success
      return res.status(200).json({
        success: true,
        message: "If that email is registered, a reset code has been sent.",
      });
    }

    // 2. Generate token & expiration
    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiration = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    // 3. Store them
    user.password_reset_token = resetToken;
    user.password_reset_token_expiration = expiration;
    await user.save();

    // 4. Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Hello ${user.first_name || ''},

You requested a password reset. Here is your code:

${resetToken}

It will expire in 15 minutes.

If you did not request this, please ignore.

Thanks,
Your Bike Shop Team
`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error in request-password-reset:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request at this time.",
    });
  }
}
