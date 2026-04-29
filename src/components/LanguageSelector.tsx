import React from "react";
import { View, TouchableOpacity, Image, Text, StyleSheet } from "react-native";

import spanishFlag from "../../assets/spanish-flag4.webp";
import englishFlag from "../../assets/english-flag.webp";
import romanianFlag from "../../assets/romanian-flag2.webp";

import { useI18n } from "../i18n/I18nContext";
import { interpolateTemplate } from "../i18n/translate";

type LangCode = "es" | "en" | "ro";

interface LanguageSelectorProps {
  activeLangs: { es: boolean; en: boolean; ro: boolean };
  onSelectLanguage: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  activeLangs,
  onSelectLanguage,
}) => {
  const { t } = useI18n();

  const LANGUAGES: { code: LangCode; labelKey: string; img: number }[] = [
    { code: "es", labelKey: "languageSelector.langEs", img: spanishFlag },
    { code: "en", labelKey: "languageSelector.langEn", img: englishFlag },
    { code: "ro", labelKey: "languageSelector.langRo", img: romanianFlag },
  ];

  const hasAnyActive = activeLangs.es || activeLangs.en || activeLangs.ro;
  const allInactive = !hasAnyActive;

  return (
    <View style={styles.wrapper}>
      {allInactive && (
        <View style={styles.inactiveBanner} accessible accessibilityRole="summary">
          <Text style={styles.inactiveBannerTitle}>{t("languageSelector.inactiveTitle")}</Text>
          <Text style={styles.inactiveBannerText}>{t("languageSelector.inactiveBody")}</Text>
        </View>
      )}
      {!allInactive && hasAnyActive && (
        <View style={styles.inactiveHint} accessible accessibilityRole="summary">
          <Text style={styles.inactiveHintText}>{t("languageSelector.hint")}</Text>
        </View>
      )}
      <View style={styles.languageRow}>
        {LANGUAGES.map(({ code, labelKey, img }) => {
          const active = activeLangs[code];
          const label = t(labelKey);
          const a11yTemplate = active
            ? t("languageSelector.a11yAvailable")
            : t("languageSelector.a11yUnavailable");
          const accessibilityLabel = interpolateTemplate(a11yTemplate, {
            label,
          });
          const accessibilityHint = active
            ? t("languageSelector.a11yHintAvailable")
            : t("languageSelector.a11yHintUnavailable");
          return (
            <TouchableOpacity
              key={code}
              onPress={() => onSelectLanguage(code)}
              disabled={!active}
              style={[styles.langBtn, !active && styles.langBtnInactive]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={accessibilityLabel}
              accessibilityHint={accessibilityHint}
              accessibilityState={{ disabled: !active }}
            >
              <View style={styles.flagCircle}>
                <Image source={img} style={styles.flagImg} resizeMode="cover" />
              </View>
              <Text style={styles.langText}>{label}</Text>
              <View
                style={[
                  styles.langStatusCircle,
                  { backgroundColor: active ? "#38e37e" : "#e84545" },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 10,
  },
  inactiveBanner: {
    backgroundColor: "#1e2a3a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334060",
  },
  inactiveBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f4f7fb",
    marginBottom: 8,
  },
  inactiveBannerText: {
    fontSize: 14,
    color: "#b7cced",
    lineHeight: 21,
  },
  inactiveHint: {
    marginBottom: 10,
  },
  inactiveHintText: {
    fontSize: 13,
    color: "#8fa3c4",
    textAlign: "center",
    fontStyle: "italic",
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  langBtn: {
    backgroundColor: "#222e3c",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    minHeight: 44,
    shadowColor: "#161d28",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1.2,
    borderColor: "#283753",
  },
  langBtnInactive: {
    opacity: 0.5,
  },
  flagCircle: {
    width: 60,
    height: 60,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#171f2e",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222e3c",
    marginBottom: 6,
  },
  flagImg: {
    width: "100%",
    height: "100%",
  },
  langText: {
    fontSize: 12,
    color: "#68a0ed",
    fontWeight: "600",
    textAlign: "center",
  },
  langStatusCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 4,
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: "#222e3c",
  },
});
