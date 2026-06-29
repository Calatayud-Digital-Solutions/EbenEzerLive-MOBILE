import {
  canAttemptReconnect,
  computeWsReconnectDelayMs,
  getHeartbeatIntervalMs,
  HEARTBEAT_IDLE_MS,
  HEARTBEAT_LISTENING_ANDROID_MS,
  HEARTBEAT_LISTENING_IOS_MS,
  getReconnectDebounceMs,
  RECONNECT_DEBOUNCE_MS,
  RECONNECT_DEBOUNCE_LISTENING_MS,
  shouldRecoverOnForeground,
  shouldReconnectAfterIceGrace,
  shouldRegisterListenerOnHeartbeat,
  shouldSendBackgroundKeepalive,
  shouldSendForegroundRecoveryPing,
  shouldTriggerIceReconnect,
  parseServerShutdownRetryMs,
  shouldRequestOfferOnWsReconnect,
  resolveStreamRecoveryAction,
  resolveLivePlayerReconnectingVisible,
  shouldReconnectWebRtc,
  shouldRequestOfferOnBroadcastActive,
  shouldShowLivePlayerWhileListening,
  isServerShutdownMessage,
  resolveListenerRegistrationAction,
  resolveWsReconnectRecoveryAction,
  isIceConnectionHealthy,
  resolveAndroidAudioServiceAction,
  buildRegisterListenerPayload,
  buildRequestOfferPayload,
  buildStopListeningPayload,
  resolveListenerPlatform,
} from "../src/streaming/listenerRecovery";

describe("listenerRecovery", () => {
  describe("getHeartbeatIntervalMs", () => {
    it("returns idle interval when not listening", () => {
      expect(getHeartbeatIntervalMs(false, "ios")).toBe(HEARTBEAT_IDLE_MS);
      expect(getHeartbeatIntervalMs(false, "android")).toBe(HEARTBEAT_IDLE_MS);
    });

    it("returns shorter interval on iOS while listening", () => {
      expect(getHeartbeatIntervalMs(true, "ios")).toBe(
        HEARTBEAT_LISTENING_IOS_MS
      );
      expect(getHeartbeatIntervalMs(true, "android")).toBe(
        HEARTBEAT_LISTENING_ANDROID_MS
      );
    });
  });

  describe("shouldTriggerIceReconnect", () => {
    it("returns true for disconnected and failed states", () => {
      expect(shouldTriggerIceReconnect("disconnected")).toBe(true);
      expect(shouldTriggerIceReconnect("failed")).toBe(true);
    });

    it("returns false for healthy states", () => {
      expect(shouldTriggerIceReconnect("connected")).toBe(false);
      expect(shouldTriggerIceReconnect("checking")).toBe(false);
    });
  });

  describe("shouldReconnectAfterIceGrace", () => {
    it("returns true only when ICE is still broken after grace period", () => {
      expect(shouldReconnectAfterIceGrace("disconnected")).toBe(true);
      expect(shouldReconnectAfterIceGrace("failed")).toBe(true);
      expect(shouldReconnectAfterIceGrace("connected")).toBe(false);
    });
  });

  describe("shouldSendForegroundRecoveryPing", () => {
    it("returns true when returning to active from background", () => {
      expect(
        shouldSendForegroundRecoveryPing("background", "active")
      ).toBe(true);
      expect(
        shouldSendForegroundRecoveryPing("inactive", "active")
      ).toBe(true);
    });

    it("returns false for other transitions", () => {
      expect(shouldSendForegroundRecoveryPing("active", "background")).toBe(
        false
      );
      expect(shouldSendForegroundRecoveryPing("active", "active")).toBe(false);
    });
  });

  describe("shouldSendBackgroundKeepalive", () => {
    it("returns true when listening and app moves to background", () => {
      expect(shouldSendBackgroundKeepalive(true, "background")).toBe(true);
      expect(shouldSendBackgroundKeepalive(true, "inactive")).toBe(true);
    });

    it("returns false when not listening or staying active", () => {
      expect(shouldSendBackgroundKeepalive(false, "background")).toBe(false);
      expect(shouldSendBackgroundKeepalive(true, "active")).toBe(false);
    });
  });

  describe("resolveAndroidAudioServiceAction", () => {
    it("keeps Android audio services running while listening in background", () => {
      expect(resolveAndroidAudioServiceAction(true, "active")).toBe(
        "keep-running"
      );
      expect(resolveAndroidAudioServiceAction(true, "background")).toBe(
        "keep-running"
      );
      expect(resolveAndroidAudioServiceAction(true, "inactive")).toBe(
        "keep-running"
      );
    });

    it("stops Android audio services when not listening", () => {
      expect(resolveAndroidAudioServiceAction(false, "background")).toBe("stop");
      expect(resolveAndroidAudioServiceAction(false, "active")).toBe("stop");
    });

    it("stops Android audio services for unknown app states", () => {
      expect(resolveAndroidAudioServiceAction(true, "unknown")).toBe("stop");
    });
  });

  describe("canAttemptReconnect", () => {
    it("debounces rapid reconnect attempts", () => {
      const now = 10_000;
      expect(canAttemptReconnect(0, now)).toBe(true);
      expect(canAttemptReconnect(now - 1000, now)).toBe(false);
      expect(
        canAttemptReconnect(now - RECONNECT_DEBOUNCE_MS, now)
      ).toBe(true);
    });
  });

  describe("shouldRecoverOnForeground", () => {
    it("returns true when listening and ICE is missing or broken without stream", () => {
      expect(shouldRecoverOnForeground(true, undefined, false)).toBe(true);
      expect(shouldRecoverOnForeground(true, "failed", false)).toBe(true);
      expect(shouldRecoverOnForeground(true, "disconnected", false)).toBe(true);
    });

    it("returns false when not listening or playback is healthy", () => {
      expect(shouldRecoverOnForeground(false, "failed", false)).toBe(false);
      expect(shouldRecoverOnForeground(true, "connected", true)).toBe(false);
      expect(shouldRecoverOnForeground(true, "completed", true)).toBe(false);
      expect(shouldRecoverOnForeground(true, undefined, true)).toBe(false);
    });
  });

  describe("resolveLivePlayerReconnectingVisible", () => {
    it("hides reconnecting label while audio stream is healthy", () => {
      expect(
        resolveLivePlayerReconnectingVisible("reconnecting", true, "connected")
      ).toBe(false);
      expect(
        resolveLivePlayerReconnectingVisible("requesting", true, "completed")
      ).toBe(false);
    });

    it("shows reconnecting when stream is missing or ICE is broken", () => {
      expect(
        resolveLivePlayerReconnectingVisible("reconnecting", false, "connected")
      ).toBe(true);
      expect(
        resolveLivePlayerReconnectingVisible("connecting", false, undefined)
      ).toBe(true);
    });
  });

  describe("shouldReconnectWebRtc", () => {
    it("skips peer teardown when stream and ICE are healthy", () => {
      expect(shouldReconnectWebRtc(true, "connected")).toBe(false);
      expect(shouldReconnectWebRtc(true, "disconnected")).toBe(true);
      expect(shouldReconnectWebRtc(false, "connected")).toBe(true);
    });
  });

  describe("getReconnectDebounceMs", () => {
    it("uses shorter debounce while listening", () => {
      expect(getReconnectDebounceMs(true)).toBe(RECONNECT_DEBOUNCE_LISTENING_MS);
      expect(getReconnectDebounceMs(false)).toBe(RECONNECT_DEBOUNCE_MS);
    });
  });

  describe("parseServerShutdownRetryMs", () => {
    it("returns custom delay when valid", () => {
      expect(parseServerShutdownRetryMs(5000)).toBe(5000);
    });

    it("falls back to default for invalid values", () => {
      expect(parseServerShutdownRetryMs(undefined)).toBe(3000);
      expect(parseServerShutdownRetryMs(-1)).toBe(3000);
    });
  });

  describe("isIceConnectionHealthy", () => {
    it("returns true for connected and completed states", () => {
      expect(isIceConnectionHealthy("connected")).toBe(true);
      expect(isIceConnectionHealthy("completed")).toBe(true);
    });

    it("returns false for other states", () => {
      expect(isIceConnectionHealthy("disconnected")).toBe(false);
      expect(isIceConnectionHealthy(undefined)).toBe(false);
    });
  });

  describe("resolveStreamRecoveryAction", () => {
    it("requests offer when listening without a healthy stream", () => {
      expect(
        resolveStreamRecoveryAction(true, true, false, undefined)
      ).toBe("request-offer");
      expect(
        resolveStreamRecoveryAction(true, true, true, "disconnected")
      ).toBe("request-offer");
    });

    it("registers listener when stream is healthy", () => {
      expect(
        resolveStreamRecoveryAction(true, true, true, "connected")
      ).toBe("register-listener");
    });
  });

  describe("shouldRequestOfferOnBroadcastActive", () => {
    it("returns true when broadcast resumes without stream", () => {
      expect(
        shouldRequestOfferOnBroadcastActive("es", { es: true, en: false, ro: false }, false, undefined)
      ).toBe(true);
    });

    it("returns false when stream is already healthy", () => {
      expect(
        shouldRequestOfferOnBroadcastActive("es", { es: true, en: false, ro: false }, true, "connected")
      ).toBe(false);
    });
  });

  describe("computeWsReconnectDelayMs", () => {
    it("uses exponential backoff capped at 30s when idle", () => {
      expect(computeWsReconnectDelayMs(1, false)).toBe(1000);
      expect(computeWsReconnectDelayMs(5, false)).toBe(16000);
      expect(computeWsReconnectDelayMs(10, false)).toBe(30000);
    });

    it("uses faster backoff capped at 10s while listening", () => {
      expect(computeWsReconnectDelayMs(1, true)).toBe(0);
      expect(computeWsReconnectDelayMs(2, true)).toBe(1000);
      expect(computeWsReconnectDelayMs(5, true)).toBe(8000);
      expect(computeWsReconnectDelayMs(10, true)).toBe(10000);
    });
  });

  describe("resolveWsReconnectRecoveryAction", () => {
    it("registers listener when stream and ICE are healthy after ws reconnect", () => {
      expect(
        resolveWsReconnectRecoveryAction(true, true, "connected")
      ).toBe("register-listener");
    });

    it("requests offer when stream is missing or ICE is broken", () => {
      expect(
        resolveWsReconnectRecoveryAction(true, false, undefined)
      ).toBe("request-offer");
      expect(
        resolveWsReconnectRecoveryAction(true, true, "disconnected")
      ).toBe("request-offer");
    });

    it("returns none when user is not listening", () => {
      expect(
        resolveWsReconnectRecoveryAction(false, false, undefined)
      ).toBe("none");
    });
  });

  describe("shouldShowLivePlayerWhileListening", () => {
    it("keeps player visible while recovering", () => {
      expect(shouldShowLivePlayerWhileListening("es", "reconnecting")).toBe(true);
      expect(shouldShowLivePlayerWhileListening("es", "error")).toBe(true);
      expect(shouldShowLivePlayerWhileListening(null, "idle")).toBe(false);
    });
  });

  describe("isServerShutdownMessage", () => {
    it("detects server shutdown payloads", () => {
      expect(isServerShutdownMessage({ type: "server-shutdown" })).toBe(true);
      expect(isServerShutdownMessage({ type: "ping" })).toBe(false);
    });
  });

  describe("shouldRequestOfferOnWsReconnect", () => {
    it("returns true when user was listening", () => {
      expect(shouldRequestOfferOnWsReconnect(true)).toBe(true);
    });

    it("returns false when no language selected", () => {
      expect(shouldRequestOfferOnWsReconnect(false)).toBe(false);
    });
  });

  describe("resolveListenerRegistrationAction", () => {
    it("returns none when language or ws is missing", () => {
      expect(resolveListenerRegistrationAction(false, true, "connected")).toBe(
        "none"
      );
      expect(resolveListenerRegistrationAction(true, false, "connected")).toBe(
        "none"
      );
    });

    it("returns register-listener when WebRTC is healthy", () => {
      expect(
        resolveListenerRegistrationAction(true, true, "connected")
      ).toBe("register-listener");
      expect(
        resolveListenerRegistrationAction(true, true, "completed")
      ).toBe("register-listener");
    });

    it("returns request-offer when WebRTC is not yet connected", () => {
      expect(
        resolveListenerRegistrationAction(true, true, "checking")
      ).toBe("request-offer");
      expect(resolveListenerRegistrationAction(true, true, undefined)).toBe(
        "request-offer"
      );
    });
  });

  describe("shouldRegisterListenerOnHeartbeat", () => {
    it("returns true only when listening with an open websocket", () => {
      expect(shouldRegisterListenerOnHeartbeat(true, true)).toBe(true);
      expect(shouldRegisterListenerOnHeartbeat(false, true)).toBe(false);
      expect(shouldRegisterListenerOnHeartbeat(true, false)).toBe(false);
    });
  });

  describe("buildRegisterListenerPayload", () => {
    it("builds register-listener message payload with clientId and platform", () => {
      expect(buildRegisterListenerPayload("en", "client-1", "android")).toEqual({
        type: "register-listener",
        language: "en",
        clientId: "client-1",
        platform: "android",
      });
    });
  });

  describe("buildRequestOfferPayload", () => {
    it("builds request-offer message payload with clientId and platform", () => {
      expect(buildRequestOfferPayload("es", "client-2", "ios")).toEqual({
        type: "request-offer",
        language: "es",
        clientId: "client-2",
        platform: "ios",
      });
    });
  });

  describe("resolveListenerPlatform", () => {
    it("keeps supported listener platforms and falls back for others", () => {
      expect(resolveListenerPlatform("android")).toBe("android");
      expect(resolveListenerPlatform("ios")).toBe("ios");
      expect(resolveListenerPlatform("web")).toBe("web");
      expect(resolveListenerPlatform("macos")).toBe("unknown");
    });
  });

  describe("buildStopListeningPayload", () => {
    it("builds stop-listening message payload with clientId", () => {
      expect(buildStopListeningPayload("ro", "client-3")).toEqual({
        type: "stop-listening",
        language: "ro",
        clientId: "client-3",
      });
    });
  });
});
