import React from "react";
import { Animated } from "react-native";

import { LiveStreamPlayer } from "../src/components/LiveStreamPlayer";

import { renderWithI18n } from "../test/renderWithI18n";

const mockAnimScale = new Animated.Value(1);
const mockStopListening = jest.fn();
const mockToggleSpeaker = jest.fn();
const mockEmergencyAudioReset = jest.fn();

const defaultProps = {
  remoteStream: null,
  animScale: mockAnimScale,
  stopListening: mockStopListening,
  speakerOn: false,
  toggleSpeaker: mockToggleSpeaker,
  emergencyAudioReset: mockEmergencyAudioReset,
};

describe("LiveStreamPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders stop button", () => {
    const { getByText } = renderWithI18n(<LiveStreamPlayer {...defaultProps} />);
    expect(getByText("Detener")).toBeTruthy();
  });
});
