import assert from 'assert';
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

const random = Math.random().toString(36).substring(2, 8) + Date.now().toString(36);

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

  const random = Math.random().toString(36).substring(2, 8);
  console.log('3️⃣ POST /api/creators/apply');
  const apply = await expectCreated(
    await post('/api/creators/apply', {
      name: `Smoke Creator ${random}`,
      age: 24,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: `https://instagram.com/smokecreator${random}`,
      whatsapp: `+919999${random}`,
      email: `smoke.creator.${random}@example.com`,
      referral: 'test',
    }),
    'Creator apply',
  );
  applicationId = apply.data.application._id;

  console.log('4️⃣ POST /api/brands/submit-brief');
  const brief = await expectCreated(
    await post('/api/brands/submit-brief', {
      brandName: `Smoke Brand ${random}`,
      contactName: `Smoke Contact ${random}`,
      email: `smoke.brand.${random}@example.com`,
      phone: `+919999${random}`,
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

  console.log('🔟 GET /api/admin/payments');
  const payments = await expectSuccess(await get('/api/admin/payments', adminToken), 'Payments list');
  assert.ok(Array.isArray(payments.data.payments), 'Payments array expected');
  assert.ok(Array.isArray(payments.data.pendingAssignments), 'Pending assignments array expected');

  console.log('1️⃣1️⃣ GET /api/admin/reports/campaign/:campaignId');
  await expectSuccess(await get(`/api/admin/reports/campaign/${campaignId}`, adminToken), 'Campaign report');

  console.log('\n✅ All non-Razorpay smoke tests passed');
  console.log({
    applicationId,
    creatorId,
    brandLeadId,
    campaignId,
  });
} catch (e) {
  console.error('\n❌ Smoke test failed:', e.message);
  process.exit(1);
}
