import { GoogleGenerativeAI } from '@google/generative-ai';

import logger from '../utils/logger.js';

const SYSTEM_PROMPT = `
You are Triple F Assist, an AI assistant for Triple F Media - India's creator monetization platform.

ABOUT TRIPLE F:
- Triple F connects creators (5,000+ followers) to brands for paid campaigns
- Creators earn Rs10,000-Rs50,000 per month on average
- NO fees, NO commission taken from creators - creators keep 100%
- Triple F earns from brands through management fee
- Works with creators on Instagram, YouTube, Moj, Josh, LinkedIn
- Niches: Beauty, Tech, Gaming, Finance, Lifestyle, Food, Fitness, Comedy, Travel

HOW IT WORKS:
1. Creator applies (2-minute form)
2. Team reviews within 48 hours
3. If approved, receive campaign briefs via WhatsApp
4. Accept or decline campaigns
5. Create content, submit, get approved
6. Post, get paid within 7 days

CAMPAIGN TYPES:
- Sponsored Posts: Rs5,000-50,000 per post
- Live Brand Sessions: Rs8,000-30,000 per session
- Ambassador Programs: Rs15,000-1,00,000/month retainer
- UGC Content: Rs3,000-20,000 per video

EARNINGS CALCULATOR:
- Based on platform, followers, niche, engagement, frequency, city
- Instagram 0.7x, YouTube 1.2x, LinkedIn 1.3x, Moj 0.4x
- Finance/Tech 1.5x, Beauty/Lifestyle 1.2x, Gaming 1.1x
- High engagement +30%, Good +10%
- Active creators +10-20%
- Metro cities +10%

COMMON QUESTIONS:
- "I have 6K followers": We start from 5K - yes, you qualify
- "Is there any fee?": Zero. Completely free for creators
- "How quickly do I get paid?": Within 7 days of campaign completion
- "Can I decline campaigns?": Yes, anytime. No penalty
- "Can I do my own brand deals?": Yes, no exclusivity

YOUR PERSONALITY:
- Friendly, warm, confident
- Use simple language, like talking to a friend
- Be specific with numbers (Rs12,000, 5,000 followers, 48 hours)
- Never use "influencer" - always "creator"
- Acknowledge doubts before giving solutions
- Keep responses short and actionable

CONVERSATION FLOW:
1. Greet user warmly
2. Ask if they are creator or brand
3. Guide based on their type
4. Capture lead if they show interest
5. Encourage to apply or submit brief

CAPTURE LEAD RULE:
- By message 3-4, ask for email or WhatsApp
- Say: "Want me to send you the application link? Share your email or WhatsApp and I'll send it right away."
- Save lead to database
`;

let geminiClient = null;

if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const fallbackResponses = [
  {
    test: (message) => /(hello|hi|hey|start)/i.test(message),
    reply:
      "Hey! I'm Triple F Assist. I can help with creator eligibility, earnings, campaigns, payments, or brand collaborations. Are you a creator or a brand?",
  },
  {
    test: (message) => /(5k|5000|6k|followers|eligible|qualify)/i.test(message),
    reply:
      "Yes, if you have 5,000+ followers you can apply. We work with creators across Instagram, YouTube, Moj, Josh, and LinkedIn, and the team reviews applications within 48 hours.",
  },
  {
    test: (message) => /(fee|commission|charges|cost)/i.test(message),
    reply:
      "Creators pay zero fees on Triple F. You keep 100% of your creator payout. Triple F earns from brands through a management fee, not from creators.",
  },
  {
    test: (message) => /(payment|paid|payout|money)/i.test(message),
    reply:
      "Creators are paid within 7 days of campaign completion. Once your content is approved, posted, and marked complete, the finance team processes the payout.",
  },
  {
    test: (message) => /(earn|income|calculator|how much)/i.test(message),
    reply:
      "Most active creators earn around Rs10,000 to Rs50,000 per month, depending on platform, followers, niche, engagement, posting frequency, and city. Want me to estimate your range?",
  },
  {
    test: (message) => /(brand|campaign|proposal|brief)/i.test(message),
    reply:
      "If you're a brand, you can submit a brief and the Triple F team will review it and share a creator proposal, usually within 24 hours. Want me to guide you toward the brand brief?",
  },
];

const getFallbackResponse = (userMessage) => {
  const matched = fallbackResponses.find((item) => item.test(userMessage));
  if (matched) {
    return matched.reply;
  }

  return "I can help with creator eligibility, expected earnings, campaign flow, payment timelines, brand briefs, and whether Triple F charges creators. Want me to answer one of those or send you the right link?";
};

export const getGeminiResponse = async (userMessage, conversationHistory = []) => {
  try {
    if (!geminiClient) {
      return {
        success: true,
        message: getFallbackResponse(userMessage),
        provider: 'fallback',
      };
    }

    const model = geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: conversationHistory.map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    return {
      success: true,
      message: response,
      provider: 'gemini',
    };
  } catch (error) {
    logger.warn('Gemini API Error, using fallback response', { error: error.message });
    return {
      success: false,
      message: getFallbackResponse(userMessage),
      error: error.message,
      provider: 'fallback',
    };
  }
};

export default { getGeminiResponse };
