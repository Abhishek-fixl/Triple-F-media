import mongoose from 'mongoose';

import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
} from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const messageSchema = new mongoose.Schema(
  {
    from:       { type: String, required: true, trim: true },
    fromId:     { type: ObjectId },
    role:       { type: String, enum: ['user', 'admin', 'system'], required: true },
    text:       { type: String, required: true, trim: true },
    time:       { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
    read:       { type: Boolean, default: false },
  },
  { _id: true },
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    by:     { type: String, required: true, trim: true },
    byId:   { type: ObjectId, ref: 'User' },
    time:   { type: Date, default: Date.now },
  },
  { _id: true },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const supportTicketSchema = new mongoose.Schema(
  {
    // Ticket identity
    ticketId: { type: String, required: true, unique: true, index: true },

    subject:  { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
    },

    // Requester
    fromType:  { type: String, enum: ['Creator', 'Brand'], required: true },
    fromId:    { type: ObjectId },
    fromName:  { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, trim: true, lowercase: true },
    fromPhone: { type: String, trim: true },

    // Description
    description: { type: String, required: true, trim: true },

    // Status & priority
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    // Assignment
    assignedTo:     { type: ObjectId, ref: 'User' },
    assignedToName: { type: String, trim: true },

    // Linked entities
    linkedCampaignId:   { type: ObjectId, ref: 'Campaign' },
    linkedCampaignName: { type: String, trim: true },
    linkedPaymentId:    { type: ObjectId, ref: 'Payment' },

    // SLA
    slaHours:    { type: Number, default: 24 },
    slaDeadline: { type: Date },
    slaBreached: { type: Boolean, default: false },

    // Timeline
    firstResponseAt: { type: Date },
    resolvedAt:      { type: Date },
    reopenedAt:      { type: Date },
    lastActivityAt:  { type: Date, default: Date.now },

    // Resolution
    resolution:      { type: String, trim: true },
    escalationReason:{ type: String, trim: true },
    escalatedTo:     { type: ObjectId, ref: 'User' },

    // Rating
    rating: { type: Number, min: 1, max: 5 },

    // Embedded arrays
    messages:    [messageSchema],
    activityLog: [activitySchema],

    // Unread tracking (admin-side unread count)
    unreadCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ fromType: 1, fromId: 1 });
supportTicketSchema.index({ createdAt: -1 });

// ── Pre-save: auto ticketId + SLA deadline + breach check ─────────────────────

supportTicketSchema.pre('save', async function (next) {
  // Auto-generate ticketId (TKT001, TKT002 …)
  if (this.isNew && !this.ticketId) {
    try {
      const count = await mongoose.model('SupportTicket').countDocuments();
      this.ticketId = `TKT${String(count + 1).padStart(3, '0')}`;
    } catch (err) {
      return next(err);
    }
  }

  // Set SLA deadline on creation
  if (this.isNew && !this.slaDeadline) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (this.slaHours || 24));
    this.slaDeadline = deadline;
  }

  // Check SLA breach (only for unresolved tickets)
  if (this.status !== 'resolved' && this.slaDeadline && new Date() > this.slaDeadline) {
    this.slaBreached = true;
  }

  // Update lastActivityAt
  this.lastActivityAt = new Date();

  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Add a message to the ticket.
 * @param {object} opts - { from, fromId, role, text, isInternal }
 */
supportTicketSchema.methods.addMessage = function (opts) {
  const msg = {
    from:       opts.from,
    fromId:     opts.fromId,
    role:       opts.role || 'admin',
    text:       opts.text,
    isInternal: opts.isInternal || false,
    read:       false,
    time:       new Date(),
  };

  this.messages.push(msg);

  // Track first admin response
  if (msg.role === 'admin' && !this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }

  // Increment unread count for non-internal messages
  if (!msg.isInternal) {
    this.unreadCount = (this.unreadCount || 0) + 1;
  }

  // Move to in_progress if still open
  if (this.status === 'open' && msg.role === 'admin') {
    this.status = 'in_progress';
    this.activityLog.push({
      action: 'status_changed',
      by:     opts.from,
      byId:   opts.fromId,
      time:   new Date(),
    });
  }
};

/**
 * Assign ticket to an admin user.
 * @param {object} opts - { userId, userName, byName, byId }
 */
supportTicketSchema.methods.assign = function (opts) {
  this.assignedTo     = opts.userId;
  this.assignedToName = opts.userName;

  this.activityLog.push({
    action: `assigned_to_${opts.userName}`,
    by:     opts.byName,
    byId:   opts.byId,
    time:   new Date(),
  });

  if (this.status === 'open') {
    this.status = 'in_progress';
  }
};

/**
 * Escalate the ticket.
 * @param {object} opts - { reason, escalatedTo, byName, byId }
 */
supportTicketSchema.methods.escalate = function (opts) {
  this.status           = 'escalated';
  this.escalationReason = opts.reason;
  this.escalatedTo      = opts.escalatedTo;

  this.activityLog.push({
    action: 'escalated',
    by:     opts.byName,
    byId:   opts.byId,
    time:   new Date(),
  });
};

/**
 * Resolve the ticket.
 * @param {object} opts - { resolution, byName, byId }
 */
supportTicketSchema.methods.resolve = function (opts) {
  this.status     = 'resolved';
  this.resolution = opts.resolution;
  this.resolvedAt = new Date();

  this.activityLog.push({
    action: 'resolved',
    by:     opts.byName,
    byId:   opts.byId,
    time:   new Date(),
  });
};

/**
 * Reopen a resolved ticket.
 * @param {object} opts - { byName, byId }
 */
supportTicketSchema.methods.reopen = function (opts) {
  this.status     = 'open';
  this.resolvedAt = undefined;
  this.reopenedAt = new Date();

  this.activityLog.push({
    action: 'reopened',
    by:     opts.byName,
    byId:   opts.byId,
    time:   new Date(),
  });
};

export default mongoose.model('SupportTicket', supportTicketSchema);
