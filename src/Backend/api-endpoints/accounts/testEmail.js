import { transporter, mailFrom } from '../../config/nodemailer.js';

// Admin-only (see routes.js): sends a test message to the signed-in admin's own email,
// or to EMAIL_TEST_TO if set, and reports whether SMTP accepted it.
export default async function testEmail(req, res) {
  const to = process.env.EMAIL_TEST_TO || req.session?.user?.email;
  if (!to) {
    return res.status(400).json({ message: "No recipient: set EMAIL_TEST_TO or give the admin account an email." });
  }
  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      to,
      subject: 'Faction Bikeworks test email',
      text: 'Hello! SMTP is working for Faction Bikeworks.',
    });
    return res.status(200).json({ message: `Test email sent to ${to}.`, response: info.response });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(502).json({ message: 'SMTP rejected the test email. Check EMAIL_* settings.', error: error.message });
  }
}
