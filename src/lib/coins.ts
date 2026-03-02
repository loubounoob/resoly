/**
 * Coefficient de mise C(I) — piecewise function based on bet amount
 */
export const getCoefficientDeMise = (I: number): number => {
  if (I <= 50) return 1 + 0.004 * I;
  if (I <= 75) return 1.2 + 0.012 * (I - 50);
  if (I <= 100) return 1.5 + 0.02 * (I - 75);
  if (I <= 300) return 2 - 0.0045 * (I - 100);
  if (I <= 860) return 1.1 - 0.000785 * (I - 300);
  if (I <= 1000) return 0.6604 - 0.0005 * (I - 860);
  return Math.max(0.15, 0.59 - 0.00009 * (I - 1000));
};

/**
 * Currency multiplier for weaker currencies
 */
export const VALID_PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027"];

export const getPromoMultiplier = (code?: string): number => {
  if (!code) return 1.0;
  return VALID_PROMO_CODES.includes(code.toUpperCase()) ? 1.5 : 1.0;
};

export const getCurrencyMultiplier = (currency?: string): number => {
  if (!currency) return 1.0;
  const c = currency.toUpperCase();
  if (c === 'AUD' || c === 'CAD') return 0.65;
  if (c === 'USD') return 0.85;
  return 1.0;
};

/**
 * Calculate coins earned for a completed challenge
 * Coins = I × C(I) × (0.3 + 0.6 × M^1.5) × (S/3)^1.1 × currencyMultiplier
 * 
 * @param I - mise investie (€) = bet_per_month × duration_months
 * @param M - nombre de mois (1 à 3)
 * @param S - séances par semaine
 * @param currency - optional currency code (AUD, CAD, USD, EUR, etc.)
 */
export const calculateCoins = (I: number, M: number, S: number, currency?: string): number => {
  const CI = getCoefficientDeMise(I);
  const monthFactor = 0.3 + 0.6 * Math.pow(M, 1.5);
  const sessionFactor = Math.pow(S / 3, 1.1);
  const currencyMult = getCurrencyMultiplier(currency);
  return Math.round(I * CI * monthFactor * sessionFactor * currencyMult);
};
