import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testEmailConfig = async () => {
  console.log('=== Email System Test ===\n');

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const enableEmail = process.env.ENABLE_EMAIL_NOTIFICATIONS;

  console.log('Current Configuration:');
  console.log(`  EMAIL_SERVICE: ${emailService || 'not set (defaults to gmail)'}`);
  console.log(`  EMAIL_USER: ${emailUser || 'NOT SET!'}`);
  console.log(`  EMAIL_PASS: ${emailPass ? '***SET***' : 'NOT SET!'}`);
  console.log(`  ENABLE_EMAIL_NOTIFICATIONS: ${enableEmail || 'not set'}\n`);

  if (!emailUser || !emailPass) {
    console.log('❌ ERROR: EMAIL_USER and EMAIL_PASS must be configured in .env file');
    console.log('\nRequired .env variables:');
    console.log('  EMAIL_USER=your-email@gmail.com');
    console.log('  EMAIL_PASS=your-app-password');
    console.log('  EMAIL_SERVICE=gmail');
    console.log('  ENABLE_EMAIL_NOTIFICATIONS=true');
    return false;
  }

  if (enableEmail === 'false') {
    console.log('⚠️  WARNING: ENABLE_EMAIL_NOTIFICATIONS is set to false');
    console.log('Emails will be skipped. Set ENABLE_EMAIL_NOTIFICATIONS=true to enable.\n');
  }

  console.log('Creating transporter...');
  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    const testResults = [];

    console.log('--- Test 1: Creator Application Email ---');
    const creatorResult = await sendCreatorTestEmail(transporter, emailUser);
    testResults.push({ test: 'Creator Application Email', ...creatorResult });

    console.log('\n--- Test 2: Brand Campaign Brief Email ---');
    const brandResult = await sendBrandTestEmail(transporter, emailUser);
    testResults.push({ test: 'Brand Campaign Brief Email', ...brandResult });

    console.log('\n=== Test Summary ===');
    testResults.forEach(result => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status}: ${result.test}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const allPassed = testResults.every(r => r.success);
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);

    return allPassed;
  } catch (error) {
    console.log(`❌ SMTP connection failed: ${error.message}`);
    console.log('\nTroubleshooting tips:');
    console.log('1. For Gmail: Use App Password instead of regular password');
    console.log('   - Go to: https://myaccount.google.com/security');
    console.log('   - Enable 2FA, then create App Password');
    console.log('2. Check that EMAIL_USER and EMAIL_PASS are correct');
    console.log('3. For other services, check SMTP settings');
    return false;
  }
};

async function sendCreatorTestEmail(transporter, fromEmail) {
  const creatorEmail = process.env.CREATOR_TEST_EMAIL || 'dushyant22062003@gmail.com';
  const creatorName = 'Test Creator';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A3C8F; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #F47B20; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <h2>Hi ${creatorName},</h2>
          <p>Thank you for applying to Triple F Media!</p>
          <p>We have received your application and our team will review it within <strong>48 hours</strong>.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Application ID:</strong> test-12345</p>
            <p><strong>Platform:</strong> Creator</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          <p>What happens next?</p>
          <ol>
            <li>Our team reviews your profile (content quality, engagement)</li>
            <li>If approved, you'll receive a WhatsApp welcome message</li>
            <li>You'll start receiving campaign briefs from brands</li>
          </ol>
          <a href="https://triplef.vercel.app/status?appId=test-12345" class="button">Check Application Status</a>
        </div>
        <div class="footer">
          <p>Triple F Media - Your audience is an asset. Let's make it earn.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: creatorEmail,
      subject: 'Application Received - Triple F Media',
      html,
    });
    console.log(`✅ Email sent to ${creatorEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.log(`❌ Failed to send email: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendBrandTestEmail(transporter, fromEmail) {
  const brandEmail = process.env.BRAND_TEST_EMAIL || 'dushyant4665fixlsolution@gmail.com';
  const brandName = 'Test Brand';
  const leadId = 'test-lead-12345';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A3C8F; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <h2>Hi,</h2>
          <p>Thank you for submitting your campaign brief for <strong>${brandName}</strong>.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Campaign ID:</strong> ${leadId}</p>
            <p><strong>Brand:</strong> ${brandName}</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          <p>Our team will review your brief and share a creator proposal within 24 hours.</p>
        </div>
        <div class="footer">
          <p>Triple F Media - Your audience is an asset. Let's make it earn.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: brandEmail,
      subject: `Your Campaign Brief - ${brandName}`,
      html,
    });
    console.log(`✅ Email sent to ${brandEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.log(`❌ Failed to send email: ${error.message}`);
    return { success: false, error: error.message };
  }
}

testEmailConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
