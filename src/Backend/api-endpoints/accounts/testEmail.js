import { transporter } from '../../config/nodemailer.js';

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'trialemaildeveloper@gmail.com', // Must match the registered email
      subject: 'Test Email via Elastic Email',
      text: 'Hello! This is a test email sent using Elastic Email SMTP via Nodemailer.',
    });
    console.log('✅ Test email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

// Run directly if executed from the command line
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmail();
}

// Export for reuse
export default testEmail;
