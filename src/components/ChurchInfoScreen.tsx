import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  PlayCircle,
  Globe,
  MessageCircle,
} from "lucide-react-native";
import { Svg, Path } from "react-native-svg";

import { useI18n } from "../i18n/I18nContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_CONTENT_OFFSET = 56;

const WHATSAPP_TECH_PHONE = "34637951683";
const YOUTUBE_URL = "https://youtube.com/@bisericaebenezercastellon";
const WEBSITE_URL = "https://www.bisericaebenezer.com";

function buildWhatsappTechUrl(prefillMessage: string): string {
  const encoded = encodeURIComponent(prefillMessage);
  return `https://wa.me/${WHATSAPP_TECH_PHONE}?text=${encoded}`;
}

export const ChurchInfoScreen = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const whatsappTechUrl = buildWhatsappTechUrl(t("churchInfo.whatsappPrefillMessage"));

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + HEADER_CONTENT_OFFSET },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {t("churchInfo.welcome")}
        </Text>
        <View style={styles.infoListBox}>
          <Text style={styles.infoListItem}>{t("churchInfo.scheduleSun")}</Text>
          <Text style={styles.infoListItem}>{t("churchInfo.scheduleTue")}</Text>
          <Text style={styles.infoListItem}>{t("churchInfo.scheduleThu")}</Text>
        </View>
        <Text style={styles.infoText}>
          {t("churchInfo.headphonesNote")}
        </Text>
        <View style={styles.contactBtnWrap}>
          <TouchableOpacity
            style={styles.contactBtn}
            activeOpacity={0.84}
            onPress={() => Linking.openURL(whatsappTechUrl)}
            accessibilityLabel={t("churchInfo.contactSupportA11y")}
          >
            <View style={styles.contactBtnIcon}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="white">
                <Path d="M12.04 2C6.49 2 2 6.47 2 11.99c0 2.11.57 4.05 1.63 5.79L2 22l4.41-1.61c1.67.91 3.56 1.39 5.63 1.39h.01c5.55 0 10.04-4.47 10.04-9.99C22.08 6.47 17.59 2 12.04 2zm5.69 14.31c-.24.68-1.38 1.3-1.89 1.38-.48.07-1.08.1-1.74-.11-.4-.13-.92-.29-1.58-.57-2.78-1.19-4.6-3.97-4.74-4.15-.14-.18-1.13-1.49-1.13-2.84 0-1.35.72-2.02.98-2.3.26-.28.57-.35.76-.35.18 0 .38.01.55.01.18 0 .42-.07.65.5.24.57.82 1.98.89 2.12.07.14.11.3.02.48-.09.18-.13.3-.25.46-.13.16-.27.36-.39.49-.13.14-.27.29-.12.57.14.28.61.99 1.31 1.6.9.8 1.65 1.05 1.94 1.19.3.14.46.12.63-.07.18-.2.72-.83.92-1.12.2-.28.39-.23.65-.14.26.09 1.64.77 1.92.9.28.14.47.2.54.31.06.11.06.64-.18 1.32z" />
              </Svg>
            </View>
            <Text style={styles.contactBtnLabel}>{t("churchInfo.contactSupport")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.textBox}>
        <Text style={styles.textItem}>
          <MapPin size={16} color="#00b4d8" /> {t("churchInfo.addressLine")}
        </Text>
        <Text style={styles.textItem}>
          <Phone size={16} color="#00b4d8" /> +34 687-210-586
        </Text>
        <Text style={styles.textItem}>
          <Mail size={16} color="#00b4d8" /> biserica_ebenezer@yahoo.es
        </Text>
        <Text style={styles.textItem}>
          <Clock size={16} color="#00b4d8" /> {t("churchInfo.scheduleShort")}
        </Text>
        <Text style={styles.textItem}>
          <PlayCircle size={16} color="#00b4d8" />{" "}
          <Text style={styles.link} onPress={() => Linking.openURL(YOUTUBE_URL)}>
            youtube.com/@bisericaebenezercastellon
          </Text>
        </Text>
        <Text style={styles.textItem}>
          <Globe size={16} color="#00b4d8" />{" "}
          <Text style={styles.link} onPress={() => Linking.openURL(WEBSITE_URL)}>
            www.bisericaebenezer.com
          </Text>
        </Text>
        <Text style={styles.textItem}>
          <MessageCircle size={16} color="#00b4d8" /> {t("churchInfo.whatsappLabel")}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoBox: {
    backgroundColor: "#202f47",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1.4,
    borderColor: "#3ee8ef33",
    shadowColor: "#182030",
    shadowOpacity: 0.17,
    shadowRadius: 10,
    elevation: 6,
  },
  infoText: {
    color: "#e3f6fb",
    fontSize: 14.5,
    marginBottom: 2,
    lineHeight: 22,
    fontWeight: "500",
  },
  infoListBox: {
    marginTop: 2,
    marginBottom: 5,
    marginLeft: 10,
  },
  infoListItem: {
    color: "#5de6fa",
    fontSize: 15,
    marginBottom: 1,
    lineHeight: 21,
    fontWeight: "600",
  },
  contactBtnWrap: { alignItems: "center", marginTop: 9 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 27,
    backgroundColor: "#22b573",
    shadowColor: "#155a41",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  contactBtnIcon: { marginRight: 10 },
  contactBtnLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  textBox: {
    backgroundColor: "#222e3c",
    padding: 18,
    borderRadius: 17,
    shadowColor: "#121a22",
    shadowOpacity: 0.11,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1.3,
    borderColor: "#283753",
  },
  textItem: {
    color: "#f4f7fb",
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 21,
  },
  link: {
    color: "#82eefd",
    textDecorationLine: "underline",
  },
});
