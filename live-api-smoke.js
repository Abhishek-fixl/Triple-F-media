import assert from 'assert';
import crypto from 'crypto';
import 'dotenv/config';
import fetch from 'node-fetch';

const BASE_URL = 'https://fffmedia-be.onrender.com';

const get = async (path, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res;
};

const post = async (path, body, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res;
};

const put = async (path, body, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res;
};

const patch = async (path, body, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res;
};

const expectStatus = async (res, expected, label) => {
  const body = await res.json();
  assert.strictEqual(res.status, expected, `${label}: expected ${expected}, got ${res.status} → ${JSON.stringify(body)}`);
  return body;
};

const expectSuccess = async (res, label) => expectStatus(res, 200, label);
const expectCreated = async (res, label) => expectStatus(res, 201, label);

let adminToken;
let applicationId;
let creatorId;
let brandLeadId;
let campaignId;
let assignmentId;
let paymentId;

const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const digits = runId.replace(/\D/g, '').slice(-8).padStart(8, '0');
const creatorEmail = process.env.SMOKE_CREATOR_EMAIL || `smoke.creator.${runId}@example.com`;
const brandEmail = process.env.SMOKE_BRAND_EMAIL || `smoke.brand.${runId}@example.com`;
const whatsapp = `+9199${digits}`;

try {
  console.log('1️⃣ GET /api/health');
  await expectSuccess(await get('/api/health'), 'Health');

  console.log('2️⃣ POST /api/chat/send');
  const chat = await expectSuccess(
    await post('/api/chat/send', {
      message: 'Hi, I have 6k followers on Instagram. Can I join?',
      sessionId: 'smoke_session',
      userType: 'creator',
      conversationHistory: [],
    }),
    'Chat send',
  );
  assert.ok(chat.data?.reply, 'Chat reply missing');

  console.log('3️⃣ POST /api/creators/apply');
  const apply = await expectCreated(
    await post('/api/creators/apply', {
      name: `Smoke Creator ${runId}`,
      age: 24,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: `https://instagram.com/smokecreator${runId}`,
      whatsapp,
      email: creatorEmail,
      referral: 'test',
    }),
    'Creator apply',
  );
  applicationId = apply.data.application._id;

  console.log('4️⃣ POST /api/brands/submit-brief');
  const brief = await expectCreated(
    await post('/api/brands/submit-brief', {
      brandName: `Smoke Brand ${runId}`,
      contactName: `Smoke Contact ${runId}`,
      email: brandEmail,
      phone: whatsapp,
      campaignGoal: 'awareness',
      targetAudience: 'Women 18-25',
      budget: '2l-5l',
      timeline: 'April 2026',
      notes: 'Smoke test campaign',
    }),
    'Brand brief',
  );
  brandLeadId = brief.data.brandLead._id;

  console.log('5️⃣ POST /api/auth/login (admin)');
  const login = await expectSuccess(
    await post('/api/auth/login', {
      email: 'admin@triplef.com',
      password: 'Admin@123',
    }),
    'Admin login',
  );
  adminToken = login.data.token;

  console.log('6️⃣ GET /api/admin/applications');
  const apps = await expectSuccess(await get('/api/admin/applications', adminToken), 'Applications list');
  assert.ok(Array.isArray(apps.data.applications), 'Applications array expected');

  console.log('7️⃣ POST /api/admin/applications/:id/approve');
  const approved = await expectSuccess(
    await post(`/api/admin/applications/${applicationId}/approve`, {
      handle: 'smokecreator',
      engagementRate: 4.8,
      upiId: 'success@razorpay',
      panNumber: 'ABCDE1234F',
      tags: ['beauty', 'test'],
      internalNotes: 'Smoke test approval',
    }, adminToken),
    'Application approve',
  );
  creatorId = approved.data.creator._id;

  console.log('8️⃣ GET /api/admin/creators');
  const creators = await expectSuccess(await get('/api/admin/creators', adminToken), 'Creators list');
  assert.ok(Array.isArray(creators.data.creators), 'Creators array expected');

  console.log('9️⃣ POST /api/admin/campaigns');
  const campaign = await expectCreated(
    await post('/api/admin/campaigns', {
      campaignName: 'Smoke Campaign',
      brandName: 'Smoke Brand',
      brandLeadId,
      type: 'sponsored_post',
      budget: 120000,
      creatorCount: 1,
      creators: [{ creatorId, amount: 12000 }],
      timelineStart: '2026-04-10T00:00:00.000Z',
      timelineEnd: '2026-04-20T00:00:00.000Z',
    }, adminToken),
    'Create campaign',
  );
  campaignId = campaign.data.campaign._id;

  console.log('9️⃣a PUT /api/admin/campaigns/:id (activate + brand payment received)');
  await expectSuccess(
    await put(`/api/admin/campaigns/${campaignId}`, {
      brandPaymentStatus: 'received',
      brandPaymentAmount: 120000,
      status: 'active',
    }, adminToken),
    'Activate campaign',
  );

  console.log('9️⃣b GET /api/admin/campaigns/:id (fetch assignment)');
  const campaignDetails = await expectSuccess(
    await get(`/api/admin/campaigns/${campaignId}`, adminToken),
    'Get campaign details',
  );
  const assignment = campaignDetails.data?.campaignCreators?.[0];
  if (!assignment?._id) {
    throw new Error('Expected campaignCreators[0] assignment from campaign details');
  }
  assignmentId = assignment._id;

  console.log('9️⃣c POST /api/admin/campaigns/:id/send-briefs');
  await expectSuccess(
    await post(`/api/admin/campaigns/${campaignId}/send-briefs`, {}, adminToken),
    'Send briefs',
  );

  console.log('9️⃣d POST /api/admin/campaigns/:campaignId/creators/:creatorId/approve-content');
  await expectSuccess(
    await post(`/api/admin/campaigns/${campaignId}/creators/${creatorId}/approve-content`, { feedback: 'Approved (smoke)' }, adminToken),
    'Approve content',
  );

  console.log('9️⃣e POST /api/admin/campaigns/:campaignId/creators/:creatorId/mark-live');
  await expectSuccess(
    await post(
      `/api/admin/campaigns/${campaignId}/creators/${creatorId}/mark-live`,
      { postUrl: `https://instagram.com/p/smoke_${runId}` },
      adminToken,
    ),
    'Mark live',
  );

  console.log('🔟 GET /api/admin/payments');
  const payments = await expectSuccess(await get('/api/admin/payments', adminToken), 'Payments list');
  assert.ok(Array.isArray(payments.data.payments), 'Payments array expected');
  assert.ok(Array.isArray(payments.data.pendingAssignments), 'Pending assignments array expected');

  console.log('1️⃣1️⃣ POST /api/admin/payments/process');
  const pending = payments.data.pendingAssignments.find((item) => String(item.creatorId) === String(creatorId)) || payments.data.pendingAssignments[0];
  if (!pending?.assignmentId) {
    throw new Error('Expected at least one pending assignment after marking post live');
  }
  assignmentId = pending.assignmentId;
  const processed = await expectSuccess(
    await post('/api/admin/payments/process', {
      assignmentIds: [assignmentId],
    }, adminToken),
    'Process payments',
  );
  assert.ok(Array.isArray(processed.data.payments), 'Processed payments array expected');
  if (processed.data.payments.length >= 1) {
    paymentId = processed.data.payments[0].payment._id;
  }

  console.log('1️⃣2️⃣ GET /api/admin/reports/campaign/:campaignId');
  await expectSuccess(await get(`/api/admin/reports/campaign/${campaignId}`, adminToken), 'Campaign report');

  console.log('🔁 Razorpay public endpoints');
  console.log('1️⃣3️⃣ POST /api/payments/create-order');
  const order = await expectCreated(
    await post('/api/payments/create-order', {
      amount: 49,
      currency: 'INR',
      notes: { smokeTest: true },
    }),
    'Razorpay create order',
  );
  assert.ok(order.data.orderId, 'Razorpay orderId missing');
  assert.ok(order.data.keyId, 'Razorpay keyId missing');

  console.log('1️⃣4️⃣ POST /api/payments/verify (valid signature)');
  const fakePaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Set RAZORPAY_KEY_SECRET in your local environment to run Razorpay signature verification test');
  }
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order.data.orderId}|${fakePaymentId}`)
    .digest('hex');
  const verifyOk = await expectSuccess(
    await post('/api/payments/verify', {
      orderId: order.data.orderId,
      paymentId: fakePaymentId,
      signature,
    }),
    'Razorpay verify signature',
  );
  assert.strictEqual(verifyOk.data.verified, true, 'Signature verification should succeed');

  console.log('1️⃣5️⃣ POST /api/payments/verify (invalid signature)');
  const verifyBad = await post('/api/payments/verify', {
    orderId: order.data.orderId,
    paymentId: fakePaymentId,
    signature: 'invalid_signature',
  });
  const verifyBadBody = await expectStatus(verifyBad, 400, 'Invalid signature should be rejected');
  assert.strictEqual(verifyBadBody.success, false, 'Invalid signature response should be false');

  console.log('\n✅ All smoke tests passed');
  console.log({
    applicationId,
    creatorId,
    brandLeadId,
    campaignId,
    assignmentId,
    paymentId,
    razorpayOrderId: order.data.orderId,
  });
} catch (e) {
  console.error('\n❌ Smoke test failed:', e.message);
  process.exit(1);
}
