export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  CAMPAIGN_MANAGER: 'campaign_manager',
  FINANCE_MANAGER: 'finance_manager',
  ONBOARDING_SPECIALIST: 'onboarding_specialist',
};

export const USER_ROLE_VALUES = Object.values(USER_ROLES);

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'on_hold'];
export const CREATOR_PLATFORMS = ['instagram', 'youtube', 'moj', 'josh', 'linkedin', 'other'];
export const CREATOR_NICHES = [
  'beauty',
  'tech',
  'finance',
  'gaming',
  'lifestyle',
  'food',
  'fitness',
  'comedy',
  'travel',
  'other',
];
export const FOLLOWER_BUCKETS = ['5k-10k', '10k-50k', '50k-200k', '200k+'];
export const CREATOR_STATUSES = ['active', 'inactive', 'on_hold', 'priority'];

export const BRAND_CAMPAIGN_GOALS = ['awareness', 'sales', 'ugc', 'engagement', 'event'];
export const BRAND_CAMPAIGN_GOAL_ALIASES = {
  'brand_awareness': 'awareness',
  'awareness': 'awareness',
  'product_launch': 'awareness',
  'app_installs': 'engagement',
  'lead_generation': 'engagement',
  'sales_conversion': 'sales',
  'sales': 'sales',
  'conversion': 'sales',
  'ecommerce': 'sales',
  'user_generated_content': 'ugc',
  'ugc': 'ugc',
  'content': 'ugc',
  'engagement': 'engagement',
  'event': 'event',
  'event_promotion': 'event',
};
export const BRAND_BUDGET_BUCKETS = ['50k-2l', '2l-5l', '5l-10l', '10l+'];
export const BRAND_BUDGET_ALIASES = {
  // Exact matches (lowercase)
  '50k-2l': '50k-2l',
  '2l-5l': '2l-5l',
  '5l-10l': '5l-10l',
  '10l+': '10l+',
  // Exact matches (uppercase L)
  '50k-2L': '50k-2l',
  '2L-5L': '2l-5l',
  '5L-10L': '5l-10l',
  '10L+': '10l+',
  // Variations with spaces (lowercase)
  '50k - 2l': '50k-2l',
  '2l - 5l': '2l-5l',
  '5l - 10l': '5l-10l',
  // Variations with spaces (uppercase)
  '50k - 2L': '50k-2l',
  '2L - 5L': '2l-5l',
  '5L - 10L': '5l-10l',
  '10L - 25L': '10l+',
  // Variations with rupee symbol (lowercase l)
  '₹50k-₹2l': '50k-2l',
  '₹2l-₹5l': '2l-5l',
  '₹5l-₹10l': '5l-10l',
  '₹10l+': '10l+',
  '₹50k - ₹2l': '50k-2l',
  '₹2l - ₹5l': '2l-5l',
  '₹5l - ₹10l': '5l-10l',
  // Variations with rupee symbol (uppercase L)
  '₹50k-₹2L': '50k-2l',
  '₹2L-₹5L': '2l-5l',
  '₹5L-₹10L': '5l-10l',
  '₹10L+': '10l+',
  '₹50k - ₹2L': '50k-2l',
  '₹2L - ₹5L': '2l-5l',
  '₹5L - ₹10L': '5l-10l',
  '₹10L - ₹25L': '10l+',
  // Collection formats with spaces and uppercase
  '₹50k - ₹2L': '50k-2l',
  '₹2L - ₹5L': '2l-5l',
  '₹5L - ₹10L': '5l-10l',
  // Common text formats
  'under 50k': '50k-2l',
  'under ₹50k': '50k-2l',
  'under ₹50K': '50k-2l',
  '50k to 2l': '50k-2l',
  '50k to 2L': '50k-2l',
  '50k-1l': '50k-2l',
  '50k-1L': '50k-2l',
  '1l-2l': '50k-2l',
  '1L-2L': '50k-2l',
  '1l-5l': '2l-5l',
  '1L-5L': '2l-5l',
  '2l to 5l': '2l-5l',
  '2L to 5L': '2l-5l',
  '5l to 10l': '5l-10l',
  '5L to 10L': '5l-10l',
  '10l plus': '10l+',
  '10L plus': '10l+',
  '10L+': '10l+',
  '10l-25l': '10l+',
  '10L-25L': '10l+',
  'above 10l': '10l+',
  'above 10L': '10l+',
  // Bucket formats with spaces (all variants)
  '50k - 2l': '50k-2l',
  '50k - 2L': '50k-2l',
  '1l - 2l': '50k-2l',
  '1L - 2L': '50k-2l',
  '1l - 5l': '2l-5l',
  '1L - 5L': '2l-5l',
  '2l - 5l': '2l-5l',
  '2L - 5L': '2l-5l',
  '5l - 10l': '5l-10l',
  '5L - 10L': '5l-10l',
  '10l - 25l': '10l+',
  '10L - 25L': '10l+',
};
export const BRAND_LEAD_STATUSES = ['new', 'contacted', 'proposal_sent', 'converted', 'lost'];

export const CAMPAIGN_TYPES = ['sponsored_post', 'live', 'ambassador', 'ugc', 'event'];
export const CAMPAIGN_STATUSES = ['draft', 'active', 'content_review', 'completed', 'cancelled'];
export const BRAND_PAYMENT_STATUSES = ['pending', 'received'];
export const CAMPAIGN_CREATOR_STATUSES = ['invited', 'accepted', 'declined', 'confirmed'];
export const CONTENT_STATUSES = ['pending', 'submitted', 'under_review', 'approved', 'revision_requested'];
export const POST_STATUSES = ['pending', 'live'];
export const PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'failed'];

export const LEAD_TYPES = ['creator', 'brand'];
export const LEAD_SOURCES = ['calculator', 'chat', 'form', 'referral'];
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

// Phase 1: New Enums for Enhanced Backend
export const AVAILABILITY_STATUSES = ['available', 'busy', 'on_break'];

// Phase 5: Content Preferences
export const CONTENT_FORMATS = ['Reels', 'Stories', 'Posts', 'Long-form', 'Shorts'];
export const CONTENT_STYLES = ['Entertainment', 'Educational', 'Lifestyle', 'Review', 'Tutorial'];

export const CAMPAIGN_PHASES = ['N/A', 'Planning', 'Creator Selection', 'Content Submission', 'Live', 'Finished', 'Archived'];

export const LEAD_PRIORITIES = ['hot', 'warm', 'cold'];

export const TICKET_CATEGORIES = ['Payment', 'Content', 'Campaign', 'Billing', 'Account', 'Technical', 'General'];

export const TICKET_STATUSES = ['open', 'in_progress', 'escalated', 'resolved', 'closed', 'reopened'];

export const NOTIFICATION_TYPES = [
  'campaign_invite',
  'payment_approved',
  'payment_received',
  'content_approved',
  'revision_requested',
  'content_review',
  'campaign_live',
  'general'
];

export const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];

export const BRAND_STATUSES = ['active', 'lead', 'on_hold', 'churned', 'blacklisted'];

export const CAMPAIGN_GOALS_EXTENDED = ['awareness', 'sales', 'ugc', 'engagement', 'event', 'launch', 'app_installs', 'retargeting'];
