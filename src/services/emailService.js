import nodemailer from 'nodemailer';

import logger from '../utils/logger.js';
import User from '../models/User.js';

const onboardingEmail = process.env.ONBOARDING_EMAIL || 'onboarding@triplef.com';
const campaignEmail = process.env.CAMPAIGN_EMAIL || 'campaign@triplef.com';
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com';

const normalizeRecipients = (value) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const roleFallbackRecipients = {
  super_admin: process.env.ADMIN_EMAIL,
  campaign_manager: process.env.CAMPAIGN_MANAGER_EMAIL,
  finance_manager: process.env.FINANCE_MANAGER_EMAIL,
  onboarding_specialist: process.env.ONBOARDING_SPECIALIST_EMAIL,
};

const getActiveUsersByRoles = async (roles = []) => {
  if (!roles?.length) {
    return [];
  }

  return User.find({ role: { $in: roles }, isActive: true }).select('name email role').lean();
};

const sendEmail = async (to, subject, html, text, options = {}) => {
  if (!to || !subject || !html) {
    throw new Error('Email recipient, subject, and html are required');
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const error = new Error('SMTP credentials missing (EMAIL_USER/EMAIL_PASS)');
    error.code = 'SMTP_CREDENTIALS_MISSING';
    throw error;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const smtpFrom = process.env.EMAIL_USER;
  const info = await transporter.sendMail({
    from: smtpFrom,
    to: Array.isArray(to) ? to.join(', ') : to,
    ...(normalizeRecipients(options.cc).length ? { cc: normalizeRecipients(options.cc).join(', ') } : {}),
    ...(normalizeRecipients(options.bcc).length ? { bcc: normalizeRecipients(options.bcc).join(', ') } : {}),
    subject,
    html,
    ...(text ? { text } : {}),
  });

  logger.info('Email sent via SMTP', {
    to,
    subject,
    id: info.messageId,
  });

  return {
    provider: 'smtp',
    id: info.messageId,
    accepted: true,
    raw: info,
  };
};

const sendProposal = async (brand, campaign, pdfUrl) =>
  sendEmail(
    brand.email,
    `Proposal for ${campaign.campaignName}`,
    `<p>Hi ${brand.contactName},</p><p>Please find your campaign proposal for <strong>${campaign.campaignName}</strong>.</p><p><a href="${pdfUrl}">View proposal</a></p>`,
  );

const sendReport = async (brand, campaign, pdfUrl) =>
  sendEmail(
    brand.email,
    `Campaign report for ${campaign.campaignName}`,
    `<p>Hi ${brand.contactName},</p><p>Your campaign report for <strong>${campaign.campaignName}</strong> is ready.</p><p><a href="${pdfUrl}">View report</a></p>`,
  );

const sendInvoice = async (creator, invoice) =>
  sendEmail(
    creator.email || process.env.ADMIN_EMAIL,
    `Invoice ${invoice.invoiceNumber}`,
    `<p>Hi ${creator.name},</p><p>Your invoice for <strong>${invoice.campaignName}</strong> has been generated.</p><p><a href="${invoice.pdfUrl}">View invoice</a></p>`,
  );

const sendApplicationConfirmation = async (to, name, applicationId) => {
  const subject = 'Application Received - Triple F Media';

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
          <h2>Hi ${name},</h2>
          <p>Thank you for applying to Triple F Media!</p>
          <p>We have received your application and our team will review it within <strong>48 hours</strong>.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Application ID:</strong> ${applicationId}</p>
            <p><strong>Platform:</strong> Creator</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          <p>What happens next?</p>
          <ol>
            <li>Our team reviews your profile (content quality, engagement)</li>
            <li>If approved, you'll receive a WhatsApp welcome message</li>
            <li>You'll start receiving campaign briefs from brands</li>
          </ol>
          <a href="https://triplef.vercel.app/status?appId=${applicationId}" class="button">Check Application Status</a>
          <p style="margin-top: 20px;">Questions? Reply to this email or WhatsApp us at +919876543210.</p>
        </div>
        <div class="footer">
          <p>Triple F Media - Your audience is an asset. Let's make it earn.</p>
          <p>&copy; 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${name},

Thank you for applying to Triple F Media!

We have received your application (ID: ${applicationId}) and our team will review it within 48 hours.

What happens next?
1. Our team reviews your profile
2. If approved, you'll receive a WhatsApp welcome message
3. You'll start receiving campaign briefs from brands

Questions? Reply to this email or WhatsApp us at +919876543210.

- Triple F Team`;

  return sendEmail(to, subject, html, text);
};

const sendInternalCreatorApplicationAlert = async (to, adminName, application) => {
  const subject = `New Creator Application - ${application.name}`;
  const html = `
    <p>Hi ${adminName || 'Team'},</p>
    <p>A new creator application has been submitted on Triple F Media.</p>
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p><strong>Name:</strong> ${application.name}</p>
      <p><strong>Email:</strong> ${application.email}</p>
      <p><strong>WhatsApp:</strong> ${application.whatsapp}</p>
      <p><strong>Platform:</strong> ${application.platform}</p>
      <p><strong>Followers:</strong> ${application.followers}</p>
      <p><strong>Niche:</strong> ${application.niche}</p>
      <p><strong>City:</strong> ${application.city}</p>
      <p><strong>Application ID:</strong> ${application._id}</p>
    </div>
    <p>Please review this application in the admin panel.</p>
  `;
  const text = `Hi ${adminName || 'Team'},

New creator application submitted.

Name: ${application.name}
Email: ${application.email}
WhatsApp: ${application.whatsapp}
Platform: ${application.platform}
Followers: ${application.followers}
Niche: ${application.niche}
City: ${application.city}
Application ID: ${application._id}

Please review this application in the admin panel.`;

  return sendEmail(to, subject, html, text);
};

const sendBrandBriefConfirmation = async (to, contactName, brandLead) => {
  const subject = 'Campaign Brief Received — Triple F Media';
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
        .highlight { color: #F47B20; font-weight: bold; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #F47B20; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .tip-box { background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <h2>Hi ${contactName}, 👋</h2>
          <p>Thank you for submitting your campaign brief to <strong>Triple F Media</strong>!</p>
          <p>We have received your request and our team will review it within <strong>24 hours</strong>.</p>
          
          <div class="info-box">
            <p><strong>📋 Brief ID:</strong> ${brandLead._id}</p>
            <p><strong>🏢 Brand:</strong> ${brandLead.brandName}</p>
            <p><strong>⏳ Status:</strong> Under Review</p>
          </div>
          
          <h3>What happens next?</h3>
          <ol>
            <li>Our Campaign Manager reviews your brief (niche, budget, timeline)</li>
            <li>We shortlist <strong>5-15 creators</strong> matching your requirements</li>
            <li>You'll receive a <strong>proposal with creator profiles</strong> within 48 hours</li>
            <li>Each creator profile includes: followers, engagement rate, past campaigns, pricing</li>
            <li>You approve the creators and make payment</li>
            <li>Campaign goes live within 7-14 days</li>
          </ol>
          
          <div class="tip-box">
            <p style="margin: 0;"><strong>📊 Did you know?</strong> Our creators have an average engagement rate of 4.8% — 3x higher than industry average.</p>
          </div>
          
          <p>We have <strong>100+ vetted creators</strong> across Beauty, Tech, Fashion, Finance, Gaming, Lifestyle, Food, and Travel niches.</p>
          
          <p>Questions? WhatsApp us at <strong>+919876543210</strong> or reply to this email.</p>
          
          <a href="${process.env.FRONTEND_URL || 'https://fff-media.vercel.app'}/brands/status?leadId=${brandLead._id}" class="button">Check Brief Status</a>
        </div>
        <div class="footer">
          <p>Triple F Media — Reach Gen Z. For Real.</p>
          <p>© 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Hi ${contactName},

Thank you for submitting your campaign brief to Triple F Media!

We have received your request (ID: ${brandLead._id}) and our team will review it within 24 hours.

What happens next?
1. Our team reviews your brief
2. We shortlist 5-15 creators matching your requirements
3. You'll receive a proposal with creator profiles within 48 hours
4. You approve and make payment
5. Campaign goes live within 7-14 days

We have 100+ vetted creators across Beauty, Tech, Fashion, Finance, Gaming, and more.

Questions? WhatsApp us at +919876543210

— Triple F Team`;

  return sendEmail(to, subject, html, text);
};

const sendBrandConfirmation = async (to, brandName, leadId) =>
  sendEmail(
    to,
    `Your Campaign Brief - ${brandName}`,
    `<p>Hi,</p><p>Thank you for submitting your campaign brief for <strong>${brandName}</strong>.</p><p>Your brief ID is <strong>${leadId}</strong>.</p><p>Our team will review it and share a response shortly.</p>`,
    `Thank you for submitting your campaign brief for ${brandName}. Your brief ID is ${leadId}.`,
  );

const sendInternalBrandLeadAlert = async (to, adminName, brandLead) => {
  const subject = `New Brand Brief - ${brandLead.brandName}`;
  const html = `
    <p>Hi ${adminName || 'Team'},</p>
    <p>A new brand brief has been submitted on Triple F Media.</p>
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p><strong>Brand:</strong> ${brandLead.brandName}</p>
      <p><strong>Contact:</strong> ${brandLead.contactName}</p>
      <p><strong>Email:</strong> ${brandLead.email}</p>
      <p><strong>Phone:</strong> ${brandLead.phone}</p>
      <p><strong>Budget:</strong> ${brandLead.budget}</p>
      <p><strong>Goal:</strong> ${brandLead.campaignGoal}</p>
      <p><strong>Timeline:</strong> ${brandLead.timeline}</p>
      <p><strong>Brief ID:</strong> ${brandLead._id}</p>
    </div>
    <p>Please review this brief and create a campaign proposal.</p>
  `;
  const text = `Hi ${adminName || 'Team'},

New brand brief submitted.

Brand: ${brandLead.brandName}
Contact: ${brandLead.contactName}
Email: ${brandLead.email}
Phone: ${brandLead.phone}
Budget: ${brandLead.budget}
Goal: ${brandLead.campaignGoal}
Timeline: ${brandLead.timeline}
Brief ID: ${brandLead._id}

Please review this brief and create a campaign proposal.`;

  return sendEmail(to, subject, html, text);
};

const notifyOnboardingSpecialist = async (application) => {
  const subject = `New Creator Application: ${application.name}`;
  const reviewUrl = `${process.env.ADMIN_URL || 'http://localhost:5174'}/applications/${application._id}`;
  const html = `
    <p>New creator application received.</p>
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p><strong>Name:</strong> ${application.name}</p>
      <p><strong>Age:</strong> ${application.age}</p>
      <p><strong>City:</strong> ${application.city}</p>
      <p><strong>Platform:</strong> ${application.platform}</p>
      <p><strong>Followers:</strong> ${application.followers}</p>
      <p><strong>Niche:</strong> ${application.niche}</p>
      <p><strong>Profile Link:</strong> <a href="${application.profileLink}">${application.profileLink}</a></p>
      <p><strong>WhatsApp:</strong> ${application.whatsapp}</p>
      <p><strong>Email:</strong> ${application.email}</p>
      <p><strong>Applied at:</strong> ${new Date(application.createdAt).toLocaleString()}</p>
    </div>
    <p><a href="${reviewUrl}">Review Application</a></p>
  `;
  const text = `New Creator Application: ${application.name}

City: ${application.city}
Platform: ${application.platform}
Followers: ${application.followers}
Niche: ${application.niche}
Profile: ${application.profileLink}
WhatsApp: ${application.whatsapp}
Email: ${application.email}

Review at: ${reviewUrl}`;

  const [onboardingUsers, superAdmins] = await Promise.all([
    getActiveUsersByRoles(['onboarding_specialist']),
    getActiveUsersByRoles(['super_admin']),
  ]);

  const to = onboardingUsers.length
    ? onboardingUsers.map((u) => u.email)
    : onboardingEmail;
  const cc = superAdmins.length
    ? superAdmins.map((u) => u.email)
    : [superAdminEmail];

  return sendEmail(to, subject, html, text, { cc });
};

const notifyCampaignManager = async (brandLead) => {
  const subject = `🔔 New Brand Brief: ${brandLead.brandName}`;
  const reviewUrl = `${process.env.ADMIN_URL || 'http://localhost:5174'}/leads/${brandLead._id}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A3C8F; padding: 15px; text-align: center; color: white; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .label { font-weight: bold; color: #1A3C8F; }
        .admin-link { display: inline-block; padding: 10px 20px; background: #F47B20; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📢 New Brand Campaign Brief</h2>
        </div>
        <div class="content">
          <div class="info-box">
            <p><span class="label">Brand Name:</span> ${brandLead.brandName}</p>
            <p><span class="label">Contact Name:</span> ${brandLead.contactName}</p>
            <p><span class="label">Email:</span> ${brandLead.email}</p>
            <p><span class="label">Phone:</span> ${brandLead.phone}</p>
            <p><span class="label">Campaign Goal:</span> ${brandLead.campaignGoal}</p>
            <p><span class="label">Target Audience:</span> ${brandLead.targetAudience}</p>
            <p><span class="label">Budget:</span> ${brandLead.budget}</p>
            <p><span class="label">Timeline:</span> ${brandLead.timeline}</p>
            <p><span class="label">Notes:</span> ${brandLead.notes || 'None'}</p>
            <p><span class="label">Submitted at:</span> ${new Date(brandLead.createdAt).toLocaleString()}</p>
          </div>
          
          <a href="${reviewUrl}" class="admin-link">📋 View Brief & Create Campaign →</a>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `New Brand Brief: ${brandLead.brandName}

Contact: ${brandLead.contactName}
Email: ${brandLead.email}
Phone: ${brandLead.phone}
Campaign Goal: ${brandLead.campaignGoal}
Budget: ${brandLead.budget}
Timeline: ${brandLead.timeline}
Notes: ${brandLead.notes || 'None'}

View at: ${reviewUrl}`;

  const [campaignUsers, superAdmins] = await Promise.all([
    getActiveUsersByRoles(['campaign_manager']),
    getActiveUsersByRoles(['super_admin']),
  ]);

  const to = campaignUsers.length
    ? campaignUsers.map((u) => u.email)
    : campaignEmail;
  const cc = superAdmins.length
    ? superAdmins.map((u) => u.email)
    : [superAdminEmail];

  return sendEmail(to, subject, html, text, { cc });
};

const resolveRoleNotificationRecipients = (roles = [], users = []) => {
  const recipientsByEmail = new Map();

  users.forEach((user) => {
    if (!user?.email) {
      return;
    }

    recipientsByEmail.set(String(user.email).toLowerCase(), {
      email: user.email,
      name: user.name || 'Team',
      role: user.role || 'unknown',
      source: 'database',
    });
  });

  roles.forEach((role) => {
    const fallbackEmail = roleFallbackRecipients[role];
    if (!fallbackEmail) {
      return;
    }

    const key = String(fallbackEmail).toLowerCase();
    if (!recipientsByEmail.has(key)) {
      recipientsByEmail.set(key, {
        email: fallbackEmail,
        name: role.replace(/_/g, ' '),
        role,
        source: 'env',
      });
    }
  });

  return Array.from(recipientsByEmail.values());
};

const sendCreatorApprovalEmail = async (to, name, creatorId, handle) => {
  const subject = 'Welcome to Triple F Media — Your Profile is Approved! 🎉';

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
        .success-badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .highlight { color: #F47B20; font-weight: bold; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .tip-box { background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="success-badge">✅ APPROVED</span>
          </div>
          
          <h2>Congratulations, ${name}! 🎉</h2>
          <p>Your profile has been <strong>approved</strong> and is now <strong>active</strong> on Triple F Media.</p>
          
          <div class="info-box">
            <p><strong>🆔 Creator ID:</strong> ${creatorId}</p>
            <p><strong>📱 Handle:</strong> @${handle}</p>
            <p><strong>✅ Status:</strong> <span style="color: #10B981;">Active</span></p>
          </div>
          
          <h3>What happens now?</h3>
          <ol>
            <li>You'll receive campaign briefs on <strong>WhatsApp</strong></li>
            <li>Each brief includes: brand name, payment amount, content requirements, deadline</li>
            <li>You can <strong>ACCEPT or DECLINE</strong> any campaign (no penalty for declining)</li>
            <li>Payment is sent within <strong>7 days</strong> of campaign completion</li>
          </ol>
          
          <div class="tip-box">
            <p style="margin: 0;"><strong>💡 Pro Tip:</strong> Make sure your UPI ID and PAN number are updated to receive payments faster. Reply to this email or WhatsApp us to update.</p>
          </div>
          
          <p style="margin-top: 20px;">Questions? WhatsApp us at <strong>+919876543210</strong> or reply to this email.</p>
          
          <p>Welcome to the Triple F family! 🚀</p>
        </div>
        <div class="footer">
          <p>Triple F Media — Your audience is an asset. Let's make it earn.</p>
          <p>© 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Congratulations ${name}!\n\nYour profile has been approved and is now active on Triple F Media.\n\nCreator ID: ${creatorId}\nHandle: @${handle}\n\nWhat happens now?\n1. You'll receive campaign briefs on WhatsApp\n2. Each brief includes brand name, payment, requirements, deadline\n3. You can ACCEPT or DECLINE any campaign (no penalty)\n4. Payment within 7 days of campaign completion\n\nPro Tip: Update your UPI ID and PAN to receive payments faster.\n\nQuestions? WhatsApp us at +919876543210\n\nWelcome to the Triple F family!\n\n— Triple F Team`;

  return sendEmail(to, subject, html, text);
};

const sendCreatorRejectionEmail = async (to, name, rejectionReason, rejectionType) => {
  const subject = 'Regarding Your Triple F Media Application';

  // Get friendly reason message and suggestion
  let reasonMessage = '';
  let suggestionMessage = '';

  switch (rejectionType) {
    case 'content_quality':
      reasonMessage = 'Content quality does not meet our current standards.';
      suggestionMessage = 'We recommend improving video quality, lighting, and editing consistency. You can reapply after 3 months.';
      break;
    case 'engagement_rate_low':
      reasonMessage = 'Engagement rate is below our minimum requirement of 2%.';
      suggestionMessage = 'Focus on building genuine engagement with your audience. Reply to comments, create interactive content. You can reapply after 3 months.';
      break;
    case 'niche_not_in_demand':
      reasonMessage = 'Your content niche is not currently in demand for our active campaigns.';
      suggestionMessage = 'We will notify you when campaigns in your niche become available. You can reapply after 3 months.';
      break;
    case 'followers_below_5k':
      reasonMessage = 'Follower count is below our minimum requirement of 5,000 followers.';
      suggestionMessage = 'Keep creating great content and grow your audience. You can reapply once you reach 5,000 followers.';
      break;
    case 'fake_followers':
      reasonMessage = 'Your profile appears to have fake or inactive followers.';
      suggestionMessage = 'Brands value authentic engagement over follower count. Focus on organic growth. You can reapply after 3 months.';
      break;
    case 'incomplete_application':
      reasonMessage = 'Your application was incomplete or contained incorrect information.';
      suggestionMessage = 'Please ensure all fields are filled correctly when you reapply. You can reapply after 3 months.';
      break;
    case 'location_not_serviceable':
      reasonMessage = 'Your location is currently not serviceable by our platform.';
      suggestionMessage = 'We are expanding to more locations soon. You can reapply after 3 months.';
      break;
    default:
      reasonMessage = rejectionReason;
      suggestionMessage = 'You can reapply after 3 months.';
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .reason-box { background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          
          <p>Thank you for your interest in joining Triple F Media.</p>
          
          <div class="reason-box">
            <p><strong>📋 Application Status:</strong> Not Approved</p>
            <p><strong>❌ Reason:</strong> ${reasonMessage}</p>
          </div>
          
          <div class="info-box">
            <p><strong>What does this mean?</strong></p>
            <p>${suggestionMessage}</p>
          </div>
          
          <p>We encourage you to keep creating great content and reapply after 3 months. Many successful creators on our platform started exactly where you are now.</p>
          
          <p>Questions? WhatsApp us at <strong>+919876543210</strong> or reply to this email.</p>
          
          <p style="margin-top: 30px;">We wish you the best in your creator journey!</p>
        </div>
        <div class="footer">
          <p>Triple F Media — Your audience is an asset. Let's make it earn.</p>
          <p>© 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${name},\n\nThank you for your interest in joining Triple F Media.\n\nApplication Status: Not Approved\nReason: ${reasonMessage}\n\n${suggestionMessage}\n\nWe encourage you to keep creating great content and reapply after 3 months.\n\nQuestions? WhatsApp us at +919876543210\n\n— Triple F Team`;

  return sendEmail(to, subject, html, text);
};

const sendCampaignCreationEmail = async (to, brandName, campaignName, campaignId, budget, creatorCount, type) => {
  const subject = `Campaign Created Successfully — ${campaignName}`;
  const campaignUrl = `${process.env.ADMIN_URL || 'http://localhost:5174'}/campaigns/${campaignId}`;

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
        .success-badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #F47B20; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="success-badge">✅ CAMPAIGN CREATED</span>
          </div>
          
          <h2>Hello ${brandName},</h2>
          <p>Your campaign has been <strong>successfully created</strong> and is now being set up on Triple F Media.</p>
          
          <div class="info-box">
            <p><strong>📋 Campaign Name:</strong> ${campaignName}</p>
            <p><strong>🏢 Brand:</strong> ${brandName}</p>
            <p><strong>📊 Budget:</strong> ₹${budget?.toLocaleString?.() || budget}</p>
            <p><strong>👥 Creators Needed:</strong> ${creatorCount}</p>
            <p><strong>📱 Campaign Type:</strong> ${type}</p>
            <p><strong>🆔 Campaign ID:</strong> ${campaignId}</p>
          </div>
          
          <h3>What happens next?</h3>
          <ol>
            <li>Our team will shortlist creators matching your campaign requirements</li>
            <li>You'll receive a proposal with creator profiles within 24-48 hours</li>
            <li>Review and approve the creators you want to work with</li>
            <li>Make the brand payment to activate the campaign</li>
            <li>Creators start posting content according to the timeline</li>
          </ol>
          
          <p style="margin-top: 20px;">Questions? WhatsApp us at <strong>+919876543210</strong> or reply to this email.</p>
          
          <a href="${campaignUrl}" class="button">View Campaign Details</a>
        </div>
        <div class="footer">
          <p>Triple F Media — Reach Gen Z. For Real.</p>
          <p>© 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Campaign Created Successfully — ${campaignName}

Hello ${brandName},

Your campaign has been successfully created on Triple F Media.

Campaign Details:
- Campaign Name: ${campaignName}
- Budget: ₹${budget}
- Creators Needed: ${creatorCount}
- Campaign Type: ${type}
- Campaign ID: ${campaignId}

What happens next?
1. Our team will shortlist creators matching your requirements
2. You'll receive a proposal with creator profiles within 24-48 hours
3. Review and approve the creators you want to work with
4. Make the brand payment to activate the campaign
5. Creators start posting content according to the timeline

Questions? WhatsApp us at +919876543210

— Triple F Team`;

  return sendEmail(to, subject, html, text);
};

const sendProposalEmail = async (to, brandName, campaignName, campaignId, budget, creators, paymentLink) => {
  const subject = `Campaign Proposal Ready — Review & Pay | ${campaignName}`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://fff-media.vercel.app';
  const campaignUrl = `${frontendUrl}/brand-portal/campaigns/${campaignId}`;

  const creatorsListHtml = creators.map((c, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px;">${i + 1}</td>
      <td style="padding: 12px;">${c.name}</td>
      <td style="padding: 12px;">@${c.handle}</td>
      <td style="padding: 12px;">${c.platform}</td>
      <td style="padding: 12px;">${c.followers?.toLocaleString?.() || c.followers}</td>
      <td style="padding: 12px;">${c.engagementRate}%</td>
      <td style="padding: 12px;">₹${c.amount?.toLocaleString?.() || c.amount}</td>
    </tr>
  `).join('');

  const totalCreatorCost = creators.reduce((sum, c) => sum + Number(c.amount), 0);
  const triplefFee = Math.max(Number(budget) - totalCreatorCost, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: #1A3C8F; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .creators-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .creators-table th { background: #1A3C8F; color: white; padding: 12px; text-align: left; }
        .creators-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .summary-box { background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .pay-button { display: inline-block; padding: 16px 32px; background: #F47B20; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .razorpay-badge { background: #3395ff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Triple F Media</h1>
        </div>
        <div class="content">
          <h2>Hello ${brandName}, 👋</h2>
          <p>Your campaign proposal is <strong>ready for review</strong>! We've handpicked creators that match your requirements.</p>
          
          <div class="info-box">
            <h3>📋 Campaign Details</h3>
            <p><strong>Campaign Name:</strong> ${campaignName}</p>
            <p><strong>Brand:</strong> ${brandName}</p>
            <p><strong>Campaign ID:</strong> ${campaignId}</p>
            <p><strong>Total Creators:</strong> ${creators.length}</p>
          </div>

          <h3>🌟 Selected Creators</h3>
          <table class="creators-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Handle</th>
                <th>Platform</th>
                <th>Followers</th>
                <th>Engagement</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${creatorsListHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <h3>💰 Pricing Breakdown</h3>
            <p><strong>Creator Payments:</strong> ₹${totalCreatorCost.toLocaleString()}</p>
            <p><strong>Triple F Fee:</strong> ₹${triplefFee.toLocaleString()}</p>
            <p style="font-size: 20px; color: #1A3C8F; margin-top: 15px;">
              <strong>Total Amount: ₹${Number(budget).toLocaleString()}</strong>
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 16px; margin-bottom: 15px;">Ready to launch your campaign?</p>
            <a href="${paymentLink}" class="pay-button">PAY NOW via Razorpay →</a>
            <p style="margin-top: 10px;"><span class="razorpay-badge">🔒 Secured by Razorpay</span></p>
          </div>

          <p style="margin-top: 20px;"><strong>What's next?</strong></p>
          <ol>
            <li>Click the <strong>PAY NOW</strong> button above</li>
            <li>Complete payment via Razorpay (Credit/Debit Card, UPI, Net Banking)</li>
            <li>Once payment is confirmed, your campaign will go live within 24 hours</li>
            <li>Creators will start posting content according to the campaign timeline</li>
          </ol>

          <p style="margin-top: 20px;">Questions? WhatsApp us at <strong>+919876543210</strong> or reply to this email.</p>
          
          <a href="${campaignUrl}" style="color: #1A3C8F;">View Campaign Dashboard →</a>
        </div>
        <div class="footer">
          <p>Triple F Media — Reach Gen Z. For Real.</p>
          <p>© 2026 Triple F Media. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Campaign Proposal Ready — ${campaignName}

Hello ${brandName},

Your campaign proposal is ready for review! We've handpicked ${creators.length} creators that match your requirements.

CAMPAIGN DETAILS:
- Campaign Name: ${campaignName}
- Total Creators: ${creators.length}
- Total Budget: ₹${budget}

SELECTED CREATORS:
${creators.map((c, i) => `${i + 1}. ${c.name} (@${c.handle}) — ${c.platform} — ${c.followers} followers — Engagement: ${c.engagementRate}% — ₹${c.amount}`).join('\n')}

PRICING BREAKDOWN:
- Creator Payments: ₹${totalCreatorCost}
- Triple F Fee: ₹${triplefFee}
- Total: ₹${budget}

PAY NOW: ${paymentLink}

Questions? WhatsApp us at +919876543210

— Triple F Team`;

  return sendEmail(to, subject, html, text);
};

export default {
  sendEmail,
  sendProposal,
  sendReport,
  sendInvoice,
  sendApplicationConfirmation,
  sendBrandConfirmation,
  sendInternalCreatorApplicationAlert,
  sendBrandBriefConfirmation,
  sendInternalBrandLeadAlert,
  notifyOnboardingSpecialist,
  notifyCampaignManager,
  sendCreatorApprovalEmail,
  sendCreatorRejectionEmail,
  sendCampaignCreationEmail,
  sendProposalEmail,
  resolveRoleNotificationRecipients,
};
