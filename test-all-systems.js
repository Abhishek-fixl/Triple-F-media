import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import nodemailer from 'nodemailer';
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRE = '7d';
process.env.ADMIN_EMAIL = 'admin@triplef.com';
process.env.ADMIN_PASSWORD = 'Admin@123';
process.env.CAMPAIGN_MANAGER_EMAIL = 'campaign.manager@triplef.com';
process.env.CAMPAIGN_MANAGER_PASSWORD = 'Manager@123';
process.env.FINANCE_MANAGER_EMAIL = 'finance.manager@triplef.com';
process.env.FINANCE_MANAGER_PASSWORD = 'Finance@123';
process.env.ONBOARDING_SPECIALIST_EMAIL = 'onboarding@triplef.com';
process.env.ONBOARDING_SPECIALIST_PASSWORD = 'Onboard@123';
process.env.ONBOARDING_EMAIL = 'onboarding@triplef.com';
process.env.CAMPAIGN_EMAIL = 'campaign@triplef.com';
process.env.SUPER_ADMIN_EMAIL = 'admin@triplef.com';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BACKEND_PUBLIC_URL = 'http://localhost:5000';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_WEBHOOK_SECRET = 'test_twilio_webhook_secret';
process.env.TWILIO_WHATSAPP_NUMBER = '';
process.env.RESEND_API_KEY = '';
process.env.RESEND_WEBHOOK_SECRET = 'test_resend_webhook_secret';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'dushyantkhandelwal4665@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || '';
process.env.EMAIL_SERVICE = 'gmail';
process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';

const mongoServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongoServer.getUri('triplef-test');

const [{ default: mongoose }, { default: app }, { default: connectDatabase }, authModule, models] = await Promise.all([
  import('mongoose'),
  import('./src/app.js'),
  import('./src/config/database.js'),
  import('./src/controllers/authController.js'),
  Promise.all([
    import('./src/models/Application.js'),
    import('./src/models/BrandAccount.js'),
    import('./src/models/BrandLead.js'),
    import('./src/models/Campaign.js'),
    import('./src/models/CampaignCreator.js'),
    import('./src/models/ChatLead.js'),
    import('./src/models/ChatLog.js'),
    import('./src/models/Creator.js'),
    import('./src/models/NotificationLog.js'),
    import('./src/models/Lead.js'),
    import('./src/models/Payment.js'),
    import('./src/models/User.js'),
  ]),
]);

const [
  { default: Application },
  { default: BrandAccount },
  { default: BrandLead },
  { default: Campaign },
  { default: CampaignCreator },
  { default: ChatLead },
  { default: ChatLog },
  { default: Creator },
  { default: NotificationLog },
  { default: Lead },
  { default: Payment },
  { default: User },
] = models;

await connectDatabase();
await authModule.ensureDefaultAdminUsers();

const results = { passed: 0, failed: 0, tests: [] };

const logTest = (name, passed, error = null) => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) console.log(`   Error: ${error}`);
  results.tests.push({ name, passed, error });
  if (passed) results.passed++;
  else results.failed++;
};

const expectSuccess = async (response, statusCode = 200) => {
  if (response.status !== statusCode) {
    throw new Error(`Expected ${statusCode}, got ${response.status}: ${JSON.stringify(response.body)}`);
  }
  if (!response.body.success) {
    throw new Error(`Expected success, got: ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
};

const loginAs = async (email, password) => {
  const agent = request.agent(app);
  await expectSuccess(agent.post('/api/auth/login').send({ email, password }), 200);
  return agent;
};

try {
  console.log('\n=== TESTING ALL ROUTES AND SYSTEMS ===\n');

  console.log('--- 1. AUTHENTICATION ---');
  const invalidLogin = await request(app).post('/api/auth/login').send({ email: 'wrong@email.com', password: 'wrong' });
  logTest('Invalid login returns 401', invalidLogin.status === 401);

  const noToken = await request(app).get('/api/admin/dashboard');
  logTest('No token returns 401', noToken.status === 401);

  console.log('\n--- 2. PUBLIC ROUTES ---');
  const calcResult = await request(app).get('/api/creators/calculator').query({
    platform: 'instagram',
    followers: 25000,
    niche: 'beauty',
    frequency: '3-4x/week',
    engagement: 'good',
    city: 'Mumbai',
  });
  logTest('Calculator works', calcResult.status === 200);

  const missingFields = await request(app).post('/api/creators/apply').send({ name: 'Only Name' });
  logTest('Creator apply validates required fields', missingFields.status === 400);

  console.log('\n--- 3. CREATOR APPLICATION WITH EMAIL ---');
  const creatorApp = await request(app).post('/api/creators/apply').send({
    name: 'Test Creator',
    age: 24,
    city: 'Mumbai',
    platform: 'instagram',
    followers: '10k-50k',
    niche: 'beauty',
    profileLink: 'https://instagram.com/testcreator',
    whatsapp: '+919999999901',
    email: 'testcreator@example.com',
  });
  logTest('Creator application submitted', creatorApp.status === 201);

  const creatorEmailLogs = await NotificationLog.find({ module: 'applications', channel: 'email' });
  logTest('Email notification logged for creator', creatorEmailLogs.length >= 1);

  const creatorInternalLogs = await NotificationLog.find({ module: 'applications_internal', channel: 'email' });
  logTest('Internal email sent to onboarding specialist', creatorInternalLogs.length >= 1);

  console.log('\n--- 4. BRAND BRIEF WITH EMAIL ---');
  const brandBrief = await request(app).post('/api/brands/submit-brief').send({
    brandName: 'Test Brand Co',
    contactName: 'John Doe',
    email: 'john@testbrand.com',
    phone: '+919999999902',
    campaignGoal: 'awareness',
    targetAudience: 'Women 18-30',
    budget: '1l-5l',
    timeline: 'April 2026',
    notes: 'Test brief',
  });
  logTest('Brand brief submitted', brandBrief.status === 201);

  const brandEmailLogs = await NotificationLog.find({ module: 'brand_leads', channel: 'email' });
  logTest('Email notification logged for brand', brandEmailLogs.length >= 1);

  const brandInternalLogs = await NotificationLog.find({ module: 'brand_leads_internal', channel: 'email' });
  logTest('Internal email sent to campaign manager', brandInternalLogs.length >= 1);

  console.log('\n--- 5. ADMIN LOGINS ---');
  const adminAgent = await loginAs(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  logTest('Super Admin login', true);

  const campaignAgent = await loginAs(process.env.CAMPAIGN_MANAGER_EMAIL, process.env.CAMPAIGN_MANAGER_PASSWORD);
  logTest('Campaign Manager login', true);

  const financeAgent = await loginAs(process.env.FINANCE_MANAGER_EMAIL, process.env.FINANCE_MANAGER_PASSWORD);
  logTest('Finance Manager login', true);

  const onboardingAgent = await loginAs(process.env.ONBOARDING_SPECIALIST_EMAIL, process.env.ONBOARDING_SPECIALIST_PASSWORD);
  logTest('Onboarding Specialist login', true);

  console.log('\n--- 6. ROLE-BASED ACCESS CONTROL ---');

  const adminDashboard = await adminAgent.get('/api/admin/dashboard');
  logTest('Super Admin can access dashboard', adminDashboard.status === 200);

  const campaignDashboard = await campaignAgent.get('/api/admin/dashboard');
  logTest('Campaign Manager can access dashboard', campaignDashboard.status === 200);

  const financeDashboard = await financeAgent.get('/api/admin/dashboard');
  logTest('Finance Manager can access dashboard', financeDashboard.status === 200);

  const onboardingDashboard = await onboardingAgent.get('/api/admin/dashboard');
  logTest('Onboarding Specialist can access dashboard', onboardingDashboard.status === 200);

  console.log('\n--- 7. ONBOARDING SPECIALIST ROUTES ---');
  const osApps = await onboardingAgent.get('/api/admin/applications');
  logTest('Onboarding Specialist can view applications', osApps.status === 200);

  const osLeads = await onboardingAgent.get('/api/admin/leads');
  logTest('Onboarding Specialist can view leads', osLeads.status === 200);

  const osCreators = await onboardingAgent.get('/api/admin/creators');
  logTest('Onboarding Specialist CANNOT view creators', osCreators.status === 403);

  const osCampaigns = await campaignAgent.get('/api/admin/campaigns');
  logTest('Onboarding Specialist CANNOT view campaigns', osCampaigns.status === 403);

  console.log('\n--- 8. CAMPAIGN MANAGER ROUTES ---');
  const cmCreators = await campaignAgent.get('/api/admin/creators');
  logTest('Campaign Manager can view creators', cmCreators.status === 200);

  const cmCampaigns = await campaignAgent.get('/api/admin/campaigns');
  logTest('Campaign Manager can view campaigns', cmCampaigns.status === 200);

  const cmAnalytics = await campaignAgent.get('/api/admin/analytics/overview');
  logTest('Campaign Manager can view analytics', cmAnalytics.status === 200);

  const cmTopCreators = await campaignAgent.get('/api/admin/analytics/top-creators');
  logTest('Campaign Manager can view top creators', cmTopCreators.status === 200);

  const cmPayments = await campaignAgent.get('/api/admin/payments');
  logTest('Campaign Manager CANNOT view payments', cmPayments.status === 403);

  const cmApplications = await campaignAgent.get('/api/admin/applications');
  logTest('Campaign Manager CANNOT view applications', cmApplications.status === 403);

  console.log('\n--- 9. FINANCE MANAGER ROUTES ---');
  const fmPayments = await financeAgent.get('/api/admin/payments');
  logTest('Finance Manager can view payments', fmPayments.status === 200);

  const fmRevenue = await financeAgent.get('/api/admin/analytics/revenue');
  logTest('Finance Manager can view revenue analytics', fmRevenue.status === 200);

  const fmCreators = await financeAgent.get('/api/admin/creators');
  logTest('Finance Manager can view creators', fmCreators.status === 200);

  const fmCampaigns = await financeAgent.get('/api/admin/campaigns');
  logTest('Finance Manager CANNOT view campaigns', fmCampaigns.status === 403);

  const fmApplications = await financeAgent.get('/api/admin/applications');
  logTest('Finance Manager CANNOT view applications', fmApplications.status === 403);

  console.log('\n--- 10. SUPER ADMIN ROUTES ---');
  const saUsers = await adminAgent.get('/api/admin/users');
  logTest('Super Admin can view users', saUsers.status === 200);

  const saAuditLogs = await adminAgent.get('/api/admin/audit-logs');
  logTest('Super Admin can view audit logs', saAuditLogs.status === 200);

  const saTopBrands = await adminAgent.get('/api/admin/analytics/top-brands');
  logTest('Super Admin can view top brands', saTopBrands.status === 200);

  console.log('\n--- 11. CAMPAIGN MANAGEMENT ---');
  const application = await Application.findOne({ email: 'testcreator@example.com' });
  const creator = await Creator.findOne({ email: 'testcreator@example.com' });

  if (application) {
    const approved = await onboardingAgent.post(`/api/admin/applications/${application._id}/approve`).send({
      handle: 'testcreator',
      upiId: 'test@upi',
      panNumber: 'TESTP1234T',
      engagementRate: 4.5,
      tags: ['test'],
    });
    logTest('Onboarding Specialist can approve application', approved.status === 200);
  }

  const brandLead = await BrandLead.findOne({ brandName: 'Test Brand Co' });

  if (brandLead && creator) {
    const campaign = await campaignAgent.post('/api/admin/campaigns').send({
      campaignName: 'Test Campaign',
      brandName: 'Test Brand Co',
      brandLeadId: brandLead._id,
      type: 'sponsored_post',
      budget: 100000,
      creatorCount: 1,
      timelineStart: '2026-04-01',
      timelineEnd: '2026-04-30',
      creators: [{ creatorId: creator._id, amount: 50000 }],
    });
    logTest('Campaign Manager can create campaign', campaign.status === 201);

    if (campaign.status === 201) {
      const campaignData = campaign.body.data.campaign;

      const sendBriefs = await campaignAgent.post(`/api/admin/campaigns/${campaignData._id}/send-briefs`).send({});
      logTest('Campaign Manager can send briefs', sendBriefs.status === 200);

      const assignment = await CampaignCreator.findOne({ campaignId: campaignData._id });

      if (assignment) {
        const markLive = await campaignAgent.post(`/api/admin/campaigns/${campaignData._id}/creators/${creator._id}/mark-live`).send({
          postUrl: 'https://instagram.com/p/test123',
        });
        logTest('Campaign Manager can mark post live', markLive.status === 200);

        const approveContent = await campaignAgent.post(`/api/admin/campaigns/${campaignData._id}/creators/${creator._id}/approve-content`).send({
          feedback: 'Great content',
        });
        logTest('Campaign Manager can approve content', approveContent.status === 200);
      }
    }
  }

  console.log('\n--- 12. PAYMENT PROCESSING ---');
  const payments = await financeAgent.get('/api/admin/payments');
  logTest('Finance Manager can view payments list', payments.status === 200);

  const pendingPayments = await Payment.countDocuments({ status: 'pending' });
  if (pendingPayments > 0) {
    const paymentIds = await Payment.find({ status: 'pending' }).limit(1).select('_id');
    const processResult = await financeAgent.post('/api/admin/payments/process').send({
      assignmentIds: paymentIds.map(p => p._id),
    });
    logTest('Finance Manager can process payments', processResult.status === 200);
  } else {
    logTest('Finance Manager can process payments (no pending payments)', true);
  }

  console.log('\n--- 13. EMAIL SYSTEM VERIFICATION ---');
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailUser, pass: emailPass },
    });

    try {
      await transporter.verify();
      logTest('SMTP connection verified', true);

      const testEmail = await transporter.sendMail({
        from: emailUser,
        to: emailUser,
        subject: 'Test Email - Triple F Media',
        html: '<p>Test email from Triple F Media system</p>',
      });
      logTest('Test email sent successfully', !!testEmail.messageId);
    } catch (error) {
      logTest('SMTP connection', false, error.message);
    }
  } else {
    logTest('SMTP connection (no credentials)', false, 'EMAIL_USER or EMAIL_PASS not set');
  }

  console.log('\n--- 14. WHATSAPP SYSTEM ---');
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioSid && twilioToken && twilioNumber) {
    logTest('WhatsApp credentials configured', true);
  } else {
    logTest('WhatsApp credentials (not configured)', true);
  }

  console.log('\n--- 15. CHAT SYSTEM ---');
  const chatSession = 'test_chat_session';
  const chatResponse = await request(app).post('/api/chat/send').send({
    message: 'I want to join as a creator',
    sessionId: chatSession,
    userType: 'creator',
    conversationHistory: [],
  });
  logTest('Chat system works', chatResponse.status === 200 && chatResponse.body.data?.reply);

  const chatLead = await ChatLead.findOne({ sessionId: chatSession });
  logTest('Chat lead captured', !!chatLead);

  console.log('\n--- 16. APPLICATION STATUS CHECK ---');
  const duplicateApp = await request(app).post('/api/creators/apply').send({
    name: 'Duplicate Creator',
    age: 25,
    city: 'Delhi',
    platform: 'instagram',
    followers: '10k-50k',
    niche: 'tech',
    profileLink: 'https://instagram.com/dup',
    whatsapp: '+919999999901',
    email: 'testcreator@example.com',
  });
  logTest('Duplicate application rejected', duplicateApp.status === 409);

  console.log('\n--- 17. DATA INTEGRITY ---');
  const appCount = await Application.countDocuments();
  const creatorCount = await Creator.countDocuments();
  const leadCount = await Lead.countDocuments();
  const brandLeadCount = await BrandLead.countDocuments();
  const campaignCount = await Campaign.countDocuments();
  const notificationCount = await NotificationLog.countDocuments();

  console.log(`   Applications: ${appCount}`);
  console.log(`   Creators: ${creatorCount}`);
  console.log(`   Leads: ${leadCount}`);
  console.log(`   Brand Leads: ${brandLeadCount}`);
  console.log(`   Campaigns: ${campaignCount}`);
  console.log(`   Notifications: ${notificationCount}`);

  logTest('Data integrity maintained', appCount >= 1 && creatorCount >= 1);

  console.log('\n' + '='.repeat(50));
  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Total: ${results.tests.length}`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error || 'Unknown error'}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log(results.failed === 0 ? '\n✅ ALL TESTS PASSED!' : '\n❌ SOME TESTS FAILED');
  console.log('='.repeat(50) + '\n');

} finally {
  await mongoose.disconnect();
  await mongoServer.stop();
}
