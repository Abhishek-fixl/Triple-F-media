# Triple F Media Backend API

Base URL:

```text
http://localhost:5000
```

API Prefix:

```text
http://localhost:5000/api
```

Postman collection:

```text
TripleF-Backend.postman_collection.json
```

## Response Contract

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Error:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

Validation error:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "bad"
    }
  ]
}
```

## Postman Variables

Use these collection variables:

```text
base_url=http://localhost:5000
api_url=http://localhost:5000/api
admin_email=admin@triplef.com
admin_password=Admin@123
campaign_manager_email=campaign.manager@triplef.com
campaign_manager_password=Manager@123
finance_manager_email=finance.manager@triplef.com
finance_manager_password=Finance@123
onboarding_email=onboarding.specialist@triplef.com
onboarding_password=Onboard@123
admin_token=
brand_token=
creator_token=
application_id=
creator_id=
brand_lead_id=
campaign_id=
assignment_id=
payment_id=
lead_id=
user_id=
notification_id=
file_public_id=
chat_session_id=session_postman_demo
```

## Auth Notes

- Admin auth works with cookie or `Authorization: Bearer {{admin_token}}`
- Brand portal auth uses `Authorization: Bearer {{brand_token}}`
- Creator portal auth uses `Authorization: Bearer {{creator_token}}`
- Webhooks use secret headers, not JWT
- Multipart routes should be sent as `form-data`

## Seeded Admin Accounts

Super admin:

```json
{
  "email": "admin@triplef.com",
  "password": "Admin@123"
}
```

Campaign manager:

```json
{
  "email": "campaign.manager@triplef.com",
  "password": "Manager@123"
}
```

Finance manager:

```json
{
  "email": "finance.manager@triplef.com",
  "password": "Finance@123"
}
```

Onboarding specialist:

```json
{
  "email": "onboarding.specialist@triplef.com",
  "password": "Onboard@123"
}
```

## Quick Test Order

1. `GET /api/health`
2. `POST /api/chat/send`
3. `POST /api/creators/apply`
4. `POST /api/brands/submit-brief`
5. `POST /api/auth/login`
6. `GET /api/admin/applications`
7. `POST /api/admin/applications/:id/approve`
8. `GET /api/admin/creators`
9. `POST /api/admin/campaigns`
10. `GET /api/admin/payments`
11. `POST /api/admin/payments/process`
12. `GET /api/admin/reports/campaign/:campaignId`

## Route Inventory

| Area | Methods |
|---|---|
| Health | `GET /api/health` |
| Admin Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Public Creator | `POST /api/creators/apply`, `GET /api/creators/calculator` |
| Public Brand | `POST /api/brands/submit-brief`, `POST /api/brands/brief` |
| Chat | `POST /api/chat/send`, `POST /api/chat/capture-lead`, `GET /api/chat/history/:sessionId` |
| Admin Dashboard | `GET /api/admin/dashboard` |
| Admin Applications | `GET /api/admin/applications`, `GET /api/admin/applications/:id`, `POST /api/admin/applications/:id/approve`, `POST /api/admin/applications/:id/reject`, `POST /api/admin/applications/bulk-approve`, `DELETE /api/admin/applications/:id` |
| Admin Creators | `GET /api/admin/creators`, `GET /api/admin/creators/:id`, `PUT /api/admin/creators/:id`, `PATCH /api/admin/creators/:id/status`, `POST /api/admin/creators/:id/tags`, `POST /api/admin/creators/bulk-tag`, `DELETE /api/admin/creators/:id` |
| Admin Campaigns | `POST /api/admin/campaigns`, `GET /api/admin/campaigns`, `GET /api/admin/campaigns/suggest`, `GET /api/admin/campaigns/:id`, `PUT /api/admin/campaigns/:id`, `PATCH /api/admin/campaigns/:id/status`, `DELETE /api/admin/campaigns/:id`, `POST /api/admin/campaigns/:id/send-briefs`, `POST /api/admin/campaigns/bulk-send-briefs`, `POST /api/admin/campaigns/:campaignId/creators/:creatorId/approve-content`, `POST /api/admin/campaigns/:campaignId/creators/:creatorId/revision-content`, `POST /api/admin/campaigns/:campaignId/creators/:creatorId/mark-live`, `PATCH /api/admin/campaigns/:campaignId/creators/:creatorId/payment-status`, `POST /api/admin/campaigns/:id/complete` |
| Admin Payments | `GET /api/admin/payments`, `POST /api/admin/payments/process`, `POST /api/admin/payments/bulk-process`, `DELETE /api/admin/payments/:id` |
| Admin Leads | `GET /api/admin/leads`, `PUT /api/admin/leads/:id`, `DELETE /api/admin/leads/:id` |
| Admin Users | `GET /api/admin/users`, `POST /api/admin/users`, `DELETE /api/admin/users/:id` |
| Admin Audit | `GET /api/admin/audit-logs` |
| Admin Reports | `GET /api/admin/reports/campaign/:campaignId` |
| Admin Analytics | `GET /api/admin/analytics/overview`, `GET /api/admin/analytics/creators`, `GET /api/admin/analytics/campaigns`, `GET /api/admin/analytics/revenue`, `GET /api/admin/analytics/top-creators`, `GET /api/admin/analytics/top-brands` |
| Admin Notifications | `GET /api/admin/notifications/failed`, `POST /api/admin/notifications/retry-whatsapp/:id`, `POST /api/admin/notifications/retry-email/:id` |
| Admin WhatsApp | `POST /api/admin/whatsapp/test` |
| Files | `POST /api/admin/upload/brief`, `GET /api/admin/files/:publicId`, `DELETE /api/admin/files/:publicId`, `POST /api/creator/upload/content` |
| Brand Portal | `POST /api/brand/auth/register`, `POST /api/brand/auth/login`, `GET /api/brand/dashboard`, `GET /api/brand/campaigns`, `GET /api/brand/campaigns/:id`, `GET /api/brand/campaigns/:id/performance`, `PATCH /api/brand/campaigns/:id/status`, `POST /api/brand/brief`, `GET /api/brand/invoices`, `GET /api/brand/creators/shortlist`, `GET /api/brand/analytics/campaign/:id` |
| Creator Portal | `POST /api/creator/auth/register`, `POST /api/creator/auth/login`, `GET /api/creator/dashboard`, `GET /api/creator/campaigns`, `GET /api/creator/campaigns/:id`, `POST /api/creator/campaigns/:id/content`, `PUT /api/creator/campaigns/:id/content`, `DELETE /api/creator/campaigns/:id/content`, `GET /api/creator/earnings`, `GET /api/creator/profile`, `PUT /api/creator/profile`, `PATCH /api/creator/profile/upi`, `POST /api/creator/withdraw`, `GET /api/creator/analytics/performance` |
| Webhooks | `POST /api/webhooks/razorpay`, `POST /api/webhooks/whatsapp`, `POST /api/webhooks/resend` |

## Common Headers

JSON:

```text
Content-Type: application/json
Accept: application/json
```

Admin protected:

```text
Authorization: Bearer {{admin_token}}
```

Brand protected:

```text
Authorization: Bearer {{brand_token}}
```

Creator protected:

```text
Authorization: Bearer {{creator_token}}
```

## Health

### GET `/api/health`

Auth: none

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "environment": "development",
    "timestamp": "2026-04-03T10:00:00.000Z"
  }
}
```

## Chat

### POST `/api/chat/send`

Auth: none

Body:

```json
{
  "message": "Hi, I have 6k followers on Instagram. Can I join?",
  "sessionId": "{{chat_session_id}}",
  "userType": "creator",
  "conversationHistory": []
}
```

Response:

```json
{
  "success": true,
  "data": {
    "reply": "Yes, if you have 5,000+ followers you can apply...",
    "sessionId": "session_postman_demo",
    "provider": "fallback"
  },
  "message": "Message processed successfully"
}
```

### POST `/api/chat/capture-lead`

Auth: none

Body:

```json
{
  "sessionId": "{{chat_session_id}}",
  "name": "Chat User",
  "email": "chat.user@example.com",
  "whatsapp": "+919999999900",
  "userType": "creator",
  "notes": "Interested after chat"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "leadId": "chat_lead_id"
  },
  "message": "Lead captured successfully"
}
```

### GET `/api/chat/history/:sessionId`

Auth: none

Response:

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "_id": "chat_log_id",
        "sessionId": "session_postman_demo",
        "userType": "creator",
        "userMessage": "Hi, I have 6k followers on Instagram. Can I join?",
        "aiResponse": "Yes, if you have 5,000+ followers you can apply...",
        "timestamp": "2026-04-03T10:00:00.000Z"
      }
    ]
  }
}
```

## Admin Auth

### POST `/api/auth/login`

Body:

```json
{
  "email": "{{admin_email}}",
  "password": "{{admin_password}}"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "Triple F Super Admin",
      "email": "admin@triplef.com",
      "role": "super_admin",
      "isActive": true
    },
    "token": "jwt_if_enabled_by_controller"
  },
  "message": "Login successful"
}
```

### POST `/api/auth/logout`

Auth: admin

Body:

```json
{}
```

### GET `/api/auth/me`

Auth: admin

### POST `/api/auth/change-password`

Auth: admin

Body:

```json
{
  "currentPassword": "Admin@123",
  "newPassword": "Admin@456"
}
```

## Public Creator

### POST `/api/creators/apply`

Body:

```json
{
  "name": "Aisha Khan",
  "age": 24,
  "city": "Mumbai",
  "platform": "instagram",
  "followers": "10k-50k",
  "niche": "beauty",
  "profileLink": "https://instagram.com/aisha",
  "whatsapp": "+919530237366",
  "email": "aisha@gmail.com",
  "referral": "friend"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "application": {
      "_id": "application_id",
      "status": "pending",
      "name": "Aisha Khan",
      "email": "aisha@gmail.com"
    },
    "whatsapp": {
      "attempted": true,
      "sent": true,
      "provider": "twilio",
      "messageId": "SMxxxxxxxx",
      "success": true,
      "error": null
    },
    "email": {
      "sent": true,
      "to": "aisha@gmail.com",
      "skipped": false
    }
  },
  "message": "Application submitted successfully"
}
```

### GET `/api/creators/calculator`

Query:

```text
platform=instagram&followers=25000&niche=beauty&frequency=3-4x/week&engagement=good&city=Mumbai&email=lead@example.com
```

Response:

```json
{
  "success": true,
  "data": {
    "estimatedBase": 23958,
    "min": 19166,
    "max": 31145,
    "factors": {
      "platformMultiplier": 0.7,
      "nicheMultiplier": 1.2,
      "engagementMultiplier": 1.1,
      "frequencyMultiplier": 1.1,
      "cityMultiplier": 1.1,
      "cityTier": "metro"
    }
  }
}
```

## Public Brand

### POST `/api/brands/submit-brief`

### POST `/api/brands/brief`

Both routes accept:

```json
{
  "brandName": "Glow Beauty",
  "contactName": "Priya Sharma",
  "email": "priya@glowbeauty.com",
  "phone": "+919876543210",
  "campaignGoal": "awareness",
  "targetAudience": "Women 18-35, beauty enthusiasts",
  "budget": "1l-5l",
  "timeline": "Q2 2026",
  "notes": "Want to promote new skincare line"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "brandLead": {
      "_id": "brand_lead_id",
      "brandName": "Glow Beauty",
      "status": "new"
    }
  },
  "message": "Brand brief submitted successfully"
}
```

## Admin Dashboard

### GET `/api/admin/dashboard`

Auth: admin

Roles: all admin roles

Response shape:

```json
{
  "success": true,
  "data": {
    "role": "super_admin"
  }
}
```

## Admin Applications

### GET `/api/admin/applications`

Auth: admin

Roles: `super_admin`, `onboarding_specialist`

Query:

```text
status=pending&platform=instagram&niche=beauty&page=1&limit=10
```

### GET `/api/admin/applications/:id`

Auth: admin

Roles: `super_admin`, `onboarding_specialist`

### POST `/api/admin/applications/:id/approve`

Auth: admin

Roles: `super_admin`, `onboarding_specialist`

Body:

```json
{
  "handle": "aishakhan",
  "engagementRate": 4.8,
  "upiId": "aisha@upi",
  "panNumber": "ABCDE1234F",
  "tags": ["beauty", "priority"],
  "internalNotes": "Strong metro creator"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "application": {
      "_id": "application_id",
      "status": "approved"
    },
    "creator": {
      "_id": "creator_id",
      "name": "Aisha Khan",
      "status": "active"
    }
  },
  "message": "Application approved successfully"
}
```

### POST `/api/admin/applications/:id/reject`

Body:

```json
{
  "rejectionReason": "Current campaign fit is limited",
  "internalNotes": "Revisit after audience update"
}
```

### POST `/api/admin/applications/bulk-approve`

Body:

```json
{
  "applicationIds": ["{{application_id}}"]
}
```

### DELETE `/api/admin/applications/:id`

Auth: admin

Roles: `super_admin`

## Admin Creators

### GET `/api/admin/creators`

Auth: admin

Roles:
- `super_admin`
- `campaign_manager`
- `finance_manager`
- `onboarding_specialist`

Query:

```text
status=priority&platform=instagram&niche=beauty&city=Mumbai&tags=priority&page=1&limit=10
```

### GET `/api/admin/creators/:id`

Same auth as above.

### PUT `/api/admin/creators/:id`

Roles: `super_admin`, `campaign_manager`

Body:

```json
{
  "city": "Bengaluru",
  "engagementRate": 5.2,
  "status": "priority",
  "upiId": "aisha@upi",
  "followers": 30000,
  "internalNotes": "Updated profile"
}
```

### PATCH `/api/admin/creators/:id/status`

Body:

```json
{
  "status": "priority"
}
```

### POST `/api/admin/creators/:id/tags`

Body:

```json
{
  "tags": ["beauty", "metro", "priority"]
}
```

### POST `/api/admin/creators/bulk-tag`

Body:

```json
{
  "creatorIds": ["{{creator_id}}"],
  "tags": ["priority", "metro"]
}
```

### DELETE `/api/admin/creators/:id`

Roles: `super_admin`

## Admin Campaigns

### POST `/api/admin/campaigns`

Auth: admin

Roles: `super_admin`, `campaign_manager`

JSON body:

```json
{
  "campaignName": "Summer Glow Launch",
  "brandName": "Acme Beauty",
  "brandLeadId": "{{brand_lead_id}}",
  "type": "sponsored_post",
  "budget": 300000,
  "creatorCount": 1,
  "status": "draft",
  "timelineStart": "2026-04-05T00:00:00.000Z",
  "timelineEnd": "2026-04-20T00:00:00.000Z",
  "creators": [
    {
      "creatorId": "{{creator_id}}",
      "amount": 55000
    }
  ]
}
```

Multipart fields:

```text
briefPdf=<file>
campaignName=Summer Glow Launch
brandName=Acme Beauty
type=sponsored_post
budget=300000
creatorCount=1
creators=[{"creatorId":"{{creator_id}}","amount":55000}]
```

### GET `/api/admin/campaigns`

Roles: `super_admin`, `campaign_manager`, `finance_manager`

Query:

```text
status=active&brandName=Acme&page=1&limit=10
```

### GET `/api/admin/campaigns/suggest`

Query:

```text
niche=beauty&minFollowers=10000&maxFollowers=50000&city=Bengaluru&minEngagement=2
```

### GET `/api/admin/campaigns/:id`

### PUT `/api/admin/campaigns/:id`

Body:

```json
{
  "status": "active",
  "brandPaymentStatus": "received",
  "brandPaymentAmount": 300000,
  "performanceData": {
    "totalReach": 100000,
    "totalImpressions": 150000,
    "totalEngagement": 12000,
    "engagementRate": 8,
    "linkClicks": 3000
  },
  "creators": [
    {
      "creatorId": "{{creator_id}}",
      "amount": 55000
    }
  ]
}
```

### PATCH `/api/admin/campaigns/:id/status`

Body:

```json
{
  "status": "active"
}
```

### DELETE `/api/admin/campaigns/:id`

Roles: `super_admin`, `campaign_manager`

### POST `/api/admin/campaigns/:id/send-briefs`

Body:

```json
{}
```

### POST `/api/admin/campaigns/bulk-send-briefs`

Body:

```json
{
  "campaignIds": ["{{campaign_id}}"]
}
```

### POST `/api/admin/campaigns/:campaignId/creators/:creatorId/approve-content`

Body:

```json
{
  "feedback": "Looks good"
}
```

### POST `/api/admin/campaigns/:campaignId/creators/:creatorId/revision-content`

Body:

```json
{
  "feedback": "Please tweak the CTA placement"
}
```

### POST `/api/admin/campaigns/:campaignId/creators/:creatorId/mark-live`

Body:

```json
{
  "postUrl": "https://instagram.com/p/live-post"
}
```

### PATCH `/api/admin/campaigns/:campaignId/creators/:creatorId/payment-status`

Roles: `super_admin`, `finance_manager`

Body:

```json
{
  "paymentStatus": "processing"
}
```

### POST `/api/admin/campaigns/:id/complete`

Body:

```json
{}
```

## Admin Payments

### GET `/api/admin/payments`

Auth: admin

Roles: `super_admin`, `finance_manager`

Query:

```text
status=pending
```

### POST `/api/admin/payments/process`

Body:

```json
{
  "assignmentIds": ["{{assignment_id}}"]
}
```

### POST `/api/admin/payments/bulk-process`

Body:

```json
{
  "assignmentIds": ["{{assignment_id}}"]
}
```

### DELETE `/api/admin/payments/:id`

## Admin Leads

### GET `/api/admin/leads`

Roles: `super_admin`, `onboarding_specialist`

Query:

```text
status=new&type=creator&page=1&limit=10
```

### PUT `/api/admin/leads/:id`

Body:

```json
{
  "status": "contacted",
  "notes": "Reached out by WhatsApp",
  "assignedTo": null
}
```

### DELETE `/api/admin/leads/:id`

## Admin Users and Audit

### GET `/api/admin/users`
### POST `/api/admin/users`
### DELETE `/api/admin/users/:id`
### GET `/api/admin/audit-logs`

Create user body:

```json
{
  "name": "Operations Admin",
  "email": "ops.admin@triplef.com",
  "password": "OpsAdmin@123",
  "role": "campaign_manager",
  "isActive": true
}
```

## Admin Reports and Analytics

### GET `/api/admin/reports/campaign/:campaignId`
### GET `/api/admin/analytics/overview`
### GET `/api/admin/analytics/creators`
### GET `/api/admin/analytics/campaigns`
### GET `/api/admin/analytics/revenue`
### GET `/api/admin/analytics/top-creators`
### GET `/api/admin/analytics/top-brands`

## Admin Notifications and WhatsApp

### GET `/api/admin/notifications/failed`

Roles: `super_admin`

### POST `/api/admin/notifications/retry-whatsapp/:id`

Roles: `super_admin`, `campaign_manager`

Body:

```json
{}
```

### POST `/api/admin/notifications/retry-email/:id`

Roles: `super_admin`, `campaign_manager`

Body:

```json
{}
```

### POST `/api/admin/whatsapp/test`

Roles: `super_admin`

Body:

```json
{
  "to": "+919530253134",
  "message": "Triple F Media WhatsApp test"
}
```

## File Routes

### POST `/api/admin/upload/brief`

Auth: admin

Roles: `super_admin`, `campaign_manager`

Form-data:

```text
briefPdf=<file>
```

### GET `/api/admin/files/:publicId`

Auth: admin

### DELETE `/api/admin/files/:publicId`

Auth: admin

Roles: `super_admin`

### POST `/api/creator/upload/content`

Auth: creator

Form-data:

```text
assignmentId={{assignment_id}}
content=<file>
```

## Brand Portal

### POST `/api/brand/auth/register`

Body:

```json
{
  "brandName": "Acme Beauty",
  "contactName": "Nina Verma",
  "email": "brand.portal@acme.com",
  "password": "Brand@123",
  "phone": "+919111111111"
}
```

### POST `/api/brand/auth/login`

Body:

```json
{
  "email": "brand.portal@acme.com",
  "password": "Brand@123"
}
```

### GET `/api/brand/dashboard`
### GET `/api/brand/campaigns`
### GET `/api/brand/campaigns/:id`
### GET `/api/brand/campaigns/:id/performance`

### PATCH `/api/brand/campaigns/:id/status`

Body:

```json
{
  "status": "cancelled"
}
```

### POST `/api/brand/brief`

Body:

```json
{
  "campaignGoal": "sales",
  "targetAudience": "Urban skincare users",
  "budget": "2l-5l",
  "timeline": "May 2026",
  "notes": "Need launch push"
}
```

### GET `/api/brand/invoices`
### GET `/api/brand/creators/shortlist?niche=beauty&minFollowers=10000&maxFollowers=50000&city=Mumbai&minEngagement=2`
### GET `/api/brand/analytics/campaign/:id`

## Creator Portal

### POST `/api/creator/auth/register`

Body:

```json
{
  "email": "aisha@example.com",
  "password": "Creator@123"
}
```

### POST `/api/creator/auth/login`

Body:

```json
{
  "email": "aisha@example.com",
  "password": "Creator@123"
}
```

### GET `/api/creator/dashboard`
### GET `/api/creator/campaigns`
### GET `/api/creator/campaigns/:id`

### POST `/api/creator/campaigns/:id/content`

Body:

```json
{
  "contentUrl": "https://drive.google.com/content-1"
}
```

### PUT `/api/creator/campaigns/:id/content`

Body:

```json
{
  "contentUrl": "https://drive.google.com/content-2"
}
```

### DELETE `/api/creator/campaigns/:id/content`
### GET `/api/creator/earnings`
### GET `/api/creator/profile`

### PUT `/api/creator/profile`

Body:

```json
{
  "city": "Mumbai",
  "whatsapp": "+919530237366",
  "upiId": "aisha@upi"
}
```

### PATCH `/api/creator/profile/upi`

Body:

```json
{
  "upiId": "aisha-new@upi"
}
```

### POST `/api/creator/withdraw`

Body:

```json
{
  "amount": 500,
  "upiId": "aisha-new@upi",
  "notes": "Weekly withdrawal"
}
```

### GET `/api/creator/analytics/performance`

## Webhooks

### POST `/api/webhooks/razorpay`

Headers:

```text
x-razorpay-signature: <computed_signature>
```

Body shape:

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_1",
        "order_id": "order_test_1"
      }
    }
  }
}
```

### POST `/api/webhooks/whatsapp`

Headers:

```text
x-webhook-secret: <TWILIO_WEBHOOK_SECRET>
```

Body:

```json
{
  "providerMessageId": "test-sid",
  "status": "delivered"
}
```

### POST `/api/webhooks/resend`

Headers:

```text
x-webhook-secret: <RESEND_WEBHOOK_SECRET>
```

Body:

```json
{
  "type": "email.delivered",
  "data": {
    "email_id": "email-1"
  }
}
```

## Practical Notes

- Provider-dependent routes can return delivery/provider failures if Twilio, SMTP, Resend, or Razorpay config is invalid.
- `budget=1l-5l` is accepted and normalized by backend.
- Campaign file upload and creator content upload must be sent as multipart.
- Collection examples are aligned with the smoke-tested backend flows.
