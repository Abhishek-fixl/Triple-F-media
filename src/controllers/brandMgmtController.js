import Brand from '../models/Brand.js';
import Campaign from '../models/Campaign.js';
import BrandLead from '../models/BrandLead.js';
import {
  ApiError,
  asyncHandler,
  buildPagination,
  createAuditLog,
  sendSuccess,
} from '../utils/helpers.js';

const allowedBrandFields = [
  'brandName', 'legalName', 'contactName', 'email', 'phone', 'whatsapp', 'website',
  'industry', 'city', 'description',
  'preferredNiches', 'preferredFormats', 'preferredCampaignTypes',
  'targetAgeGroup', 'targetGender', 'targetCities',
  'budgetRangeMin', 'budgetRangeMax',
  'gstin', 'pan', 'billingContactName', 'billingContactEmail',
  'status', 'healthScore', 'assignedTo', 'accountManager',
  'tags', 'repeatClient',
];

export const listBrands = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.industry) filter.industry = new RegExp(req.query.industry, 'i');
  if (req.query.search) {
    filter.$or = [
      { brandName: new RegExp(req.query.search, 'i') },
      { contactName: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
    ];
  }

  const sortMap = {
    latest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    spend: { totalSpend: -1 },
    health: { healthScore: -1 },
    campaigns: { totalCampaigns: -1 },
  };
  const sort = sortMap[req.query.sort] || { createdAt: -1 };

  const [brands, total] = await Promise.all([
    Brand.find(filter).sort(sort).skip(skip).limit(limit).populate('assignedTo', 'name email role'),
    Brand.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { brands, pagination: buildPagination({ page, limit, total }) });
});

export const createBrand = asyncHandler(async (req, res) => {
  const existing = await Brand.findOne({ email: req.body.email?.toLowerCase() });
  if (existing) throw new ApiError(409, 'Brand with this email already exists', 'BRAND_EXISTS');

  const brand = await Brand.create(req.body);

  await createAuditLog({
    req,
    user: req.user,
    action: 'create_brand',
    module: 'brands',
    recordId: brand._id,
    details: { brandName: brand.brandName },
  });

  sendSuccess(res, 201, { brand }, 'Brand created successfully');
});

export const getBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id)
    .populate('assignedTo', 'name email role')
    .populate('accountManager.userId', 'name email');
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');
  sendSuccess(res, 200, { brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  allowedBrandFields.forEach(f => {
    if (req.body[f] !== undefined) brand[f] = req.body[f];
  });
  await brand.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'update_brand',
    module: 'brands',
    recordId: brand._id,
    details: { updatedFields: Object.keys(req.body) },
  });

  sendSuccess(res, 200, { brand }, 'Brand updated successfully');
});

export const patchBrandStatus = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  brand.status = req.body.status;
  await brand.save();

  sendSuccess(res, 200, { brand }, 'Brand status updated');
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  // Block delete if brand has campaigns
  if (brand.totalCampaigns > 0) {
    throw new ApiError(400, 'Cannot delete brand with existing campaigns', 'BRAND_HAS_CAMPAIGNS');
  }

  await brand.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Brand deleted successfully');
});

// Phase 16: Add communication
export const addCommunication = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  const { type, direction, subject, content } = req.body;
  if (!type) throw new ApiError(400, 'Communication type is required', 'VALIDATION_ERROR');

  brand.communications.push({
    type,
    direction: direction || 'outbound',
    subject,
    content,
    author: req.user.name,
    authorId: req.user._id,
    date: new Date(),
  });

  // Log activity
  brand.activityLog.push({
    action: 'communication_added',
    description: `${type} communication added: ${subject || '(no subject)'}`,
    by: req.user.name,
    byId: req.user._id,
  });

  await brand.save();
  sendSuccess(res, 201, { communications: brand.communications }, 'Communication added');
});

// Phase 16: Add internal note
export const addInternalNote = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  const { text, pinned } = req.body;
  if (!text?.trim()) throw new ApiError(400, 'Note text is required', 'VALIDATION_ERROR');

  brand.internalNotes.push({
    text: text.trim(),
    author: req.user.name,
    authorId: req.user._id,
    date: new Date(),
    pinned: pinned || false,
  });

  // Log activity
  brand.activityLog.push({
    action: 'note_added',
    description: 'Internal note added',
    by: req.user.name,
    byId: req.user._id,
  });

  await brand.save();

  // Return pinned notes first
  const sorted = [...brand.internalNotes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  sendSuccess(res, 201, { internalNotes: sorted }, 'Note added');
});

// Phase 16: Delete internal note
export const deleteInternalNote = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  const idx = brand.internalNotes.findIndex(
    n => n._id?.toString() === req.params.noteId
  );
  if (idx === -1) throw new ApiError(404, 'Note not found', 'NOT_FOUND');

  brand.internalNotes.splice(idx, 1);
  await brand.save();

  sendSuccess(res, 200, { internalNotes: brand.internalNotes }, 'Note deleted');
});

// Phase 28: Get brand campaigns
export const getBrandCampaigns = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  // Phase 28 fix: match by brandId (exact) OR brandName (fallback for old campaigns)
  const campaigns = await Campaign.find({
    $or: [
      { brandId: brand._id },
      { brandName: brand.brandName },
    ],
  })
    .sort({ createdAt: -1 })
    .select('campaignName brandName type status budget creatorCount timelineStart timelineEnd totalCreatorCost triplefFee brandPaymentStatus phase createdAt');

  sendSuccess(res, 200, { campaigns, total: campaigns.length });
});

// Phase 28: Get brand leads/briefs
export const getBrandLeadsForBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  const leads = await BrandLead.find({ email: brand.email })
    .sort({ createdAt: -1 })
    .select('brandName contactName email campaignGoal budget timeline targetAudience status priority createdAt convertedAt lostReason');

  sendSuccess(res, 200, { leads, total: leads.length });
});

// Phase 28: Get brand billing summary
export const getBrandBilling = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found', 'BRAND_NOT_FOUND');

  // Get all campaigns for this brand
  const campaigns = await Campaign.find({ brandName: brand.brandName })
    .select('campaignName budget brandPaymentStatus brandPaymentAmount brandPaymentReceivedAt totalCreatorCost triplefFee createdAt');

  const totalBilled   = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalReceived = campaigns.reduce((s, c) => s + (c.brandPaymentAmount || 0), 0);
  const totalPending  = totalBilled - totalReceived;

  sendSuccess(res, 200, {
    billing: {
      gstin: brand.gstin,
      pan: brand.pan,
      billingContactName: brand.billingContactName,
      billingContactEmail: brand.billingContactEmail,
      totalBilled,
      totalReceived,
      totalPending,
      campaigns: campaigns.map(c => ({
        id: c._id,
        name: c.campaignName,
        budget: c.budget,
        paymentStatus: c.brandPaymentStatus,
        receivedAmount: c.brandPaymentAmount || 0,
        date: c.createdAt,
      })),
    },
  });
});
