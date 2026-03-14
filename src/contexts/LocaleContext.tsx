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

const GEOCODE_COUNTRY_MAP: Record<string, CountryCode> = {
  FR: 'FR', US: 'US', DE: 'DE', IE: 'IE', GB: 'GB', AU: 'AU', CH: 'CH', CA: 'CA',
};

async function detectCountryFromGeolocation(): Promise<CountryCode | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=3`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const code = data?.address?.country_code?.toUpperCase();
          resolve(code && GEOCODE_COUNTRY_MAP[code] ? GEOCODE_COUNTRY_MAP[code] : null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<CountryCode>(() => {
    const stored = localStorage.getItem('resoly_country') as CountryCode | null;
    if (stored && COUNTRY_MAP[stored]) return stored;
    return detectCountryFromBrowser();
  });

  // On first visit (no stored country), request geolocation to refine country
  useEffect(() => {
    const stored = localStorage.getItem('resoly_country') as CountryCode | null;
    if (stored && COUNTRY_MAP[stored]) return; // Already set by user

    detectCountryFromGeolocation().then((detected) => {
      if (detected) {
        setCountryState(detected);
        localStorage.setItem('resoly_country', detected);
      }
    });
  }, []);

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
      value = getNestedValue(translations['fr'], key);
    }
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    if (params && 'count' in params) {
      const count = Number(params.count);
      value = value.replace(/\{s\}/g, count > 1 ? 's' : '');
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

  return (
    <LocaleContext.Provider value={{ locale, country, currency, t, formatCurrency, currencySymbol, setCountry, dateLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};
