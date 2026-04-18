import Lead from '../models/Lead.js';
import { ApiError, asyncHandler, buildPagination, sendSuccess } from '../utils/helpers.js';

export const listLeads = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = req.query.status ? { status: req.query.status } : { status: { $ne: 'converted' } };

  const sort = {};
  sort[sortBy] = sortOrder;

  const [leads, total] = await Promise.all([
    Lead.find(filter).populate('assignedTo', 'name email role').sort(sort).skip(skip).limit(limit),
    Lead.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { leads, pagination: buildPagination({ page, limit, total }) });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');

  if (req.body.status) lead.status = req.body.status;
  if (req.body.notes !== undefined) lead.notes = req.body.notes;
  if (req.body.assignedTo !== undefined) lead.assignedTo = req.body.assignedTo || null;
  await lead.save();

  sendSuccess(res, 200, { lead }, 'Lead updated successfully');
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  await lead.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Lead deleted successfully');
});
