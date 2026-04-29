import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { bundles, type Messages } from "./bundles";
import { translatePath } from "./translate";
import {
  parseUiLocale,
  UI_LOCALE_STORAGE_KEY,
  type UiLocale,
} from "./uiLocale";

interface I18nContextValue {
  locale: UiLocale;
  setLocale: (next: UiLocale) => void;
  messages: Messages;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const DEFAULT_LOCALE: UiLocale = "es";

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<UiLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(UI_LOCALE_STORAGE_KEY);
        const parsed = parseUiLocale(stored);
        if (!cancelled && parsed !== null) {
          setLocaleState(parsed);
        }
      } catch {
        // Keep default locale on read failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(UI_LOCALE_STORAGE_KEY, next).catch(() => {
      // Persistence failure should not block UI
    });
  }, []);

  const value = useMemo((): I18nContextValue => {
    const messages = bundles[locale];
    return {
      locale,
      setLocale,
      messages,
      t: (path: string) => translatePath(messages, path),
    };
  }, [locale, setLocale]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
