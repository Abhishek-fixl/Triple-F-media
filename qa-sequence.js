import assert from 'assert';
import 'dotenv/config';
import fetch from 'node-fetch';
import mongoose from 'mongoose';

import CampaignCreator from './src/models/CampaignCreator.js';
import Application from './src/models/Application.js';
import BrandLead from './src/models/BrandLead.js';
import Campaign from './src/models/Campaign.js';
import Creator from './src/models/Creator.js';
import Payment from './src/models/Payment.js';
import User from './src/models/User.js';

const BASE_URL = 'http://localhost:5000';

const runId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const uniqDigits = runId.replace(/\D/g, '').slice(-8).padStart(8, '0');
const creatorEmail = `test.creator.api.${runId}@example.com`;
const brandEmail = `test.brand.api.${runId}@example.com`;
const creatorWhatsapp = `+9199${uniqDigits}`;
const brandPhone = `+9198${uniqDigits}`;

const ctx = {
  applicationId: null,
  brandLeadId: null,
  token: null,
  creatorId: null,
  campaignId: null,
  campaignCreatorId: null,
  campaignManagerToken: null,
  financeManagerToken: null,
};

const json = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const request = async (method, path, body, token) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await json(res);
  return { res, payload };
};

const expectHttp = (step, { res, payload }, expectedStatus) => {
  assert.strictEqual(
    res.status,
    expectedStatus,
    `${step} expected ${expectedStatus} got ${res.status} -> ${JSON.stringify(payload)}`,
  );
  return payload;
};

const expectSuccessEnvelope = (step, payload) => {
  assert.strictEqual(payload?.success, true, `${step} expected success:true -> ${JSON.stringify(payload)}`);
  return payload.data;
};

const getId = (obj) => obj?._id || obj?.id;

const logPass = (label, extra = '') => {
  console.log(`\u2705 ${label} — PASS${extra ? ` (${extra})` : ''}`);
};

const logFail = (label, error) => {
  console.error(`\u274C ${label} — FAIL`);
  console.error(error?.message || error);
};

const run = async () => {
  let passed = 0;
  let failed = 0;

  const runStep = async (label, fn) => {
    try {
      await fn();
      passed += 1;
    } catch (e) {
      failed += 1;
      logFail(label, e);
      throw e;
    }
  };

  await runStep('STEP 1: Health Check', async () => {
    const r = await request('GET', '/api/health');
    const body = expectHttp('STEP 1', r, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data?.status, 'ok');
    logPass('STEP 1: Health Check');
  });

  await runStep('STEP 2: Creator Application', async () => {
    const r = await request('POST', '/api/creators/apply', {
      name: 'Test Creator API',
      age: 24,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: 'https://instagram.com/testcreator',
      whatsapp: creatorWhatsapp,
      email: creatorEmail,
      referral: 'api_test',
    });

    const body = expectHttp('STEP 2', r, 201);
    const data = expectSuccessEnvelope('STEP 2', body);
    ctx.applicationId = data?.application?._id;
    assert.ok(ctx.applicationId, 'applicationId missing');
    logPass('STEP 2: Creator Application', `ID: ${ctx.applicationId}`);
  });

  await runStep('STEP 3: Brand Brief Submission', async () => {
    const r = await request('POST', '/api/brands/submit-brief', {
      brandName: 'Test Brand API',
      contactName: 'Test Contact',
      email: brandEmail,
      phone: brandPhone,
      campaignGoal: 'awareness',
      targetAudience: 'Women 18-25, metro cities',
      budget: '2l-5l',
      timeline: 'April 2026',
      notes: 'Test campaign from API test suite',
    });

    const body = expectHttp('STEP 3', r, 201);
    const data = expectSuccessEnvelope('STEP 3', body);
    ctx.brandLeadId = data?.brandLead?._id;
    assert.ok(ctx.brandLeadId, 'brandLeadId missing');
    logPass('STEP 3: Brand Brief', `ID: ${ctx.brandLeadId}`);
  });

  await runStep('STEP 4: Earnings Calculator', async () => {
    const r = await request(
      'GET',
      '/api/creators/calculator?platform=instagram&followers=25000&niche=beauty&frequency=3-4x/week&engagement=good&city=Mumbai',
    );
    const body = expectHttp('STEP 4', r, 200);
    expectSuccessEnvelope('STEP 4', body);
    logPass('STEP 4: Earnings Calculator');
  });

  await runStep('STEP 5: Super Admin Login', async () => {
    const r = await request('POST', '/api/auth/login', {
      email: 'admin@triplef.com',
      password: 'Admin@123',
    });
    const body = expectHttp('STEP 5', r, 200);
    const data = expectSuccessEnvelope('STEP 5', body);
    ctx.token = data?.token;
    assert.ok(ctx.token, 'token missing');
    logPass('STEP 5: Super Admin Login');
  });

  await runStep('STEP 6: Get Current Admin', async () => {
    const r = await request('GET', '/api/auth/me', undefined, ctx.token);
    const body = expectHttp('STEP 6', r, 200);
    const data = expectSuccessEnvelope('STEP 6', body);
    assert.ok(getId(data?.user), 'user missing');
    logPass('STEP 6: Auth Me');
  });

  await runStep('STEP 7: Get All Applications', async () => {
    const r = await request('GET', '/api/admin/applications', undefined, ctx.token);
    const body = expectHttp('STEP 7', r, 200);
    const data = expectSuccessEnvelope('STEP 7', body);
    assert.ok(Array.isArray(data?.applications), 'applications array missing');
    logPass('STEP 7: List Applications');
  });

  await runStep('STEP 8: Get Single Application', async () => {
    const r = await request('GET', `/api/admin/applications/${ctx.applicationId}`, undefined, ctx.token);
    const body = expectHttp('STEP 8', r, 200);
    const data = expectSuccessEnvelope('STEP 8', body);
    assert.strictEqual(String(data?.application?._id), String(ctx.applicationId));
    logPass('STEP 8: Get Application');
  });

  await runStep('STEP 9: Approve Creator', async () => {
    const r = await request(
      'POST',
      `/api/admin/applications/${ctx.applicationId}/approve`,
      {
        handle: 'testcreatorapi',
        engagementRate: 4.8,
        upiId: 'test@okhdfcbank',
        panNumber: 'ABCDE1234F',
        tags: ['beauty', 'test', 'api'],
        internalNotes: 'Created by API test',
      },
      ctx.token,
    );
    const body = expectHttp('STEP 9', r, 200);
    const data = expectSuccessEnvelope('STEP 9', body);
    ctx.creatorId = data?.creator?._id;
    assert.ok(ctx.creatorId, 'creatorId missing');
    logPass('STEP 9: Approve Creator', `ID: ${ctx.creatorId}`);
  });

  await runStep('STEP 10: Get All Creators', async () => {
    const r = await request('GET', '/api/admin/creators', undefined, ctx.token);
    const body = expectHttp('STEP 10', r, 200);
    const data = expectSuccessEnvelope('STEP 10', body);
    assert.ok(Array.isArray(data?.creators), 'creators array missing');
    logPass('STEP 10: List Creators');
  });

  await runStep('STEP 11: Get Single Creator', async () => {
    const r = await request('GET', `/api/admin/creators/${ctx.creatorId}`, undefined, ctx.token);
    const body = expectHttp('STEP 11', r, 200);
    const data = expectSuccessEnvelope('STEP 11', body);
    assert.strictEqual(String(data?.creator?._id), String(ctx.creatorId));
    logPass('STEP 11: Get Creator');
  });

  await runStep('STEP 12: Update Creator', async () => {
    const r = await request(
      'PUT',
      `/api/admin/creators/${ctx.creatorId}`,
      { city: 'Delhi', engagementRate: 5.2, status: 'priority', internalNotes: 'Updated via API test' },
      ctx.token,
    );
    const body = expectHttp('STEP 12', r, 200);
    expectSuccessEnvelope('STEP 12', body);
    logPass('STEP 12: Update Creator');
  });

  await runStep('STEP 13: Add Tags to Creator', async () => {
    const r = await request(
      'POST',
      `/api/admin/creators/${ctx.creatorId}/tags`,
      { tags: ['beauty', 'metro', 'priority', 'api_test'] },
      ctx.token,
    );
    const body = expectHttp('STEP 13', r, 200);
    expectSuccessEnvelope('STEP 13', body);
    logPass('STEP 13: Add Tags');
  });

  await runStep('STEP 14: Suggest Creators', async () => {
    const r = await request(
      'GET',
      '/api/admin/campaigns/suggest?niche=beauty&minFollowers=10000&maxFollowers=50000',
      undefined,
      ctx.token,
    );
    const body = expectHttp('STEP 14', r, 200);
    const data = expectSuccessEnvelope('STEP 14', body);
    assert.ok(Array.isArray(data?.creators), 'expected creators array');
    logPass('STEP 14: Suggest Creators');
  });

  await runStep('STEP 15: Create Campaign', async () => {
    const r = await request(
      'POST',
      '/api/admin/campaigns',
      {
        campaignName: 'API Test Campaign',
        brandName: 'Test Brand API',
        brandLeadId: ctx.brandLeadId,
        type: 'sponsored_post',
        budget: 100000,
        creatorCount: 1,
        timelineStart: '2026-04-10T00:00:00.000Z',
        timelineEnd: '2026-04-20T00:00:00.000Z',
        brandPaymentStatus: 'pending',
        creators: [{ creatorId: ctx.creatorId, amount: 25000 }],
      },
      ctx.token,
    );
    const body = expectHttp('STEP 15', r, 201);
    const data = expectSuccessEnvelope('STEP 15', body);
    ctx.campaignId = data?.campaign?._id;
    assert.ok(ctx.campaignId, 'campaignId missing');

    // campaignCreatorId is not returned in createCampaign response (it returns campaign only).
    const campaignDetails = await request('GET', `/api/admin/campaigns/${ctx.campaignId}`, undefined, ctx.token);
    const detailsBody = expectHttp('STEP 15 (fetch campaign)', campaignDetails, 200);
    const detailsData = expectSuccessEnvelope('STEP 15 (fetch campaign)', detailsBody);

    ctx.campaignCreatorId = detailsData?.campaignCreators?.[0]?._id;
    assert.ok(ctx.campaignCreatorId, 'campaignCreatorId missing');

    logPass('STEP 15: Create Campaign', `campaignId: ${ctx.campaignId}, assignmentId: ${ctx.campaignCreatorId}`);
  });

  await runStep('STEP 16: Get All Campaigns', async () => {
    const r = await request('GET', '/api/admin/campaigns', undefined, ctx.token);
    const body = expectHttp('STEP 16', r, 200);
    const data = expectSuccessEnvelope('STEP 16', body);
    assert.ok(Array.isArray(data?.campaigns), 'campaigns array missing');
    logPass('STEP 16: List Campaigns');
  });

  await runStep('STEP 17: Get Single Campaign', async () => {
    const r = await request('GET', `/api/admin/campaigns/${ctx.campaignId}`, undefined, ctx.token);
    const body = expectHttp('STEP 17', r, 200);
    const data = expectSuccessEnvelope('STEP 17', body);
    assert.strictEqual(String(data?.campaign?._id), String(ctx.campaignId));
    assert.ok(Array.isArray(data?.campaignCreators), 'campaignCreators missing');
    logPass('STEP 17: Get Campaign');
  });

  await runStep('STEP 18: Update Campaign', async () => {
    const r = await request(
      'PUT',
      `/api/admin/campaigns/${ctx.campaignId}`,
      { brandPaymentStatus: 'received', brandPaymentAmount: 100000, status: 'active' },
      ctx.token,
    );
    const body = expectHttp('STEP 18', r, 200);
    expectSuccessEnvelope('STEP 18', body);
    logPass('STEP 18: Update Campaign');
  });

  await runStep('STEP 19: Send Briefs', async () => {
    const r = await request('POST', `/api/admin/campaigns/${ctx.campaignId}/send-briefs`, {}, ctx.token);
    const body = expectHttp('STEP 19', r, 200);
    const data = expectSuccessEnvelope('STEP 19', body);
    assert.ok(typeof data?.count === 'number', 'count missing');
    logPass('STEP 19: Send Briefs', `count: ${data.count}`);
  });

  await runStep('STEP 20: DB Update (Simulate content submission)', async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment; cannot perform step 20 DB update');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });

    const updated = await CampaignCreator.findByIdAndUpdate(
      ctx.campaignCreatorId,
      {
        contentStatus: 'submitted',
        contentSubmittedAt: new Date(),
        contentUrl: 'https://cloudinary.com/test-video.mp4',
      },
      { new: true },
    );

    assert.ok(updated, 'CampaignCreator not found for update');
    assert.strictEqual(updated.contentStatus, 'submitted');

    await mongoose.disconnect();

    logPass('STEP 20: DB Update', `assignmentId: ${ctx.campaignCreatorId}`);
  });

  await runStep('STEP 21: Approve Content', async () => {
    const r = await request(
      'POST',
      `/api/admin/campaigns/${ctx.campaignId}/creators/${ctx.creatorId}/approve-content`,
      { feedback: 'Content approved via API test' },
      ctx.token,
    );
    const body = expectHttp('STEP 21', r, 200);
    expectSuccessEnvelope('STEP 21', body);
    logPass('STEP 21: Approve Content');
  });

  await runStep('STEP 22: Mark Post Live', async () => {
    const r = await request(
      'POST',
      `/api/admin/campaigns/${ctx.campaignId}/creators/${ctx.creatorId}/mark-live`,
      { postUrl: 'https://instagram.com/p/api-test-post' },
      ctx.token,
    );
    const body = expectHttp('STEP 22', r, 200);
    expectSuccessEnvelope('STEP 22', body);
    logPass('STEP 22: Mark Live');
  });

  await runStep('STEP 23: Mark Campaign Complete', async () => {
    const r = await request('POST', `/api/admin/campaigns/${ctx.campaignId}/complete`, {}, ctx.token);
    const body = expectHttp('STEP 23', r, 200);
    expectSuccessEnvelope('STEP 23', body);
    logPass('STEP 23: Complete Campaign');
  });

  await runStep('STEP 24: Campaign Manager Login', async () => {
    const r = await request('POST', '/api/auth/login', {
      email: 'campaign.manager@triplef.com',
      password: 'Manager@123',
    });
    const body = expectHttp('STEP 24', r, 200);
    const data = expectSuccessEnvelope('STEP 24', body);
    ctx.campaignManagerToken = data?.token;
    assert.ok(ctx.campaignManagerToken, 'campaignManagerToken missing');
    logPass('STEP 24: Campaign Manager Login');
  });

  await runStep('STEP 25: Campaign Manager Can Access Campaigns', async () => {
    const r = await request('GET', '/api/admin/campaigns', undefined, ctx.campaignManagerToken);
    const body = expectHttp('STEP 25', r, 200);
    expectSuccessEnvelope('STEP 25', body);
    logPass('STEP 25: CM Access Campaigns');
  });

  await runStep('STEP 26: Campaign Manager CANNOT Access Applications', async () => {
    const r = await request('GET', '/api/admin/applications', undefined, ctx.campaignManagerToken);
    expectHttp('STEP 26', r, 403);
    logPass('STEP 26: CM Forbidden Applications');
  });

  await runStep('STEP 27: Finance Manager Login', async () => {
    const r = await request('POST', '/api/auth/login', {
      email: 'finance.manager@triplef.com',
      password: 'Finance@123',
    });
    const body = expectHttp('STEP 27', r, 200);
    const data = expectSuccessEnvelope('STEP 27', body);
    ctx.financeManagerToken = data?.token;
    assert.ok(ctx.financeManagerToken, 'financeManagerToken missing');
    logPass('STEP 27: Finance Manager Login');
  });

  await runStep('STEP 28: Get Pending Payments (FM)', async () => {
    const r = await request('GET', '/api/admin/payments', undefined, ctx.financeManagerToken);
    const body = expectHttp('STEP 28', r, 200);
    const data = expectSuccessEnvelope('STEP 28', body);
    assert.ok(Array.isArray(data?.pendingAssignments), 'pendingAssignments missing');
    logPass('STEP 28: Pending Payments', `pending: ${data.pendingAssignments.length}`);
  });

  await runStep('STEP 29: Process Payments', async () => {
    const r = await request(
      'POST',
      '/api/admin/payments/process',
      { assignmentIds: [ctx.campaignCreatorId] },
      ctx.financeManagerToken,
    );
    const body = expectHttp('STEP 29', r, 200);
    const data = expectSuccessEnvelope('STEP 29', body);
    assert.ok(Array.isArray(data?.payments), 'payments array missing');
    logPass('STEP 29: Process Payments', `processed: ${data.payments.length}`);
  });

  await runStep('STEP 30: Get All Leads', async () => {
    const r = await request('GET', '/api/admin/leads', undefined, ctx.token);
    const body = expectHttp('STEP 30', r, 200);
    const data = expectSuccessEnvelope('STEP 30', body);
    assert.ok(Array.isArray(data?.leads), 'leads array missing');
    logPass('STEP 30: List Leads');
  });

  await runStep('STEP 31: Get Admin Dashboard', async () => {
    const r = await request('GET', '/api/admin/dashboard', undefined, ctx.token);
    const body = expectHttp('STEP 31', r, 200);
    expectSuccessEnvelope('STEP 31', body);
    logPass('STEP 31: Dashboard');
  });

  await runStep('STEP 32: Generate Campaign Report', async () => {
    const r = await request('GET', `/api/admin/reports/campaign/${ctx.campaignId}`, undefined, ctx.token);
    const body = expectHttp('STEP 32', r, 200);
    const data = expectSuccessEnvelope('STEP 32', body);
    assert.ok(data?.reportUrl, 'reportUrl missing');
    logPass('STEP 32: Campaign Report');
  });

  await runStep('STEP 33: Get Audit Logs', async () => {
    const r = await request('GET', '/api/admin/audit-logs', undefined, ctx.token);
    const body = expectHttp('STEP 33', r, 200);
    const data = expectSuccessEnvelope('STEP 33', body);
    assert.ok(Array.isArray(data?.logs), 'logs array missing');
    logPass('STEP 33: Audit Logs');
  });

  await runStep('STEP 34: Get All Users', async () => {
    const r = await request('GET', '/api/admin/users', undefined, ctx.token);
    const body = expectHttp('STEP 34', r, 200);
    const data = expectSuccessEnvelope('STEP 34', body);
    assert.ok(Array.isArray(data?.users), 'users array missing');
    logPass('STEP 34: Users');
  });

  await runStep('STEP 35: Logout', async () => {
    const r = await request('POST', '/api/auth/logout', {}, ctx.token);
    const body = expectHttp('STEP 35', r, 200);
    expectSuccessEnvelope('STEP 35', body);
    logPass('STEP 35: Logout');
  });

  // DB verification
  await runStep('DB Verification', async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment; cannot run DB verification');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });

    const counts = {
      applications: await Application.countDocuments(),
      creators: await Creator.countDocuments(),
      brand_leads: await BrandLead.countDocuments(),
      campaigns: await Campaign.countDocuments(),
      campaign_creators: await CampaignCreator.countDocuments(),
      payments: await Payment.countDocuments(),
      users: await User.countDocuments(),
    };

    await mongoose.disconnect();

    assert.ok(counts.applications >= 1);
    assert.ok(counts.creators >= 1);
    assert.ok(counts.brand_leads >= 1);
    assert.ok(counts.campaigns >= 1);
    assert.ok(counts.campaign_creators >= 1);
    assert.ok(counts.payments >= 1);
    assert.ok(counts.users >= 4);

    logPass('DB Verification', JSON.stringify(counts));
  });

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    API TEST REPORT — TRIPLE F MEDIA BACKEND                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Tests: 35`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  console.log('\nCreated IDs:');
  console.log(`- Application ID: ${ctx.applicationId}`);
  console.log(`- Creator ID: ${ctx.creatorId}`);
  console.log(`- Brand Lead ID: ${ctx.brandLeadId}`);
  console.log(`- Campaign ID: ${ctx.campaignId}`);
  console.log(`- Campaign Creator ID: ${ctx.campaignCreatorId}`);
};

run().catch(() => process.exit(1));
