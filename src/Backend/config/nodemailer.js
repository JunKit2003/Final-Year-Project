// config/nodemailer.js
import nodemailer from 'nodemailer';

// Create a named exporter "transporter"
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // e.g., "yourgmail@gmail.com"
    pass: process.env.EMAIL_PASSWORD, // e.g., "yourGmailPassword"
  },
});
