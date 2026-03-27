import React from "react";
import { render } from "@testing-library/react-native";
import { LiveStreamPlayer } from "../src/components/LiveStreamPlayer";

const mockAnimScale = { _value: 1 };
const mockStopListening = jest.fn();
const mockToggleSpeaker = jest.fn();
const mockEmergencyAudioReset = jest.fn();

const defaultProps = {
  remoteStream: null,
  animScale: mockAnimScale as unknown as React.ComponentProps<
    typeof LiveStreamPlayer
  >["animScale"],
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
    const { getByText } = render(<LiveStreamPlayer {...defaultProps} />);
    expect(getByText("Detener")).toBeTruthy();
  });

});
