import Lead from '../models/Lead.js';
import ChatLead from '../models/ChatLead.js';
import ChatLog from '../models/ChatLog.js';
import { getGeminiResponse } from '../services/geminiService.js';
import logger from '../utils/logger.js';
import { asyncHandler, sendSuccess } from '../utils/helpers.js';

const inferLeadSource = (userType) => (userType === 'brand' ? 'form' : 'chat');

export const sendMessage = asyncHandler(async (req, res) => {
  const {
    message,
    sessionId,
    userType = 'unknown',
    conversationHistory = [],
  } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const aiResponse = await getGeminiResponse(message, conversationHistory);

  const chatLog = await ChatLog.create({
    sessionId: sessionId || `chat_${Date.now()}`,
    userType,
    userMessage: message,
    aiResponse: aiResponse.message,
    timestamp: new Date(),
  });

  sendSuccess(
    res,
    200,
    {
      reply: aiResponse.message,
      sessionId: chatLog.sessionId,
      provider: aiResponse.provider,
    },
    'Message processed successfully',
  );
});

export const captureLead = asyncHandler(async (req, res) => {
  const {
    sessionId,
    name,
    email,
    whatsapp,
    userType = 'unknown',
    notes,
  } = req.body;

  let lead = await ChatLead.findOne({ sessionId });

  if (lead) {
    lead.name = name || lead.name;
    lead.email = email || lead.email;
    lead.whatsapp = whatsapp || lead.whatsapp;
    lead.userType = userType || lead.userType;
    lead.notes = notes || lead.notes;
    lead.capturedAt = new Date();
    await lead.save();
  } else {
    lead = await ChatLead.create({
      sessionId,
      name,
      email,
      whatsapp,
      userType,
      notes,
      capturedAt: new Date(),
    });
  }

  if (email || whatsapp) {
    try {
      await Lead.findOneAndUpdate(
        {
          email: email || undefined,
          whatsapp: whatsapp || undefined,
        },
        {
          type: userType === 'brand' ? 'brand' : 'creator',
          source: inferLeadSource(userType),
          name,
          email,
          whatsapp,
          status: 'qualified',
          notes: notes || 'Lead captured from AI chat assistant',
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      logger.warn('Failed to sync chat lead into CRM lead', {
        sessionId,
        email,
        whatsapp,
        error: error.message,
      });
    }
  }

  sendSuccess(res, 200, { leadId: lead._id }, 'Lead captured successfully');
});

export const getHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const logs = await ChatLog.find({ sessionId }).sort({ timestamp: 1 }).limit(50);

  sendSuccess(res, 200, { history: logs });
});

export default {
  sendMessage,
  captureLead,
  getHistory,
};
