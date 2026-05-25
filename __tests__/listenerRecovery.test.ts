import {
  canAttemptReconnect,
  getHeartbeatIntervalMs,
  HEARTBEAT_IDLE_MS,
  HEARTBEAT_LISTENING_ANDROID_MS,
  HEARTBEAT_LISTENING_IOS_MS,
  RECONNECT_DEBOUNCE_MS,
  shouldRecoverOnForeground,
  shouldReconnectAfterIceGrace,
  shouldRegisterListenerOnHeartbeat,
  shouldSendForegroundRecoveryPing,
  shouldTriggerIceReconnect,
  parseServerShutdownRetryMs,
  resolveListenerRegistrationAction,
  isIceConnectionHealthy,
  buildRegisterListenerPayload,
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
    it("returns true on iOS when listening and ICE is missing or broken", () => {
      expect(shouldRecoverOnForeground("ios", true, undefined)).toBe(true);
      expect(shouldRecoverOnForeground("ios", true, "failed")).toBe(true);
    });

    it("returns false on Android or when ICE is healthy", () => {
      expect(shouldRecoverOnForeground("android", true, "failed")).toBe(
        false
      );
      expect(shouldRecoverOnForeground("ios", true, "connected")).toBe(false);
      expect(shouldRecoverOnForeground("ios", false, "failed")).toBe(false);
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
    it("builds register-listener message payload", () => {
      expect(buildRegisterListenerPayload("en")).toEqual({
        type: "register-listener",
        language: "en",
      });
    });
  });
});
