import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';

import spanishFlag from "../../assets/spanish-flag4.webp";
import englishFlag from "../../assets/english-flag.webp";
import romanianFlag from "../../assets/romanian-flag2.webp";

interface LanguageSelectorProps {
  activeLangs: { es: boolean; en: boolean; ro: boolean };
  onSelectLanguage: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ activeLangs, onSelectLanguage }) => {
  return (
    <View style={styles.languageRow}>
      {[
        { code: "es", label: "Español", img: spanishFlag },
        { code: "en", label: "Inglés", img: englishFlag },
        { code: "ro", label: "Rumano", img: romanianFlag },
      ].map(({ code, label, img }) => {
        const active = activeLangs[code as keyof typeof activeLangs];
        return (
          <TouchableOpacity
            key={code}
            onPress={() => onSelectLanguage(code)}
            disabled={!active}
            style={[styles.langBtn, !active && { opacity: 0.4 }]}
          >
            <View style={styles.flagCircle}>
              <Image
                source={img}
                style={styles.flagImg}
                resizeMode="cover"
              />
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
  );
};

const styles = StyleSheet.create({
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  langBtn: {
    backgroundColor: "#222e3c",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    width: 100,
    shadowColor: "#161d28",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1.2,
    borderColor: "#283753",
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
