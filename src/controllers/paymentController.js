import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import NotificationLog from '../models/NotificationLog.js';
import Payment from '../models/Payment.js';
import Campaign from '../models/Campaign.js';
import emailService from '../services/emailService.js';
import invoiceService from '../services/invoiceService.js';
import paymentService from '../services/paymentService.js';
import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';
import { ApiError, asyncHandler, buildPagination, createAuditLog, sendSuccess } from '../utils/helpers.js';

export const listPayments = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = req.query.status ? { status: req.query.status } : { status: { $in: ['pending', 'processing', 'paid'] } };

  const sort = {};
  sort[sortBy] = sortOrder;

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  const pendingAssignments = await CampaignCreator.find(
    req.query.status && req.query.status !== 'pending'
      ? { _id: null }
      : {
          paymentStatus: { $in: ['pending', 'processing'] },
          postStatus: 'live',
          paymentId: { $exists: false },
        },
  ).populate('creatorId campaignId');

  sendSuccess(res, 200, {
    payments,
    pendingAssignments: pendingAssignments.map((assignment) => ({
      assignmentId: assignment._id,
      creatorId: assignment.creatorId?._id,
      creatorName: assignment.creatorName,
      campaignId: assignment.campaignId?._id,
      campaignName: assignment.campaignId?.campaignName,
      amount: assignment.amount,
      upiId: assignment.creatorId?.upiId || null,
    })),
    pagination: buildPagination({ page, limit, total }),
  });
});

// Fire-and-forget payment processing
const processPaymentAsync = async (assignment, creator, campaign, payment, req) => {
  try {
    const tdsDeducted = Number((assignment.amount * 0.1).toFixed(2));
    const netAmount = Number((assignment.amount - tdsDeducted).toFixed(2));
    
    // Try to process Razorpay payment
    let upiPayment = null;
    try {
      upiPayment = await paymentService.createUpiPayment(creator.upiId, netAmount, {
        campaignName: campaign.campaignName,
        creatorName: creator.name,
      });
    } catch (razorpayError) {
      logger.warn('Razorpay payment failed, marking as failed', {
        error: razorpayError.message,
        creatorId: creator._id.toString(),
        assignmentId: assignment._id.toString(),
      });
      
      payment.status = 'failed';
      payment.error = razorpayError.message;
      await payment.save();
      
      assignment.paymentStatus = 'failed';
      await assignment.save();
      return;
    }

    // Update payment as paid
    payment.status = 'paid';
    payment.razorpayOrderId = upiPayment.orderId;
    payment.tdsDeducted = tdsDeducted;
    payment.netAmount = netAmount;
    payment.paidAt = new Date();
    await payment.save();

    // Generate invoice
    let invoice = null;
    try {
      invoice = await invoiceService.generateInvoice(creator, campaign, payment);
      payment.invoiceUrl = invoice.pdfUrl;
      await payment.save();
    } catch (error) {
      logger.warn('Invoice generation failed', { 
        paymentId: payment._id.toString(), 
        error: error.message 
      });
    }

    // Update assignment
    assignment.paymentId = payment._id;
    assignment.paymentStatus = 'paid';
    assignment.paidAt = new Date();
    await assignment.save();

    // Update creator earnings
    creator.totalEarnings += payment.amount;
    creator.totalCampaigns += 1;
    await creator.save();

    // Send WhatsApp notification
    try {
      await whatsappService.sendPaymentConfirmation(creator, payment.netAmount, campaign);
    } catch (error) {
      logger.warn('Payment processed but WhatsApp confirmation failed', {
        paymentId: payment._id.toString(),
        creatorId: creator._id.toString(),
        error: error.message,
      });
    }

    // Send email with invoice
    try {
      if (invoice) {
        const response = await emailService.sendInvoice(creator, invoice);
        await NotificationLog.create({
          channel: 'email',
          recipient: creator.email || process.env.ADMIN_EMAIL,
          subject: `Invoice ${invoice.invoiceNumber}`,
          message: 'Invoice email',
          status: response?.skipped ? 'failed' : 'sent',
          provider: response?.provider || null,
          providerMessageId: response?.id || null,
          module: 'payments',
          referenceId: payment._id,
        });
      }
    } catch (error) {
      logger.warn('Invoice email failed', { 
        paymentId: payment._id.toString(), 
        error: error.message 
      });
    }

    // Create audit log
    await createAuditLog({
      req,
      user: req.user,
      action: 'payment_processed',
      module: 'payments',
      recordId: payment._id,
      details: { 
        creatorId: creator._id.toString(),
        amount: payment.amount,
        netAmount: payment.netAmount,
        tdsDeducted: payment.tdsDeducted,
      },
    });

  } catch (error) {
    logger.error('Payment processing failed', {
      error: error.message,
      assignmentId: assignment._id.toString(),
    });
    
    try {
      payment.status = 'failed';
      payment.error = error.message;
      await payment.save();
      
      assignment.paymentStatus = 'failed';
      await assignment.save();
    } catch (saveError) {
      logger.error('Failed to save error state', { error: saveError.message });
    }
  }
};

export const processPayments = asyncHandler(async (req, res) => {
  const assignmentIds = req.body.assignmentIds || [];
  if (!Array.isArray(assignmentIds) || !assignmentIds.length) {
    throw new ApiError(400, 'assignmentIds is required', 'MISSING_ASSIGNMENTS');
  }

  const processed = [];
  const failed = [];

  for (const assignmentId of assignmentIds) {
    const assignment = await CampaignCreator.findById(assignmentId);
    if (!assignment) {
      failed.push({ assignmentId, error: 'Assignment not found' });
      continue;
    }

    if (assignment.postStatus !== 'live') {
      failed.push({ assignmentId, error: 'Only live posts are eligible for payment processing' });
      continue;
    }

    const creator = await Creator.findById(assignment.creatorId);
    if (!creator?.upiId) {
      failed.push({ assignmentId, error: `Creator ${creator?.name || assignment.creatorName} is missing UPI ID` });
      continue;
    }

    const campaign = await Campaign.findById(assignment.campaignId);

    // Check if already paid
    const existingPayment = await Payment.findOne({ campaignCreatorId: assignment._id });
    if (existingPayment?.status === 'paid' || assignment.paymentStatus === 'paid') {
      failed.push({ assignmentId, error: 'Assignment has already been paid' });
      continue;
    }

    // Create payment record with processing status
    const tdsDeducted = Number((assignment.amount * 0.1).toFixed(2));
    const netAmount = Number((assignment.amount - tdsDeducted).toFixed(2));
    
    let payment;
    if (existingPayment) {
      payment = existingPayment;
      payment.status = 'processing';
      await payment.save();
    } else {
      payment = await Payment.create({
        campaignCreatorId: assignment._id,
        creatorId: creator._id,
        creatorName: creator.name,
        campaignName: campaign.campaignName,
        amount: assignment.amount,
        upiId: creator.upiId,
        status: 'processing',
        tdsDeducted,
        netAmount,
      });
    }

    // Update assignment status
    assignment.paymentId = payment._id;
    assignment.paymentStatus = 'processing';
    await assignment.save();

    // Add to processed list (response will include these)
    processed.push({
      paymentId: payment._id,
      assignmentId: assignment._id,
      creatorName: creator.name,
      amount: assignment.amount,
      netAmount: netAmount,
      tdsDeducted: tdsDeducted,
      status: 'processing',
    });

    // Process actual payment asynchronously (fire and forget)
    processPaymentAsync(assignment, creator, campaign, payment, req);
  }

  sendSuccess(res, 200, { 
    processed, 
    failed,
    message: `${processed.length} payments initiated for processing. They will be processed asynchronously.`,
  }, 'Payments initiated successfully');
});

export const bulkProcessPayments = processPayments;

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  sendSuccess(res, 200, { payment });
});

export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  if (payment.status !== 'failed') throw new ApiError(400, 'Only failed payments can be deleted', 'PAYMENT_DELETE_NOT_ALLOWED');
  await payment.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Failed payment deleted successfully');
});
