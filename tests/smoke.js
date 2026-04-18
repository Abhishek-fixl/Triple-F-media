import assert from 'assert';
import crypto from 'crypto';

import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.JWT_SECRET = 'smoke_test_secret';
process.env.JWT_EXPIRE = '7d';
process.env.ADMIN_EMAIL = 'admin@triplef.com';
process.env.ADMIN_PASSWORD = 'Admin@123';
process.env.CAMPAIGN_MANAGER_EMAIL = 'campaign.manager@triplef.com';
process.env.CAMPAIGN_MANAGER_PASSWORD = 'Manager@123';
process.env.FINANCE_MANAGER_EMAIL = 'finance.manager@triplef.com';
process.env.FINANCE_MANAGER_PASSWORD = 'Finance@123';
process.env.ONBOARDING_SPECIALIST_EMAIL = 'onboarding.specialist@triplef.com';
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
process.env.MONGODB_URI = mongoServer.getUri('triplef-smoke');

const [{ default: mongoose }, { default: app }, { default: connectDatabase }, authModule, models] = await Promise.all([
  import('mongoose'),
  import('../src/app.js'),
  import('../src/config/database.js'),
  import('../src/controllers/authController.js'),
  Promise.all([
    import('../src/models/Application.js'),
    import('../src/models/BrandAccount.js'),
    import('../src/models/BrandLead.js'),
    import('../src/models/Campaign.js'),
    import('../src/models/CampaignCreator.js'),
    import('../src/models/ChatLead.js'),
    import('../src/models/ChatLog.js'),
    import('../src/models/Creator.js'),
    import('../src/models/NotificationLog.js'),
    import('../src/models/Lead.js'),
    import('../src/models/Payment.js'),
    import('../src/models/User.js'),
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

const adminAgent = request.agent(app);

const expectSuccess = (response, statusCode = 200) => {
  assert.strictEqual(response.status, statusCode, `Expected ${statusCode}, got ${response.status}: ${JSON.stringify(response.body)}`);
  assert.strictEqual(response.body.success, true, JSON.stringify(response.body));
  return response.body.data;
};

const loginAs = async (email, password) => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password });
  expectSuccess(response, 200);
  return agent;
};

try {
  expectSuccess(await adminAgent.get('/api/health'), 200);

  const chatSessionId = 'session_smoke_chat';
  const chatSend = expectSuccess(
    await request(app).post('/api/chat/send').send({
      message: 'Hi, I have 6k followers on Instagram. Can I join?',
      sessionId: chatSessionId,
      userType: 'creator',
      conversationHistory: [],
    }),
    200,
  );
  assert.ok(chatSend.reply, 'Expected chat assistant reply');

  expectSuccess(
    await request(app).post('/api/chat/capture-lead').send({
      sessionId: chatSessionId,
      name: 'Chat Lead',
      email: 'chatlead@example.com',
      whatsapp: '+919999999900',
      userType: 'creator',
      notes: 'Interested after chat',
    }),
    200,
  );

  const chatHistory = expectSuccess(await request(app).get(`/api/chat/history/${chatSessionId}`), 200);
  assert.ok(chatHistory.history.length >= 1, 'Expected stored chat history');
  assert.ok(await ChatLog.exists({ sessionId: chatSessionId }), 'Expected ChatLog document');
  assert.ok(await ChatLead.exists({ sessionId: chatSessionId }), 'Expected ChatLead document');
  assert.ok(await Lead.exists({ email: 'chatlead@example.com' }), 'Expected CRM lead synced from chat');

  const invalidLogin = await request(app).post('/api/auth/login').send({
    email: 'wrong@email.com',
    password: 'wrong',
  });
  assert.strictEqual(invalidLogin.status, 401, JSON.stringify(invalidLogin.body));

  const noTokenCreators = await request(app).get('/api/admin/creators');
  assert.strictEqual(noTokenCreators.status, 401, JSON.stringify(noTokenCreators.body));

  const invalidCalculator = await request(app).get('/api/creators/calculator').query({
    platform: 'invalid',
    followers: 25000,
    niche: 'beauty',
    frequency: '3-4x/week',
    engagement: 'good',
    city: 'Mumbai',
  });
  assert.strictEqual(invalidCalculator.status, 400, JSON.stringify(invalidCalculator.body));

  const missingFieldsApply = await request(app).post('/api/creators/apply').send({ name: 'Only Name' });
  assert.strictEqual(missingFieldsApply.status, 400, JSON.stringify(missingFieldsApply.body));

  const applicationOne = expectSuccess(
    await request(app).post('/api/creators/apply').send({
      name: 'Aisha Khan',
      age: 24,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: 'https://instagram.com/aishakhan',
      whatsapp: '+919999999901',
      email: 'aisha@example.com',
      referral: 'friend',
    }),
    201,
  ).application;

  const applicationTwo = expectSuccess(
    await request(app).post('/api/creators/apply').send({
      name: 'Rohan Das',
      age: 27,
      city: 'Delhi',
      platform: 'youtube',
      followers: '50k-200k',
      niche: 'tech',
      profileLink: 'https://youtube.com/@rohandas',
      whatsapp: '+919999999902',
      email: 'rohan@example.com',
    }),
    201,
  ).application;

  // Add small delay for async notification logs
  await new Promise(resolve => setTimeout(resolve, 100));

  const creatorInternalNotifications = await NotificationLog.find({
    module: 'applications_internal',
    referenceId: applicationOne._id,
    channel: 'email',
  });
  assert.ok(
    creatorInternalNotifications.some((item) => item.recipient === (process.env.ONBOARDING_EMAIL || 'onboarding@triplef.com')),
    'Expected onboarding specialist internal creator alert',
  );
  assert.ok(
    creatorInternalNotifications.some((item) =>
      Array.isArray(item.metadata?.cc) && item.metadata.cc.includes(process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com')),
    'Expected super admin CC on creator alert',
  );

  const duplicateApplication = await request(app).post('/api/creators/apply').send({
    name: 'Aisha Khan Duplicate',
    age: 24,
    city: 'Mumbai',
    platform: 'instagram',
    followers: '10k-50k',
    niche: 'beauty',
    profileLink: 'https://instagram.com/aisha-duplicate',
    whatsapp: '+919999999901',
    email: 'aisha@example.com',
  });
  assert.strictEqual(duplicateApplication.status, 409, JSON.stringify(duplicateApplication.body));

  expectSuccess(
    await request(app)
      .get('/api/creators/calculator')
      .query({
        platform: 'instagram',
        followers: 25000,
        niche: 'beauty',
        frequency: '3-4x/week',
        engagement: 'good',
        city: 'Mumbai',
        email: 'lead@example.com',
      }),
    200,
  );

  const brandLead = expectSuccess(
    await request(app).post('/api/brands/submit-brief').send({
      brandName: 'Acme Beauty',
      contactName: 'Nina Verma',
      email: 'nina@acme.com',
      phone: '+919999999903',
      campaignGoal: 'awareness',
      targetAudience: 'Women 18-30 in metro cities',
      budget: '1l-5l',
      timeline: 'April 2026',
      notes: 'Need 3 reels and 1 story set',
    }),
    201,
  ).brandLead;

  // Add small delay for async notification logs
  await new Promise(resolve => setTimeout(resolve, 100));

  const brandInternalNotifications = await NotificationLog.find({
    module: 'brand_leads_internal',
    referenceId: brandLead._id,
    channel: 'email',
  });
  assert.ok(
    brandInternalNotifications.some((item) => item.recipient === (process.env.CAMPAIGN_EMAIL || 'campaign@triplef.com')),
    'Expected campaign manager internal brand alert',
  );
  assert.ok(
    brandInternalNotifications.some((item) =>
      Array.isArray(item.metadata?.cc) && item.metadata.cc.includes(process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com')),
    'Expected super admin CC on brand alert',
  );

  expectSuccess(await adminAgent.post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200);
  expectSuccess(await adminAgent.get('/api/auth/me'), 200);
  const whatsappTestResponse = await adminAgent.post('/api/admin/whatsapp/test').send({
    to: '+919530253134',
    message: 'Smoke test WhatsApp message',
  });
  assert.ok([200, 500].includes(whatsappTestResponse.status), JSON.stringify(whatsappTestResponse.body));

  expectSuccess(
    await adminAgent.post('/api/admin/users').send({
      name: 'Operations Admin',
      email: 'ops.admin@triplef.com',
      password: 'OpsAdmin@123',
      role: 'campaign_manager',
    }),
    201,
  );

  expectSuccess(await adminAgent.get('/api/admin/users'), 200);

  const onboardingAgent = await loginAs(process.env.ONBOARDING_SPECIALIST_EMAIL, process.env.ONBOARDING_SPECIALIST_PASSWORD);
  expectSuccess(await onboardingAgent.get('/api/admin/dashboard'), 200);
  expectSuccess(await onboardingAgent.get('/api/admin/applications'), 200);
  expectSuccess(await onboardingAgent.get(`/api/admin/applications/${applicationOne._id}`), 200);
  const invalidApplicationId = await onboardingAgent.get('/api/admin/applications/invalid_id');
  assert.strictEqual(invalidApplicationId.status, 404, JSON.stringify(invalidApplicationId.body));

  const approved = expectSuccess(
    await onboardingAgent.post(`/api/admin/applications/${applicationOne._id}/approve`).send({
      handle: 'aishakhan',
      upiId: 'aisha@upi',
      panNumber: 'ABCDE1234F',
      engagementRate: 4.8,
      tags: ['beauty', 'priority'],
      internalNotes: 'Strong metro creator',
    }),
    200,
  );
  const creatorId = approved.creator._id;

  expectSuccess(
    await onboardingAgent.post(`/api/admin/applications/${applicationTwo._id}/reject`).send({
      rejectionType: 'niche_not_in_demand',
      rejectionReason: 'Current campaign fit is limited',
      internalNotes: 'Revisit after audience update',
    }),
    200,
  );

  const leads = expectSuccess(await onboardingAgent.get('/api/admin/leads'), 200).leads;
  assert.ok(leads.length >= 1, 'Expected at least one lead');
  expectSuccess(
    await onboardingAgent.put(`/api/admin/leads/${leads[0]._id}`).send({
      status: 'contacted',
      notes: 'Reached out by WhatsApp',
    }),
    200,
  );
  assert.strictEqual((await onboardingAgent.post('/api/admin/campaigns').send({})).status, 403);
  assert.strictEqual((await onboardingAgent.get('/api/admin/payments')).status, 403);

  const campaignAgent = await loginAs(process.env.CAMPAIGN_MANAGER_EMAIL, process.env.CAMPAIGN_MANAGER_PASSWORD);
  expectSuccess(await campaignAgent.get('/api/admin/dashboard'), 200);
  expectSuccess(await campaignAgent.get('/api/admin/creators'), 200);
  expectSuccess(await campaignAgent.get(`/api/admin/creators/${creatorId}`), 200);
  expectSuccess(
    await campaignAgent.put(`/api/admin/creators/${creatorId}`).send({
      city: 'Bengaluru',
      engagementRate: 5.2,
      status: 'priority',
      upiId: 'aisha@upi',
    }),
    200,
  );
  expectSuccess(
    await campaignAgent.post(`/api/admin/creators/${creatorId}/tags`).send({
      tags: ['beauty', 'metro', 'priority'],
    }),
    200,
  );

  const campaign = expectSuccess(
    await campaignAgent.post('/api/admin/campaigns').send({
      campaignName: 'Summer Glow Launch',
      brandName: 'Acme Beauty',
      brandLeadId: brandLead._id,
      type: 'sponsored_post',
      budget: 300000,
      creatorCount: 1,
      timelineStart: '2026-04-05T00:00:00.000Z',
      timelineEnd: '2026-04-20T00:00:00.000Z',
      creators: [{ creatorId, amount: 50000 }],
    }),
    201,
  ).campaign;

  const suggestData = expectSuccess(
    await campaignAgent.get('/api/admin/campaigns/suggest').query({
      niche: 'beauty',
      minFollowers: 10000,
      maxFollowers: 50000,
      city: 'Bengaluru',
      minEngagement: 1,
    }),
    200,
  );
  assert.ok(Array.isArray(suggestData.creators), 'Expected creator suggestions');

  expectSuccess(await campaignAgent.get('/api/admin/campaigns'), 200);
  const campaignDetails = expectSuccess(await campaignAgent.get(`/api/admin/campaigns/${campaign._id}`), 200);
  const assignment = campaignDetails.campaignCreators[0];
  assert.ok(assignment, 'Expected campaign assignment');

  expectSuccess(
    await campaignAgent.put(`/api/admin/campaigns/${campaign._id}`).send({
      status: 'active',
      brandPaymentStatus: 'received',
      brandPaymentAmount: 300000,
      performanceData: {
        totalReach: 100000,
        totalImpressions: 150000,
        totalEngagement: 12000,
        engagementRate: 8,
        linkClicks: 3000,
      },
      creators: [{ creatorId, amount: 55000 }],
    }),
    200,
  );
  expectSuccess(
    await campaignAgent.patch(`/api/admin/campaigns/${campaign._id}/status`).send({ status: 'active' }),
    200,
  );

  expectSuccess(await campaignAgent.post(`/api/admin/campaigns/${campaign._id}/send-briefs`).send({}), 200);
  expectSuccess(
    await campaignAgent.post('/api/admin/campaigns/bulk-send-briefs').send({ campaignIds: [campaign._id] }),
    200,
  );
  expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaign._id}/creators/${creatorId}/approve-content`).send({
      feedback: 'Looks good',
    }),
    200,
  );
  expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaign._id}/creators/${creatorId}/revision-content`).send({
      feedback: 'Please tweak the CTA placement',
    }),
    200,
  );
  expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaign._id}/creators/${creatorId}/mark-live`).send({
      postUrl: 'https://instagram.com/p/live-post',
    }),
    200,
  );
  assert.strictEqual((await campaignAgent.get('/api/admin/applications')).status, 403);
  assert.strictEqual((await campaignAgent.post('/api/admin/payments/process').send({ assignmentIds: [] })).status, 403);
  assert.strictEqual((await campaignAgent.get('/api/admin/users')).status, 403);

  const financeAgent = await loginAs(process.env.FINANCE_MANAGER_EMAIL, process.env.FINANCE_MANAGER_PASSWORD);
  expectSuccess(await financeAgent.get('/api/admin/dashboard'), 200);
  expectSuccess(await financeAgent.get('/api/admin/creators'), 200);
  assert.strictEqual((await financeAgent.post('/api/admin/campaigns').send({})).status, 403);
  assert.strictEqual((await financeAgent.get('/api/admin/applications')).status, 403);
  expectSuccess(
    await financeAgent.patch(`/api/admin/campaigns/${campaign._id}/creators/${creatorId}/payment-status`).send({ paymentStatus: 'processing' }),
    200,
  );
  const paymentsBefore = expectSuccess(await financeAgent.get('/api/admin/payments'), 200);
  assert.ok(paymentsBefore.pendingAssignments.length >= 1, 'Expected pending assignments before processing');

  const processedPayments = expectSuccess(
    await financeAgent.post('/api/admin/payments/process').send({
      assignmentIds: [paymentsBefore.pendingAssignments[0].assignmentId],
    }),
    200,
  );
  assert.ok(processedPayments.processed.length >= 1, 'Expected processed payment');
  expectSuccess(
    await financeAgent.post('/api/admin/payments/bulk-process').send({
      assignmentIds: [paymentsBefore.pendingAssignments[0].assignmentId],
    }),
    200,
  );

  expectSuccess(await campaignAgent.post(`/api/admin/campaigns/${campaign._id}/complete`).send({}), 200);
  const failedPayment = await Payment.create({
    campaignCreatorId: campaignDetails.campaignCreators[0]._id,
    creatorId,
    creatorName: 'Aisha Khan',
    campaignName: 'Summer Glow Launch',
    amount: 1000,
    upiId: 'aisha@upi',
    status: 'failed',
  });
  expectSuccess(await financeAgent.delete(`/api/admin/payments/${failedPayment._id}`), 200);
  expectSuccess(await adminAgent.get(`/api/admin/reports/campaign/${campaign._id}`), 200);
  expectSuccess(await adminAgent.get('/api/admin/audit-logs'), 200);
  expectSuccess(await adminAgent.get('/api/admin/analytics/overview'), 200);
  expectSuccess(await adminAgent.get('/api/admin/analytics/creators'), 200);
  expectSuccess(await adminAgent.get('/api/admin/analytics/campaigns'), 200);
  expectSuccess(await financeAgent.get('/api/admin/analytics/revenue'), 200);
  expectSuccess(await campaignAgent.get('/api/admin/analytics/top-creators'), 200);
  expectSuccess(await adminAgent.get('/api/admin/analytics/top-brands'), 200);
  expectSuccess(await adminAgent.get('/api/admin/dashboard'), 200);

  const uploadBrief = expectSuccess(
    await adminAgent
      .post('/api/admin/upload/brief')
      .attach('briefPdf', Buffer.from('brief'), 'brief.pdf'),
    201,
  );
  assert.ok(uploadBrief.file.url, 'Expected uploaded brief url');

  assert.ok(
    [401, 404].includes((await request(app).post('/api/brand/auth/register').send({
      brandName: 'Acme Beauty',
      contactName: 'Nina Verma',
      email: 'brand.portal@acme.com',
      password: 'Brand@123',
      phone: '+919111111111',
    })).status),
    'Expected disabled brand auth route to be inaccessible',
  );
  assert.ok(
    [401, 404].includes((await request(app).post('/api/creator/auth/register').send({
      email: 'aisha@example.com',
      password: 'Creator@123',
    })).status),
    'Expected disabled creator auth route to be inaccessible',
  );

  const failedEmailLog = await NotificationLog.create({
    channel: 'email',
    recipient: 'retry@example.com',
    subject: 'Retry me',
    message: '<p>Retry</p>',
    status: 'failed',
    module: 'tests',
  });
  const failedWhatsappLog = await NotificationLog.create({
    channel: 'whatsapp',
    recipient: '+919999999999',
    message: 'Retry me',
    status: 'failed',
    module: 'tests',
  });
  expectSuccess(await adminAgent.get('/api/admin/notifications/failed'), 200);
  expectSuccess(await adminAgent.post(`/api/admin/notifications/retry-email/${failedEmailLog._id}`).send({}), 200);
  expectSuccess(await adminAgent.post(`/api/admin/notifications/retry-whatsapp/${failedWhatsappLog._id}`).send({}), 200);

  const webhookPayment = await Payment.findOne({ status: 'paid' });
  webhookPayment.status = 'processing';
  await webhookPayment.save();
  const razorpayBody = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_1',
          order_id: webhookPayment.razorpayOrderId,
        },
      },
    },
  };
  const razorpaySignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '').update(JSON.stringify(razorpayBody)).digest('hex');
  expectSuccess(await request(app).post('/api/webhooks/razorpay').set('x-razorpay-signature', razorpaySignature).send(razorpayBody), 200);
  expectSuccess(await request(app).post('/api/webhooks/whatsapp').set('x-webhook-secret', process.env.TWILIO_WEBHOOK_SECRET).send({ providerMessageId: 'test-sid', status: 'delivered' }), 200);
  expectSuccess(await request(app).post('/api/webhooks/resend').set('x-webhook-secret', process.env.RESEND_WEBHOOK_SECRET).send({ type: 'email.delivered', data: { email_id: 'email-1' } }), 200);

  const extraApplication = expectSuccess(
    await request(app).post('/api/creators/apply').send({
      name: 'Bulk Creator',
      age: 23,
      city: 'Pune',
      platform: 'instagram',
      followers: '5k-10k',
      niche: 'fitness',
      profileLink: 'https://instagram.com/bulkcreator',
      whatsapp: '+919999999904',
      email: 'bulk@example.com',
    }),
    201,
  ).application;
  expectSuccess(await onboardingAgent.post('/api/admin/applications/bulk-approve').send({ applicationIds: [extraApplication._id] }), 200);
  const bulkCreator = await Creator.findOne({ email: 'bulk@example.com' });
  expectSuccess(await campaignAgent.post('/api/admin/creators/bulk-tag').send({ creatorIds: [bulkCreator._id], tags: ['bulk', 'fitness'] }), 200);
  expectSuccess(await campaignAgent.patch(`/api/admin/creators/${bulkCreator._id}/status`).send({ status: 'priority' }), 200);
  expectSuccess(await adminAgent.delete(`/api/admin/applications/${applicationTwo._id}`), 200);
  const spamLead = await BrandLead.create({
    brandName: 'Spam Brand',
    contactName: 'Spam',
    email: 'spam@brand.com',
    phone: '+919999999905',
    campaignGoal: 'awareness',
    targetAudience: 'All',
    budget: '50k-2l',
    timeline: 'June 2026',
  });
  expectSuccess(await adminAgent.delete(`/api/admin/brand-leads/${spamLead._id}`), 200);
  expectSuccess(await adminAgent.delete(`/api/admin/users/${(await User.findOne({ email: 'ops.admin@triplef.com' }))._id}`), 200);

  const draftCampaign = expectSuccess(
    await campaignAgent.post('/api/admin/campaigns').send({
      campaignName: 'Delete Me Draft',
      brandName: 'Acme Beauty',
      type: 'ugc',
      budget: 10000,
      creatorCount: 1,
      creators: [{ creatorId, amount: 5000 }],
    }),
    201,
  ).campaign;
  expectSuccess(await campaignAgent.delete(`/api/admin/campaigns/${draftCampaign._id}`), 200);

  expectSuccess(
    await adminAgent.post('/api/auth/change-password').send({
      currentPassword: process.env.ADMIN_PASSWORD,
      newPassword: 'Admin@456',
    }),
    200,
  );
  expectSuccess(await adminAgent.post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: 'Admin@456' }), 200);
  expectSuccess(await adminAgent.post('/api/auth/logout').send({}), 200);

  const counts = {
    applications: await Application.countDocuments(),
    creators: await Creator.countDocuments(),
    brandLeads: await BrandLead.countDocuments(),
    campaigns: await Campaign.countDocuments(),
    assignments: await CampaignCreator.countDocuments(),
    brandAccounts: await BrandAccount.countDocuments(),
    chatLeads: await ChatLead.countDocuments(),
    chatLogs: await ChatLog.countDocuments(),
    notifications: await NotificationLog.countDocuments(),
    payments: await Payment.countDocuments(),
    leads: await Lead.countDocuments(),
    users: await User.countDocuments(),
  };

  console.log('SMOKE_TEST_PASSED');
  console.log(JSON.stringify(counts, null, 2));
} finally {
  await mongoose.disconnect();
  await mongoServer.stop();
}