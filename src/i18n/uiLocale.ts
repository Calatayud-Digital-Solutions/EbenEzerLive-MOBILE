export type UiLocale = "es" | "en" | "ro";

export const UI_LOCALE_STORAGE_KEY = "@ebenezer_live/ui_locale";

export const UI_LOCALES: readonly UiLocale[] = ["es", "en", "ro"];

export function parseUiLocale(value: string | null | undefined): UiLocale | null {
  if (value === "es" || value === "en" || value === "ro") {
    return value;
  }
  return null;
}
