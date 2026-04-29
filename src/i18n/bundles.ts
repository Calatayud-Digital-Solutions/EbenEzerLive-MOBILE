import es from "../../data/locales/es.json";
import en from "../../data/locales/en.json";
import ro from "../../data/locales/ro.json";

import type { UiLocale } from "./uiLocale";

export type Messages = typeof es;

export const bundles: Record<UiLocale, Messages> = {
  es,
  en,
  ro,
};
