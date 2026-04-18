import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

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
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
process.env.EMAIL_SERVICE = '';
process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';

const mongoServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongoServer.getUri('triplef-admin-test');

const [{ default: mongoose }, { default: app }, { default: connectDatabase }, authModule, models] = await Promise.all([
  import('mongoose'),
  import('./src/app.js'),
  import('./src/config/database.js'),
  import('./src/controllers/authController.js'),
  Promise.all([
    import('./src/models/Application.js'),
    import('./src/models/BrandLead.js'),
    import('./src/models/Campaign.js'),
    import('./src/models/CampaignCreator.js'),
    import('./src/models/Creator.js'),
    import('./src/models/Lead.js'),
    import('./src/models/Payment.js'),
    import('./src/models/User.js'),
  ]),
]);

const [
  { default: Application },
  { default: BrandLead },
  { default: Campaign },
  { default: CampaignCreator },
  { default: Creator },
  { default: Lead },
  { default: Payment },
  { default: User },
] = models;

await connectDatabase();
await authModule.ensureDefaultAdminUsers();

const results = { passed: 0, failed: 0, routes: [] };

const testRoute = async (method, url, agent, payload = null, expectedStatus = 200) => {
  let res;
  if (method === 'GET') res = await agent.get(url);
  else if (method === 'POST') res = await agent.post(url).send(payload);
  else if (method === 'PUT') res = await agent.put(url).send(payload);
  else if (method === 'PATCH') res = await agent.patch(url).send(payload);
  else if (method === 'DELETE') res = await agent.delete(url);

  const passed = res.status === expectedStatus;
  results.routes.push({ method, url, status: res.status, expected: expectedStatus, passed });
  if (passed) results.passed++;
  else results.failed++;
  return passed;
};

try {
  console.log('\n=== TESTING ALL ADMIN ROUTES ===\n');

  const adminAgent = request.agent(app);
  await adminAgent.post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

  const campaignAgent = request.agent(app);
  await campaignAgent.post('/api/auth/login').send({ email: process.env.CAMPAIGN_MANAGER_EMAIL, password: process.env.CAMPAIGN_MANAGER_PASSWORD });

  const financeAgent = request.agent(app);
  await financeAgent.post('/api/auth/login').send({ email: process.env.FINANCE_MANAGER_EMAIL, password: process.env.FINANCE_MANAGER_PASSWORD });

  const onboardingAgent = request.agent(app);
  await onboardingAgent.post('/api/auth/login').send({ email: process.env.ONBOARDING_SPECIALIST_EMAIL, password: process.env.ONBOARDING_SPECIALIST_PASSWORD });

  console.log('--- SUPER ADMIN ROUTES ---');
  await testRoute('GET', '/api/admin/dashboard', adminAgent);
  await testRoute('GET', '/api/admin/users', adminAgent);
  await testRoute('GET', '/api/admin/audit-logs', adminAgent);
  await testRoute('GET', '/api/admin/creators', adminAgent);
  await testRoute('GET', '/api/admin/applications', adminAgent);
  await testRoute('GET', '/api/admin/campaigns', adminAgent);
  await testRoute('GET', '/api/admin/payments', adminAgent);
  await testRoute('GET', '/api/admin/leads', adminAgent);
  await testRoute('GET', '/api/admin/analytics/overview', adminAgent);
  await testRoute('GET', '/api/admin/analytics/creators', adminAgent);
  await testRoute('GET', '/api/admin/analytics/campaigns', adminAgent);
  await testRoute('GET', '/api/admin/analytics/revenue', adminAgent);
  await testRoute('GET', '/api/admin/analytics/top-creators', adminAgent);
  await testRoute('GET', '/api/admin/analytics/top-brands', adminAgent);
  await testRoute('GET', '/api/admin/notifications/failed', adminAgent);

  console.log('\n--- CAMPAIGN MANAGER ROUTES ---');
  await testRoute('GET', '/api/admin/dashboard', campaignAgent);
  await testRoute('GET', '/api/admin/creators', campaignAgent);
  await testRoute('GET', '/api/admin/campaigns', campaignAgent);
  await testRoute('GET', '/api/admin/analytics/overview', campaignAgent);
  await testRoute('GET', '/api/admin/analytics/top-creators', campaignAgent);
  await testRoute('GET', '/api/admin/analytics/creators', campaignAgent);
  await testRoute('GET', '/api/admin/analytics/campaigns', campaignAgent);

  console.log('\n--- FINANCE MANAGER ROUTES ---');
  await testRoute('GET', '/api/admin/dashboard', financeAgent);
  await testRoute('GET', '/api/admin/creators', financeAgent);
  await testRoute('GET', '/api/admin/payments', financeAgent);
  await testRoute('GET', '/api/admin/analytics/revenue', financeAgent);

  console.log('\n--- ONBOARDING SPECIALIST ROUTES ---');
  await testRoute('GET', '/api/admin/dashboard', onboardingAgent);
  await testRoute('GET', '/api/admin/applications', onboardingAgent);
  await testRoute('GET', '/api/admin/leads', onboardingAgent);

  console.log('\n--- FORBIDDEN ACCESS TESTS ---');
  const fmCampaigns = await financeAgent.get('/api/admin/campaigns');
  results.routes.push({ method: 'GET', url: '/api/admin/campaigns (FM)', status: fmCampaigns.status, expected: 403, passed: fmCampaigns.status === 403 });
  if (fmCampaigns.status === 403) results.passed++;
  else results.failed++;

  const osCreators = await onboardingAgent.get('/api/admin/creators');
  results.routes.push({ method: 'GET', url: '/api/admin/creators (OS)', status: osCreators.status, expected: 403, passed: osCreators.status === 403 });
  if (osCreators.status === 403) results.passed++;
  else results.failed++;

  const cmPayments = await campaignAgent.get('/api/admin/payments');
  results.routes.push({ method: 'GET', url: '/api/admin/payments (CM)', status: cmPayments.status, expected: 403, passed: cmPayments.status === 403 });
  if (cmPayments.status === 403) results.passed++;
  else results.failed++;

  console.log('\n--- CREATE DATA FOR FUNCTIONAL TESTS ---');
  const creatorApp = await request(app).post('/api/creators/apply').send({
    name: 'Route Test Creator',
    age: 25,
    city: 'Mumbai',
    platform: 'instagram',
    followers: '10k-50k',
    niche: 'beauty',
    profileLink: 'https://instagram.com/routetest',
    whatsapp: '+919999999901',
    email: 'routetest@example.com',
  });

  const brandBrief = await request(app).post('/api/brands/submit-brief').send({
    brandName: 'Route Test Brand',
    contactName: 'Test Contact',
    email: 'test@brand.com',
    phone: '+919999999902',
    campaignGoal: 'awareness',
    targetAudience: 'All',
    budget: '1l-5l',
    timeline: 'April 2026',
  });

  const application = await Application.findOne({ email: 'routetest@example.com' });
  const brandLead = await BrandLead.findOne({ brandName: 'Route Test Brand' });

  if (application) {
    console.log('\n--- APPLICATION ROUTES ---');
    await testRoute('GET', `/api/admin/applications/${application._id}`, onboardingAgent);
    await testRoute('POST', `/api/admin/applications/${application._id}/approve`, onboardingAgent, {
      handle: 'routetest',
      upiId: 'test@upi',
      panNumber: 'TESTP1234T',
      engagementRate: 4.5,
      tags: ['test'],
    });
  }

  const creator = await Creator.findOne({ email: 'routetest@example.com' });

  if (brandLead && creator) {
    console.log('\n--- CAMPAIGN ROUTES ---');
    const campaignRes = await campaignAgent.post('/api/admin/campaigns').send({
      campaignName: 'Route Test Campaign',
      brandName: 'Route Test Brand',
      brandLeadId: brandLead._id,
      type: 'sponsored_post',
      budget: 100000,
      creatorCount: 1,
      timelineStart: '2026-04-01',
      timelineEnd: '2026-04-30',
      creators: [{ creatorId: creator._id, amount: 50000 }],
    });
    results.routes.push({ method: 'POST', url: '/api/admin/campaigns', status: campaignRes.status, expected: 201, passed: campaignRes.status === 201 });
    if (campaignRes.status === 201) results.passed++;
    else results.failed++;

    if (campaignRes.status === 201) {
      const campaign = campaignRes.body.data.campaign;
      await testRoute('GET', `/api/admin/campaigns/${campaign._id}`, campaignAgent);
      await testRoute('GET', `/api/admin/campaigns/suggest`, campaignAgent, null, 200);
      await testRoute('POST', `/api/admin/campaigns/${campaign._id}/send-briefs`, campaignAgent);
      await testRoute('PATCH', `/api/admin/campaigns/${campaign._id}/status`, campaignAgent, { status: 'active' });

      const assignment = await CampaignCreator.findOne({ campaignId: campaign._id });
      if (assignment) {
        await testRoute('POST', `/api/admin/campaigns/${campaign._id}/creators/${creator._id}/mark-live`, campaignAgent, { postUrl: 'https://instagram.com/p/test' });
        await testRoute('POST', `/api/admin/campaigns/${campaign._id}/creators/${creator._id}/approve-content`, campaignAgent, { feedback: 'Great work' });
      }
    }
  }

  console.log('\n--- PAYMENT ROUTES ---');
  await testRoute('GET', '/api/admin/payments', financeAgent);
  await testRoute('GET', '/api/admin/payments', adminAgent);

  console.log('\n--- LEAD ROUTES ---');
  await testRoute('GET', '/api/admin/leads', onboardingAgent);
  const leads = await Lead.find();
  if (leads.length > 0) {
    await testRoute('PUT', `/api/admin/leads/${leads[0]._id}`, onboardingAgent, { status: 'contacted', notes: 'Test note' });
  }

  console.log('\n--- CREATOR MANAGEMENT ROUTES ---');
  if (creator) {
    await testRoute('GET', `/api/admin/creators/${creator._id}`, campaignAgent);
    await testRoute('PUT', `/api/admin/creators/${creator._id}`, campaignAgent, { city: 'Mumbai', engagementRate: 5.0 });
    await testRoute('PATCH', `/api/admin/creators/${creator._id}/status`, campaignAgent, { status: 'active' });
    await testRoute('POST', `/api/admin/creators/${creator._id}/tags`, campaignAgent, { tags: ['vip', 'test'] });
  }

  console.log('\n--- USER MANAGEMENT ROUTES ---');
  await testRoute('GET', '/api/admin/users', adminAgent);
  const users = await User.find();
  if (users.length > 1) {
    const otherUser = users.find(u => u.email !== process.env.ADMIN_EMAIL);
    if (otherUser) {
      await testRoute('DELETE', `/api/admin/users/${otherUser._id}`, adminAgent);
    }
  }

  console.log('\n--- NOTIFICATION ROUTES ---');
  await testRoute('GET', '/api/admin/notifications/failed', adminAgent);

  console.log('\n--- FILE UPLOAD ROUTES ---');
  const briefUpload = await adminAgent.post('/api/admin/upload/brief').attach('briefPdf', Buffer.from('test'), 'test.pdf');
  results.routes.push({ method: 'POST', url: '/api/admin/upload/brief', status: briefUpload.status, expected: 201, passed: briefUpload.status === 201 });
  if (briefUpload.status === 201) results.passed++;
  else results.failed++;

  console.log('\n--- REPORT ROUTES ---');
  const campaigns = await Campaign.find();
  if (campaigns.length > 0) {
    await testRoute('GET', `/api/admin/reports/campaign/${campaigns[0]._id}`, adminAgent);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n=== ROUTE TEST RESULTS ===\n');

  let currentSection = '';
  results.routes.forEach((route, i) => {
    const section = route.url.split('/')[2] || 'general';
    if (section !== currentSection) {
      currentSection = section;
      console.log(`\n--- ${currentSection.toUpperCase()} ---`);
    }
    const status = route.passed ? '✅' : '❌';
    console.log(`${status} ${route.method} ${route.url} → ${route.status} (expected: ${route.expected})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ PASSED: ${results.passed}`);
  console.log(`❌ FAILED: ${results.failed}`);
  console.log(`📊 TOTAL: ${results.routes.length}`);

  const failedRoutes = results.routes.filter(r => !r.passed);
  if (failedRoutes.length > 0) {
    console.log('\n❌ FAILED ROUTES:');
    failedRoutes.forEach(r => console.log(`   ${r.method} ${r.url} → got ${r.status}, expected ${r.expected}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log(results.failed === 0 ? '\n✅ ALL ADMIN ROUTES WORKING CORRECTLY!' : '\n⚠️ SOME ROUTES NEED ATTENTION');
  console.log('='.repeat(60) + '\n');

} finally {
  await mongoose.disconnect();
  await mongoServer.stop();
}
