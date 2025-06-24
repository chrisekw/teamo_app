
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Locale = 'en' | 'es' | 'fr';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getNestedValue = (obj: any, path: string): string | undefined => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedLocale = localStorage.getItem('app-locale') as Locale | null;
    if (storedLocale && ['en', 'es', 'fr'].includes(storedLocale)) {
      setLocaleState(storedLocale);
      document.documentElement.lang = storedLocale;
    } else {
      document.documentElement.lang = 'en';
    }
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoaded(false);
      try {
        const response = await fetch(`/messages/${locale}.json`);
        const json = await response.json();
        setMessages(json);
      } catch (error) {
        console.error(`Could not load messages for locale: ${locale}`, error);
        if (locale !== 'en') {
          try {
            const response = await fetch(`/messages/en.json`);
            const json = await response.json();
            setMessages(json);
          } catch (e) {
            console.error('Could not load fallback English messages', e);
          }
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadMessages();
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (['en', 'es', 'fr'].includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('app-locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    let translated = getNestedValue(messages, key);
    if (!translated) {
        return key;
    }
    if (values) {
        Object.keys(values).forEach(valueKey => {
            const regex = new RegExp(`{${valueKey}}`, 'g');
            translated = translated.replace(regex, String(values[valueKey]));
        });
    }
    return translated;
  }, [messages]);

  const value = { locale, setLocale, t, isLoaded };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
