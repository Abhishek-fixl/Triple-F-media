import PDFDocument from 'pdfkit';
import fs from 'fs';

import cloudinaryService from './cloudinaryService.js';
import { generateSequentialReference, getGeneratedFilePath } from '../utils/helpers.js';

const createPdfBuffer = async (writer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writer(doc);
    doc.end();
  });

const renderHeader = (doc, title) => {
  doc.fontSize(24).text(title);
  doc.moveDown();
  doc.fontSize(10).fillColor('#555555').text(`Generated at: ${new Date().toLocaleString()}`);
  doc.moveDown();
  doc.fillColor('#000000');
};

const generateProposal = async (campaign, creators = []) => {
  const buffer = await createPdfBuffer((doc) => {
    renderHeader(doc, `Campaign Proposal: ${campaign.campaignName}`);
    doc.fontSize(14).text(`Brand: ${campaign.brandName}`);
    doc.text(`Campaign Type: ${campaign.type}`);
    doc.text(`Budget: INR ${campaign.budget}`);
    doc.text(`Creator Count: ${campaign.creatorCount}`);
    doc.moveDown().fontSize(16).text('Creator Recommendations');

    creators.forEach((creator, index) => {
      doc.moveDown().fontSize(12).text(`${index + 1}. ${creator.name} (@${creator.handle})`);
      doc.fontSize(10).text(`Platform: ${creator.platform} | Niche: ${creator.niche} | Followers: ${creator.followers}`);
    });
  });

  const fileName = `${generateSequentialReference('proposal')}.pdf`;
  const filePath = getGeneratedFilePath(fileName);
  fs.writeFileSync(filePath, buffer);
  return cloudinaryService.uploadFile(buffer, 'triplef/proposals', fileName, 'application/pdf');
};

const generateReport = async (campaign, creators = [], performance = {}) => {
  const buffer = await createPdfBuffer((doc) => {
    renderHeader(doc, `Campaign Report: ${campaign.campaignName}`);
    doc.fontSize(14).text(`Brand: ${campaign.brandName}`);
    doc.text(`Status: ${campaign.status}`);
    doc.moveDown().fontSize(16).text('Performance');
    doc.fontSize(10).text(`Reach: ${performance.totalReach || 0}`);
    doc.text(`Impressions: ${performance.totalImpressions || 0}`);
    doc.text(`Engagement: ${performance.totalEngagement || 0}`);
    doc.text(`Engagement Rate: ${performance.engagementRate || 0}%`);
    doc.text(`Link Clicks: ${performance.linkClicks || 0}`);
    doc.moveDown().fontSize(16).text('Participating Creators');

    creators.forEach((item, index) => {
      doc.moveDown().fontSize(12).text(`${index + 1}. ${item.creatorName || item.name}`);
      doc.fontSize(10).text(`Status: ${item.postStatus || item.status}`);
      doc.text(`Content Status: ${item.contentStatus || 'n/a'}`);
      if (item.postUrl) doc.text(`Post URL: ${item.postUrl}`);
    });
  });

  const fileName = `${generateSequentialReference('report')}.pdf`;
  return cloudinaryService.uploadFile(buffer, 'triplef/reports', fileName, 'application/pdf');
};

export default {
  generateProposal,
  generateReport,
};
