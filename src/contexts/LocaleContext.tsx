import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import fr from "@/i18n/locales/fr";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import { COUNTRY_MAP, detectCountryFromBrowser, getIntlLocaleString, type CountryCode, type Locale, type CurrencyCode } from "@/i18n/currencies";
import type { TranslationKeys } from "@/i18n/locales/fr";
import { fr as frLocale, enUS, de as deLocale } from "date-fns/locale";

const translations: Record<Locale, TranslationKeys> = { fr, en, de };

function getNestedValue(obj: any, path: string): string | any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

interface LocaleContextType {
  locale: Locale;
  country: CountryCode;
  currency: CurrencyCode;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
  setCountry: (country: CountryCode) => void;
  dateLocale: typeof frLocale;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'fr',
  country: 'FR',
  currency: 'EUR',
  t: (k) => k,
  formatCurrency: (a) => `${a}€`,
  currencySymbol: '€',
  setCountry: () => {},
  dateLocale: frLocale,
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<CountryCode>(() => {
    const stored = localStorage.getItem('resoly_country') as CountryCode | null;
    if (stored && COUNTRY_MAP[stored]) return stored;
    return detectCountryFromBrowser();
  });

  const config = COUNTRY_MAP[country] || COUNTRY_MAP['FR'];
  const locale = config.locale;
  const currency = config.currency;

  const dateLocale = locale === 'fr' ? frLocale : locale === 'de' ? deLocale : enUS;

  const currencySymbol = new Intl.NumberFormat(getIntlLocaleString(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0).replace(/[\d\s.,]/g, '').trim();

  const t = useCallback((key: string, params?: Record<string, string | number>): any => {
    let value = getNestedValue(translations[locale], key);
    if (value === undefined || value === null) {
      // Fallback to French
      value = getNestedValue(translations['fr'], key);
    }
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [locale]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat(getIntlLocaleString(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [locale, currency]);

  const setCountry = useCallback((c: CountryCode) => {
    setCountryState(c);
    localStorage.setItem('resoly_country', c);
  }, []);

  // Sync from profile when available
  useEffect(() => {
    const stored = localStorage.getItem('resoly_country') as CountryCode | null;
    if (stored && COUNTRY_MAP[stored]) {
      setCountryState(stored);
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, country, currency, t, formatCurrency, currencySymbol, setCountry, dateLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};
