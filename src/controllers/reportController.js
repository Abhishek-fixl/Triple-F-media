import BrandLead from '../models/BrandLead.js';
import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import pdfService from '../services/pdfService.js';
import emailService from '../services/emailService.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/helpers.js';

export const generateCampaignReport = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.campaignId);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');

  const creators = await CampaignCreator.find({ campaignId: campaign._id });
  const report = await pdfService.generateReport(campaign, creators, campaign.performanceData);

  const brandLead = campaign.brandLeadId ? await BrandLead.findById(campaign.brandLeadId) : null;
  if (brandLead) {
    try {
      await emailService.sendReport(brandLead, campaign, report.url);
    } catch (emailError) {
      // Email failure should not block report generation
      console.warn('Failed to send report email:', emailError.message);
    }
  }

  sendSuccess(res, 200, { reportUrl: report.url }, 'Campaign report generated successfully');
});
