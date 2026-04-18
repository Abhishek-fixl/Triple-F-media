import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testInternalEmails = async () => {
  console.log('=== Internal Email Notification Test ===\n');

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (!emailUser || !emailPass) {
    console.log('❌ ERROR: EMAIL_USER and EMAIL_PASS not configured');
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: { user: emailUser, pass: emailPass },
  });

  await transporter.verify();
  console.log('✅ SMTP connection verified\n');

  const testResults = [];

  console.log('--- Test 1: Onboarding Specialist Email (Creator Application) ---');
  const onboardingResult = await sendOnboardingEmail(transporter, emailUser);
  testResults.push({ test: 'Onboarding Specialist Email', ...onboardingResult });

  console.log('\n--- Test 2: Campaign Manager Email (Brand Brief) ---');
  const campaignResult = await sendCampaignManagerEmail(transporter, emailUser);
  testResults.push({ test: 'Campaign Manager Email', ...campaignResult });

  console.log('\n--- Test 3: Super Admin CC Email ---');
  const adminResult = await sendSuperAdminEmail(transporter, emailUser);
  testResults.push({ test: 'Super Admin CC Email', ...adminResult });

  console.log('\n=== Test Summary ===');
  testResults.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.test}`);
    if (!result.success) console.log(`   Error: ${result.error}`);
  });

  const allPassed = testResults.every(r => r.success);
  console.log(`\n${allPassed ? '✅ All internal email tests passed!' : '❌ Some tests failed'}`);
  return allPassed;
};

async function sendOnboardingEmail(transporter, fromEmail) {
  const toEmail = process.env.ONBOARDING_SPECIALIST_EMAIL || 'dushyant22062003@gmail.com';

  const html = `
    <p>New creator application received.</p>
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p><strong>Name:</strong> Test Creator Name</p>
      <p><strong>Age:</strong> 25</p>
      <p><strong>City:</strong> Mumbai</p>
      <p><strong>Platform:</strong> Instagram</p>
      <p><strong>Followers:</strong> 50k</p>
      <p><strong>Niche:</strong> Beauty</p>
      <p><strong>WhatsApp:</strong> +919999999999</p>
      <p><strong>Email:</strong> creator.test@example.com</p>
    </div>
    <p><a href="#">Review Application</a></p>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      cc: process.env.SUPER_ADMIN_EMAIL || fromEmail,
      subject: 'New Creator Application: Test Creator Name',
      html,
    });
    console.log(`✅ Email sent to Onboarding Specialist: ${toEmail}`);
    console.log(`   CC: ${process.env.SUPER_ADMIN_EMAIL || fromEmail}`);
    return { success: true };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendCampaignManagerEmail(transporter, fromEmail) {
  const toEmail = process.env.CAMPAIGN_MANAGER_EMAIL || 'dushyant4665fixlsolution@gmail.com';

  const html = `
    <p>New brand brief received.</p>
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p><strong>Brand Name:</strong> Test Brand Co</p>
      <p><strong>Contact Name:</strong> John Doe</p>
      <p><strong>Email:</strong> john@testbrand.com</p>
      <p><strong>Phone:</strong> +919999999998</p>
      <p><strong>Campaign Goal:</strong> Brand Awareness</p>
      <p><strong>Budget:</strong> 1L-5L</p>
      <p><strong>Timeline:</strong> April 2026</p>
    </div>
    <p><a href="#">View Brief</a></p>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      cc: process.env.SUPER_ADMIN_EMAIL || fromEmail,
      subject: 'New Brand Brief: Test Brand Co',
      html,
    });
    console.log(`✅ Email sent to Campaign Manager: ${toEmail}`);
    console.log(`   CC: ${process.env.SUPER_ADMIN_EMAIL || fromEmail}`);
    return { success: true };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendSuperAdminEmail(transporter, fromEmail) {
  const toEmail = process.env.SUPER_ADMIN_EMAIL || fromEmail;

  const html = `
    <p>Test email to verify Super Admin CC functionality.</p>
    <p>This email tests that CC recipients receive notifications properly.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: 'Test: Super Admin Email Notification',
      html,
    });
    console.log(`✅ Email sent to Super Admin: ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

testInternalEmails()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => { console.error(error); process.exit(1); });
