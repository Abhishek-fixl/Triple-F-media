import PDFDocument from 'pdfkit';

import Invoice from '../models/Invoice.js';
import cloudinaryService from './cloudinaryService.js';
import { generateSequentialReference } from '../utils/helpers.js';

const getInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `TFM-${String(count + 1).padStart(6, '0')}`;
};

const generateInvoicePdfBuffer = async ({ creator, campaign, payment, invoiceNumber, total, tds, gst }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).text('Triple F Media Invoice');
    doc.moveDown();
    doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Creator: ${creator.name}`);
    doc.text(`Campaign: ${campaign.campaignName}`);
    doc.text(`Gross Amount: INR ${payment.amount}`);
    doc.text(`TDS: INR ${tds}`);
    doc.text(`GST: INR ${gst}`);
    doc.text(`Total Paid: INR ${total}`);
    doc.moveDown();
    doc.text('This is a system-generated invoice issued by Triple F Media.');
    doc.end();
  });

const generateInvoice = async (creator, campaign, payment) => {
  const invoiceNumber = await getInvoiceNumber();
  const tds = Number(payment.tdsDeducted || 0);
  const gst = 0;
  const total = Number(payment.netAmount || payment.amount);
  const buffer = await generateInvoicePdfBuffer({ creator, campaign, payment, invoiceNumber, total, tds, gst });
  const uploadResult = await cloudinaryService.uploadFile(
    buffer,
    'triplef/invoices',
    `${generateSequentialReference(invoiceNumber)}.pdf`,
    'application/pdf',
  );

  return Invoice.create({
    invoiceNumber,
    paymentId: payment._id,
    creatorId: creator._id,
    creatorName: creator.name,
    campaignName: campaign.campaignName,
    amount: payment.amount,
    gst,
    tds,
    total,
    pdfUrl: uploadResult.url,
  });
};

export default {
  generateInvoice,
  getInvoiceNumber,
};
