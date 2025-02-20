import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Debugging: Ensure variables are loaded correctly
// console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "Loaded" : "Not Loaded");
// console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
// console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
// console.log("EMAIL_SECURE:", process.env.EMAIL_SECURE);

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === 'true', // Brevo uses STARTTLS (false for 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
