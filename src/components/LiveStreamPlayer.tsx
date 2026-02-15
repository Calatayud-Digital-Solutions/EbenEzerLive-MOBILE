import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
} from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";
import { Volume2, VolumeX } from "lucide-react-native";

interface LiveStreamPlayerProps {
  remoteStream: MediaStream | null;
  animScale: Animated.Value;
  stopListening: () => void;
  speakerOn: boolean;
  toggleSpeaker: () => void;
  emergencyAudioReset: () => void;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  remoteStream,
  animScale,
  stopListening,
  speakerOn,
  toggleSpeaker,
  emergencyAudioReset
}) => {
  return (
    <View style={styles.audioContainer}>
      {remoteStream ? (
        <RTCView
          style={styles.rtcView}
          streamURL={remoteStream?.toURL?.()}
        />
      ) : null}
      <Animated.View
        style={[
          styles.audioIconBox,
          { transform: [{ scale: animScale }] },
        ]}
      >
        <Volume2 color="#3ee8ef" size={69} />
      </Animated.View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopListening}
        >
          <Text style={styles.stopLabel}>Detener</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.speakerButton,
            { backgroundColor: speakerOn ? "#1d7fa6" : "#283753" },
          ]}
          onPress={toggleSpeaker}
          activeOpacity={0.8}
          accessibilityLabel="Alternar altavoz"
        >
          {speakerOn ? (
            <Volume2 color="#fff" size={22} />
          ) : (
            <VolumeX color="#fff" size={22} />
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={emergencyAudioReset}
        activeOpacity={0.8}
      >
        <Text style={styles.emergencyLabel}>🚨 Reset Audio</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    marginVertical: 20,
    width: "100%",
    alignItems: "center",
  },
  rtcView: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    backgroundColor: "#222e3c",
  },
  audioIconBox: {
    width: 80,
    height: 80,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 60,
    backgroundColor: "transparent",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  stopButton: {
    marginTop: 10,
    backgroundColor: "#2352a7",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 13,
    shadowColor: "#1a406f",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 7,
    alignSelf: "center",
  },
  stopLabel: {
    color: "#f4f7fb",
    fontWeight: "700",
    fontSize: 16,
  },
  speakerButton: {
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    width: 46,
    height: 46,
    shadowColor: "#143a56",
    shadowOpacity: 0.19,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: "center",
    backgroundColor: "#1d7fa6",
  },
  emergencyButton: {
    marginTop: 8,
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "center",
    shadowColor: "#c0392b",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  emergencyLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
