export const HEARTBEAT_IDLE_MS = 4 * 60 * 1000;
export const HEARTBEAT_LISTENING_ANDROID_MS = 25 * 1000;
export const HEARTBEAT_LISTENING_IOS_MS = 15 * 1000;
export const ICE_DISCONNECTED_GRACE_MS = 8000;
export const RECONNECT_DEBOUNCE_MS = 5000;

export type AppStateName = "active" | "background" | "inactive" | "unknown";

export type IceConnectionState =
  | "new"
  | "checking"
  | "connected"
  | "completed"
  | "disconnected"
  | "failed"
  | "closed";

export function getHeartbeatIntervalMs(
  isListening: boolean,
  platformOs: string
): number {
  if (!isListening) {
    return HEARTBEAT_IDLE_MS;
  }
  return platformOs === "ios"
    ? HEARTBEAT_LISTENING_IOS_MS
    : HEARTBEAT_LISTENING_ANDROID_MS;
}

export function shouldTriggerIceReconnect(state: string): boolean {
  return state === "disconnected" || state === "failed";
}

export function shouldReconnectAfterIceGrace(currentState: string): boolean {
  return currentState === "disconnected" || currentState === "failed";
}

export function shouldSendForegroundRecoveryPing(
  prevState: AppStateName,
  nextState: AppStateName
): boolean {
  const wasBackground =
    prevState === "background" || prevState === "inactive";
  return wasBackground && nextState === "active";
}

export function canAttemptReconnect(
  lastAttemptAt: number,
  now: number,
  debounceMs: number = RECONNECT_DEBOUNCE_MS
): boolean {
  return now - lastAttemptAt >= debounceMs;
}

export function shouldRecoverOnForeground(
  platformOs: string,
  isListening: boolean,
  iceState: string | undefined
): boolean {
  if (platformOs !== "ios" || !isListening) {
    return false;
  }
  if (!iceState) {
    return true;
  }
  return shouldTriggerIceReconnect(iceState);
}

export const SERVER_SHUTDOWN_DEFAULT_RETRY_MS = 3000;

export type ListenerRegistrationAction =
  | "none"
  | "register-listener"
  | "request-offer";

export function isIceConnectionHealthy(
  iceConnectionState: string | undefined
): boolean {
  return (
    iceConnectionState === "connected" ||
    iceConnectionState === "completed"
  );
}

export function resolveListenerRegistrationAction(
  hasLanguage: boolean,
  wsOpen: boolean,
  iceConnectionState: string | undefined
): ListenerRegistrationAction {
  if (!hasLanguage || !wsOpen) {
    return "none";
  }
  if (isIceConnectionHealthy(iceConnectionState)) {
    return "register-listener";
  }
  return "request-offer";
}

export function shouldRegisterListenerOnHeartbeat(
  hasLanguage: boolean,
  wsOpen: boolean
): boolean {
  return hasLanguage && wsOpen;
}

export function buildRegisterListenerPayload(language: string): {
  type: "register-listener";
  language: string;
} {
  return { type: "register-listener", language };
}

export function parseServerShutdownRetryMs(
  retryAfterMs: number | undefined
): number {
  if (
    typeof retryAfterMs === "number" &&
    Number.isFinite(retryAfterMs) &&
    retryAfterMs >= 0
  ) {
    return retryAfterMs;
  }
  return SERVER_SHUTDOWN_DEFAULT_RETRY_MS;
}
