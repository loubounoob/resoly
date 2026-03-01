export type CountryCode = 'FR' | 'US' | 'DE' | 'IE' | 'GB' | 'AU' | 'CH' | 'CA';
export type Locale = 'fr' | 'en' | 'de';
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'AUD' | 'CHF' | 'CAD';

export interface CountryConfig {
  locale: Locale;
  currency: CurrencyCode;
  label: { fr: string; en: string; de: string };
}

export const COUNTRY_MAP: Record<CountryCode, CountryConfig> = {
  FR: { locale: 'fr', currency: 'EUR', label: { fr: 'France', en: 'France', de: 'Frankreich' } },
  US: { locale: 'en', currency: 'USD', label: { fr: 'États-Unis', en: 'United States', de: 'Vereinigte Staaten' } },
  DE: { locale: 'de', currency: 'EUR', label: { fr: 'Allemagne', en: 'Germany', de: 'Deutschland' } },
  IE: { locale: 'en', currency: 'EUR', label: { fr: 'Irlande', en: 'Ireland', de: 'Irland' } },
  GB: { locale: 'en', currency: 'GBP', label: { fr: 'Angleterre', en: 'England', de: 'England' } },
  AU: { locale: 'en', currency: 'AUD', label: { fr: 'Australie', en: 'Australia', de: 'Australien' } },
  CH: { locale: 'de', currency: 'CHF', label: { fr: 'Suisse', en: 'Switzerland', de: 'Schweiz' } },
  CA: { locale: 'en', currency: 'CAD', label: { fr: 'Canada', en: 'Canada', de: 'Kanada' } },
};

export const COUNTRY_CODES: CountryCode[] = ['FR', 'US', 'DE', 'IE', 'GB', 'AU', 'CH', 'CA'];

export function detectCountryFromBrowser(): CountryCode {
  const lang = navigator.language?.toLowerCase() || '';
  if (lang.startsWith('fr')) return 'FR';
  if (lang.startsWith('de')) return 'DE';
  return 'US';
}

export function getIntlLocaleString(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : locale === 'de' ? 'de-DE' : 'en-US';
}

export function getStripeCurrency(currency: CurrencyCode): string {
  return currency.toLowerCase();
}
