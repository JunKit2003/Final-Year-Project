import crypto from 'crypto';
import { transporter } from '../../config/nodemailer.js';
import { db } from '../../database/index.js';
import { InputValidationError } from '../../database/utils.js';

export default async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      throw new InputValidationError("Email is required for password reset.");
    }

    // Find user by email
    const user = await db.Account.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    // Generate reset token (expires in 15 min)
    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiration = new Date(Date.now() + 1000 * 60 * 15);

    // Store token in DB
    user.password_reset_token = resetToken;
    user.password_reset_token_expiration = expiration;
    await user.save();

    // Send password reset email
    const mailOptions = {
      from: `"Faction Bikeworks" <noreply@junkit.work>`, // Use Brevo-verified sender
      to: user.email,
      subject: 'Password Reset Request',
      text: `Hello,

You requested a password reset. Use this code:

${resetToken}

It expires in 15 minutes.

If you did not request this, ignore this email.

Faction Bikeworks Team
`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    console.error("Error in request-password-reset:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request at this time.",
    });
  }
}
