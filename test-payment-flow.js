import assert from 'assert';
import crypto from 'crypto';

import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.JWT_SECRET = 'payment_flow_secret';
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
process.env.ADMIN_URL = 'http://localhost:5174';
process.env.BACKEND_PUBLIC_URL = 'http://localhost:5000';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_WHATSAPP_NUMBER = '';
process.env.RESEND_API_KEY = '';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
process.env.EMAIL_SERVICE = '';
process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';

const mongoServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongoServer.getUri('triplef-payment-flow');

const [
  { default: mongoose },
  { default: app },
  { default: connectDatabase },
  authModule,
  { default: CampaignCreator },
  { default: Creator },
  { default: Invoice },
  { default: Payment },
] = await Promise.all([
  import('mongoose'),
  import('./src/app.js'),
  import('./src/config/database.js'),
  import('./src/controllers/authController.js'),
  import('./src/models/CampaignCreator.js'),
  import('./src/models/Creator.js'),
  import('./src/models/Invoice.js'),
  import('./src/models/Payment.js'),
]);

await connectDatabase();
await authModule.ensureDefaultAdminUsers();

const expectSuccess = (response, expectedStatus, stepLabel) => {
  assert.strictEqual(
    response.status,
    expectedStatus,
    `${stepLabel} failed: expected ${expectedStatus}, got ${response.status} -> ${JSON.stringify(response.body)}`,
  );
  assert.strictEqual(response.body.success, true, `${stepLabel} failed: ${JSON.stringify(response.body)}`);
  return response.body.data;
};

const loginAs = async (email, password) => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password });
  expectSuccess(response, 200, `Login ${email}`);
  return agent;
};

const printPass = (message) => console.log(`${message} \u2705 PASS`);

console.log('COMPLETE PAYMENT FLOW TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  console.log('STEP 1: Creator Application');
  const creatorApply = expectSuccess(
    await request(app).post('/api/creators/apply').send({
      name: 'Payment Flow Creator',
      age: 22,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: 'https://instagram.com/paymentflowcreator',
      whatsapp: '+919999000111',
      email: 'payment.flow.creator@example.com',
      referral: 'test',
    }),
    201,
    'Creator application',
  );
  const applicationId = creatorApply.application._id;
  printPass(`→ Application ID: ${applicationId}`);

  console.log('\nSTEP 2: Onboarding Specialist Login');
  const onboardingAgent = await loginAs(process.env.ONBOARDING_SPECIALIST_EMAIL, process.env.ONBOARDING_SPECIALIST_PASSWORD);
  printPass('→ Token received');

  console.log('\nSTEP 3: Approve Creator');
  const approval = expectSuccess(
    await onboardingAgent.post(`/api/admin/applications/${applicationId}/approve`).send({
      handle: 'paymentcreator',
      engagementRate: 4.8,
      upiId: 'success@razorpay',
      panNumber: 'ABCDE1234F',
      tags: ['beauty', 'test'],
    }),
    200,
    'Approve creator',
  );
  const creatorId = approval.creator._id;
  printPass(`→ Creator ID: ${creatorId}`);

  console.log('\nSTEP 4: Brand Brief Submission');
  const brief = expectSuccess(
    await request(app).post('/api/brands/submit-brief').send({
      brandName: 'Payment Flow Brand',
      contactName: 'Payment Flow Contact',
      email: 'payment.flow.brand@example.com',
      phone: '+919999000112',
      campaignGoal: 'awareness',
      targetAudience: 'Women 18-25',
      budget: '2l-5l',
      timeline: 'April 2026',
      notes: 'Payment flow test campaign',
    }),
    201,
    'Brand brief submission',
  );
  const brandLeadId = brief.brandLead._id;
  printPass(`→ Brand Lead ID: ${brandLeadId}`);

  console.log('\nSTEP 5: Campaign Manager Login');
  const campaignAgent = await loginAs(process.env.CAMPAIGN_MANAGER_EMAIL, process.env.CAMPAIGN_MANAGER_PASSWORD);
  printPass('→ Token received');

  console.log('\nSTEP 6: Create Campaign');
  const campaignCreate = expectSuccess(
    await campaignAgent.post('/api/admin/campaigns').send({
      campaignName: 'Payment Flow Campaign',
      brandName: 'Payment Flow Brand',
      brandLeadId,
      type: 'sponsored_post',
      budget: 120000,
      creatorCount: 1,
      creators: [{ creatorId, amount: 12000 }],
      timelineStart: '2026-04-10T00:00:00.000Z',
      timelineEnd: '2026-04-20T00:00:00.000Z',
    }),
    201,
    'Create campaign',
  );
  const campaignId = campaignCreate.campaign._id;
  const campaignDetailsInitial = expectSuccess(
    await campaignAgent.get(`/api/admin/campaigns/${campaignId}`),
    200,
    'Get campaign after create',
  );
  const campaignCreatorId = campaignDetailsInitial.campaignCreators[0]._id;
  printPass(`→ Campaign ID: ${campaignId}`);
  printPass(`→ Campaign Creator ID: ${campaignCreatorId}`);

  console.log('\nSTEP 7: Mark Brand Payment Received');
  const updatedCampaign = expectSuccess(
    await campaignAgent.put(`/api/admin/campaigns/${campaignId}`).send({
      brandPaymentStatus: 'received',
      brandPaymentAmount: 120000,
      status: 'active',
    }),
    200,
    'Mark brand payment received',
  );
  assert.strictEqual(updatedCampaign.campaign.status, 'active');
  printPass('→ Campaign status: active');

  console.log('\nSTEP 8: Send Briefs to Creators');
  expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaignId}/send-briefs`).send({}),
    200,
    'Send briefs',
  );
  printPass('→ Brief sent');

  console.log('\nSTEP 9: Creator Submits Content (Simulated)');
  const assignmentAfterSubmit = await CampaignCreator.findByIdAndUpdate(
    campaignCreatorId,
    {
      contentStatus: 'submitted',
      contentSubmittedAt: new Date(),
      contentUrl: 'https://drive.google.com/payment-flow-content',
    },
    { new: true },
  );
  assert.strictEqual(assignmentAfterSubmit.contentStatus, 'submitted');
  printPass('→ contentStatus: submitted');

  console.log('\nSTEP 10: Approve Content');
  const approvalResponse = expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaignId}/creators/${creatorId}/approve-content`).send({
      feedback: 'Approved',
    }),
    200,
    'Approve content',
  );
  assert.strictEqual(approvalResponse.assignment.contentStatus, 'approved');
  printPass('→ contentStatus: approved');

  console.log('\nSTEP 11: Mark Post Live');
  const liveResponse = expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaignId}/creators/${creatorId}/mark-live`).send({
      postUrl: 'https://instagram.com/p/test',
    }),
    200,
    'Mark post live',
  );
  assert.strictEqual(liveResponse.assignment.postStatus, 'live');
  assert.strictEqual(liveResponse.assignment.paymentStatus, 'pending');
  printPass('→ postStatus: live, paymentStatus: pending');

  console.log('\nSTEP 12: Mark Campaign Complete');
  const completed = expectSuccess(
    await campaignAgent.post(`/api/admin/campaigns/${campaignId}/complete`).send({}),
    200,
    'Complete campaign',
  );
  assert.strictEqual(completed.campaign.status, 'completed');
  printPass('→ campaign status: completed');

  console.log('\nSTEP 13: Finance Manager Login');
  const financeAgent = await loginAs(process.env.FINANCE_MANAGER_EMAIL, process.env.FINANCE_MANAGER_PASSWORD);
  printPass('→ Token received');

  console.log('\nSTEP 14: Get Pending Payments');
  const pending = expectSuccess(
    await financeAgent.get('/api/admin/payments'),
    200,
    'Get pending payments',
  );
  assert.ok(pending.pendingAssignments.length >= 1, 'Expected at least one pending assignment');
  printPass(`→ Pending assignments found: ${pending.pendingAssignments.length}`);

  console.log('\nSTEP 15: Process Payments');
  const processResponse = expectSuccess(
    await financeAgent.post('/api/admin/payments/process').send({
      assignmentIds: [campaignCreatorId],
    }),
    200,
    'Process payments',
  );
  assert.ok(processResponse.payments.length >= 1, 'Expected processed payment');
  const processedPayment = processResponse.payments[0].payment;
  const processedInvoice = processResponse.payments[0].invoice;
  assert.ok(processedPayment._id, 'Expected payment id');
  assert.strictEqual(processedPayment.tdsDeducted, 1200);
  assert.ok(processedInvoice?.invoiceNumber, 'Expected invoice number');
  printPass('→ Payment processed');
  printPass(`→ Payment ID: ${processedPayment._id}`);
  printPass(`→ TDS deducted: INR ${processedPayment.tdsDeducted}`);
  printPass(`→ Invoice generated: ${processedInvoice.invoiceNumber}`);

  const creatorAfterPayment = await Creator.findById(creatorId);
  assert.strictEqual(creatorAfterPayment.totalEarnings, 12000);
  printPass(`→ Creator earnings updated: +INR ${creatorAfterPayment.totalEarnings}`);

  console.log('\nSTEP 16: Verify Payment Record');
  const paymentsAfter = expectSuccess(
    await financeAgent.get('/api/admin/payments'),
    200,
    'Verify payments after processing',
  );
  const refreshedAssignment = await CampaignCreator.findById(campaignCreatorId).lean();
  const paymentRecord = await Payment.findById(processedPayment._id).lean();
  const invoiceRecord = await Invoice.findOne({ paymentId: processedPayment._id }).lean();

  assert.strictEqual(refreshedAssignment.paymentStatus, 'paid');
  assert.strictEqual(paymentRecord.status, 'paid');
  assert.strictEqual(paymentRecord.tdsDeducted, 1200);
  assert.strictEqual(paymentRecord.netAmount, 10800);
  assert.ok(invoiceRecord?.invoiceNumber, 'Expected invoice record');
  assert.strictEqual(
    paymentsAfter.pendingAssignments.filter((item) => String(item.assignmentId) === String(campaignCreatorId)).length,
    0,
  );
  printPass('→ Payment status: paid');
  printPass('→ pendingAssignments: 0');

  console.log('\nSTEP 17: Generate Campaign Report');
  const report = expectSuccess(
    await financeAgent.get(`/api/admin/reports/campaign/${campaignId}`),
    200,
    'Generate campaign report',
  );
  assert.ok(report.reportUrl, 'Expected report url');
  printPass('→ Report URL generated');

  console.log('\nSTEP 18: Razorpay Create Order (Public API)');
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  assert.ok(razorpayKeyId, 'RAZORPAY_KEY_ID must be set in environment for this test');
  assert.ok(razorpayKeySecret, 'RAZORPAY_KEY_SECRET must be set in environment for this test');

  const orderPayload = expectSuccess(
    await request(app).post('/api/payments/create-order').send({
      amount: 49,
      currency: 'INR',
      notes: { testRun: 'payment-flow' },
    }),
    201,
    'Create Razorpay order',
  );
  assert.ok(orderPayload.orderId, 'Expected orderId');
  assert.strictEqual(orderPayload.keyId, razorpayKeyId);
  printPass(`→ Razorpay order created: ${orderPayload.orderId}`);

  console.log('\nSTEP 19: Razorpay Verify Signature (Public API)');
  const fakePaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
  const signature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${orderPayload.orderId}|${fakePaymentId}`)
    .digest('hex');

  const verifyOk = expectSuccess(
    await request(app).post('/api/payments/verify').send({
      orderId: orderPayload.orderId,
      paymentId: fakePaymentId,
      signature,
    }),
    200,
    'Verify Razorpay signature',
  );
  assert.strictEqual(verifyOk.verified, true);
  printPass('→ Signature verified');

  const verifyFail = await request(app).post('/api/payments/verify').send({
    orderId: orderPayload.orderId,
    paymentId: fakePaymentId,
    signature: 'invalid_signature',
  });
  assert.strictEqual(verifyFail.status, 400);
  assert.strictEqual(verifyFail.body.success, false);
  assert.strictEqual(verifyFail.body.code, 'PAYMENT_SIGNATURE_INVALID');
  printPass('→ Invalid signature rejected');

  console.log('\nERROR HANDLING CHECKS');
  assert.strictEqual((await request(app).get('/api/admin/payments')).status, 401);
  printPass('→ No token access blocked');

  assert.strictEqual(
    (await onboardingAgent.post('/api/admin/payments/process').send({ assignmentIds: [campaignCreatorId] })).status,
    403,
  );
  printPass('→ Wrong role blocked');

  const invalidAssignment = await financeAgent.post('/api/admin/payments/process').send({
    assignmentIds: ['507f1f77bcf86cd799439011'],
  });
  assert.ok([400, 404].includes(invalidAssignment.status), JSON.stringify(invalidAssignment.body));
  printPass('→ Invalid assignment handled');

  assert.strictEqual((await financeAgent.post('/api/admin/payments/process').send({})).status, 400);
  printPass('→ Missing assignmentIds handled');

  const duplicateProcessing = expectSuccess(
    await financeAgent.post('/api/admin/payments/process').send({
      assignmentIds: [campaignCreatorId],
    }),
    200,
    'Duplicate payment processing',
  );
  assert.strictEqual(duplicateProcessing.payments.length, 0);
  assert.strictEqual(duplicateProcessing.failed.length, 1);
  printPass('→ Duplicate processing blocked');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ALL 19 STEPS PASSED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    JSON.stringify(
      {
        applicationId,
        creatorId,
        brandLeadId,
        campaignId,
        campaignCreatorId,
        paymentId: processedPayment._id,
        invoiceNumber: processedInvoice.invoiceNumber,
        razorpayTest: {
          orderId: orderPayload.orderId,
        },
        dbState: {
          paymentStatus: paymentRecord.status,
          tdsDeducted: paymentRecord.tdsDeducted,
          netAmount: paymentRecord.netAmount,
          creatorTotalEarnings: creatorAfterPayment.totalEarnings,
          invoiceNumber: invoiceRecord.invoiceNumber,
          invoiceUrl: invoiceRecord.pdfUrl,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
  await mongoServer.stop();
}
