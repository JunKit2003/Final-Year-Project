import { transporter } from '../../config/nodemailer.js';

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"Faction Bikeworks" <noreply@junkit.work>`, // Use your verified Brevo sender
      to: 'chee.jk@gmail.com', // Replace with your actual email for testing
      subject: 'Test Email via Brevo SMTP',
      text: 'Hello! This is a test email sent using Brevo SMTP via Nodemailer.',
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

// Export for reuse in other modules
export default testEmail;
