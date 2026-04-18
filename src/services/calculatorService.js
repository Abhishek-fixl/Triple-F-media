import { detectCityTier } from '../utils/helpers.js';

const PLATFORM_MULTIPLIERS = {
  instagram: 0.7,
  youtube: 1.2,
  moj: 0.4,
  josh: 0.4,
  linkedin: 1.3,
  other: 0.8,
};

const NICHE_MULTIPLIERS = {
  finance: 1.5,
  tech: 1.5,
  beauty: 1.2,
  lifestyle: 1.2,
  gaming: 1.1,
  food: 1.1,
  fitness: 1.1,
  comedy: 1.0,
  travel: 1.15,
  other: 1.0,
};

const ENGAGEMENT_MULTIPLIERS = {
  high: 1.3,
  good: 1.1,
  average: 1.0,
  low: 0.9,
};

const FREQUENCY_MULTIPLIERS = {
  '5-7x/week': 1.2,
  '3-4x/week': 1.1,
  '1-2x/week': 1.0,
  occasional: 0.9,
};

const CITY_MULTIPLIERS = {
  metro: 1.1,
  tier_2: 1.0,
  tier_3: 0.9,
};

const calculate = (inputs) => {
  const followers = Number(inputs.followers || 0);
  const platformMultiplier = PLATFORM_MULTIPLIERS[inputs.platform] || 0.8;
  const nicheMultiplier = NICHE_MULTIPLIERS[inputs.niche] || 1.0;
  const engagementMultiplier = ENGAGEMENT_MULTIPLIERS[inputs.engagement] || 1.0;
  const frequencyMultiplier = FREQUENCY_MULTIPLIERS[inputs.frequency] || 1.0;
  const cityTier = detectCityTier(inputs.city);
  const cityMultiplier = CITY_MULTIPLIERS[cityTier];

  const baseRate = (followers / 1000) * 600;
  const result = baseRate * platformMultiplier * nicheMultiplier * engagementMultiplier * frequencyMultiplier * cityMultiplier;

  return {
    estimatedBase: Math.round(result),
    min: Math.round(result * 0.8),
    max: Math.round(result * 1.3),
    factors: {
      platformMultiplier,
      nicheMultiplier,
      engagementMultiplier,
      frequencyMultiplier,
      cityMultiplier,
      cityTier,
    },
  };
};

export default { calculate };
