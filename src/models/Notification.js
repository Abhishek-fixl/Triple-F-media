import mongoose from 'mongoose';

import { NOTIFICATION_TYPES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// Notification urgency levels → drives icon color in UI
const URGENCY_LEVELS = ['action_required', 'informational', 'positive', 'warning'];

// Default color per notification type (used when no custom color is set)
const TYPE_COLOR_MAP = {
  campaign_invite:    '#1A3C8F', // brand blue
  payment_approved:   '#16A34A', // green
  payment_received:   '#16A34A', // green
  content_approved:   '#16A34A', // green
  revision_requested: '#D97706', // amber
  content_review:     '#D97706', // amber
  campaign_live:      '#7C3AED', // purple
  general:            '#1A3C8F', // brand blue
};

// Default icon per notification type
const TYPE_ICON_MAP = {
  campaign_invite:    'megaphone',
  payment_approved:   'check-circle',
  payment_received:   'banknote',
  content_approved:   'check-circle',
  revision_requested: 'pencil',
  content_review:     'eye',
  campaign_live:      'zap',
  general:            'bell',
};

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipientType: {
      type: String,
      enum: ['User', 'Creator', 'Brand'],
      required: true,
      index: true,
    },
    recipientId: {
      type: ObjectId,
      required: true,
      index: true,
    },

    // Notification type & urgency
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    urgency: {
      type: String,
      enum: URGENCY_LEVELS,
      default: 'informational',
    },

    // Content
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    detail:  { type: String, trim: true },

    // Display
    icon:  { type: String, default: 'bell', trim: true },
    color: { type: String, default: '#1A3C8F', trim: true },

    // Action link
    link:     { type: String, trim: true },
    ctaLabel: { type: String, default: 'View', trim: true },

    // Related entity (for deep-linking)
    relatedModule: { type: String, trim: true }, // 'Campaign', 'Payment', 'Creator', etc.
    relatedId:     { type: ObjectId },

    // Read state
    read:   { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ── Compound indexes ──────────────────────────────────────────────────────────

// Most common query: get unread notifications for a recipient
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

// Badge count query: count unread per recipient
notificationSchema.index({ recipientType: 1, recipientId: 1, read: 1 });

// ── Pre-save: auto-set icon & color from type if not provided ─────────────────

notificationSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.icon || this.icon === 'bell') {
      this.icon = TYPE_ICON_MAP[this.type] || 'bell';
    }
    if (!this.color || this.color === '#1A3C8F') {
      this.color = TYPE_COLOR_MAP[this.type] || '#1A3C8F';
    }
  }
  next();
});

// ── Static helper: create a notification quickly ──────────────────────────────

/**
 * Quick factory — creates & saves a notification in one call.
 *
 * @param {object} opts
 * @param {'User'|'Creator'|'Brand'} opts.recipientType
 * @param {ObjectId|string} opts.recipientId
 * @param {string} opts.type          - one of NOTIFICATION_TYPES
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {object} [opts.extra]       - optional overrides (detail, link, ctaLabel, urgency, relatedModule, relatedId)
 * @returns {Promise<Document>}
 */
notificationSchema.statics.createNotification = async function (opts) {
  const doc = new this({
    recipientType:  opts.recipientType,
    recipientId:    opts.recipientId,
    type:           opts.type,
    title:          opts.title,
    message:        opts.message,
    detail:         opts.extra?.detail,
    link:           opts.extra?.link,
    ctaLabel:       opts.extra?.ctaLabel,
    urgency:        opts.extra?.urgency,
    relatedModule:  opts.extra?.relatedModule,
    relatedId:      opts.extra?.relatedId,
    icon:           opts.extra?.icon,
    color:          opts.extra?.color,
  });
  return doc.save();
};

/**
 * Get unread count for a recipient.
 * @param {ObjectId|string} recipientId
 * @returns {Promise<number>}
 */
notificationSchema.statics.getUnreadCount = function (recipientId) {
  return this.countDocuments({ recipientId, read: false });
};

/**
 * Mark all notifications as read for a recipient.
 * @param {ObjectId|string} recipientId
 * @returns {Promise}
 */
notificationSchema.statics.markAllRead = function (recipientId) {
  return this.updateMany(
    { recipientId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );
};

export default mongoose.model('Notification', notificationSchema);
