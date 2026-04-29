import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { UI_LOCALES, type UiLocale } from "../i18n/uiLocale";
import { useI18n } from "../i18n/I18nContext";

const SHORT_LABEL: Record<UiLocale, string> = {
  es: "ES",
  en: "EN",
  ro: "RO",
};

export function UiLanguageSwitcher(): React.ReactElement {
  const { locale, setLocale, t } = useI18n();

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      <Text style={styles.label}>{t("uiLanguage.label")}</Text>
      <View style={styles.row}>
        {UI_LOCALES.map((code) => {
          const selected = locale === code;
          const accessibilityLabel =
            code === "es"
              ? t("languageSelector.langEs")
              : code === "en"
                ? t("languageSelector.langEn")
                : t("languageSelector.langRo");
          return (
            <TouchableOpacity
              key={code}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setLocale(code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={accessibilityLabel}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {SHORT_LABEL[code]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    color: "#8fa3c4",
    marginBottom: 8,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  chip: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#222e3c",
    borderWidth: 1.2,
    borderColor: "#283753",
    alignItems: "center",
  },
  chipSelected: {
    borderColor: "#3ee8ef",
    backgroundColor: "#1a3048",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b7cced",
  },
  chipTextSelected: {
    color: "#3ee8ef",
  },
});
