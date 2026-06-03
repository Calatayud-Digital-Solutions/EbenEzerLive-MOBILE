export const HEARTBEAT_IDLE_MS = 4 * 60 * 1000;
export const HEARTBEAT_LISTENING_ANDROID_MS = 15 * 1000;
export const HEARTBEAT_LISTENING_IOS_MS = 15 * 1000;
export const ICE_DISCONNECTED_GRACE_MS = 8000;
export const RECONNECT_DEBOUNCE_MS = 5000;
export const RECONNECT_DEBOUNCE_LISTENING_MS = 2000;

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

export function shouldSendBackgroundKeepalive(
  hasLanguage: boolean,
  nextState: AppStateName
): boolean {
  if (!hasLanguage) {
    return false;
  }
  return nextState === "background" || nextState === "inactive";
}

export function canAttemptReconnect(
  lastAttemptAt: number,
  now: number,
  debounceMs: number = RECONNECT_DEBOUNCE_MS
): boolean {
  return now - lastAttemptAt >= debounceMs;
}

export function getReconnectDebounceMs(isListening: boolean): number {
  return isListening ? RECONNECT_DEBOUNCE_LISTENING_MS : RECONNECT_DEBOUNCE_MS;
}

export function shouldRecoverOnForeground(
  isListening: boolean,
  iceState: string | undefined,
  hasRemoteStream: boolean
): boolean {
  if (!isListening) {
    return false;
  }
  if (hasRemoteStream && isIceConnectionHealthy(iceState)) {
    return false;
  }
  if (!iceState) {
    return !hasRemoteStream;
  }
  return shouldTriggerIceReconnect(iceState);
}

export function shouldReconnectWebRtc(
  hasRemoteStream: boolean,
  iceConnectionState: string | undefined
): boolean {
  if (hasRemoteStream && isIceConnectionHealthy(iceConnectionState)) {
    return false;
  }
  return true;
}

export function resolveLivePlayerReconnectingVisible(
  status: string,
  hasRemoteStream: boolean,
  iceConnectionState: string | undefined
): boolean {
  if (status === "error") {
    return true;
  }
  if (hasRemoteStream && isIceConnectionHealthy(iceConnectionState)) {
    return false;
  }
  return (
    status === "reconnecting" ||
    status === "requesting" ||
    status === "connecting"
  );
}

export const SERVER_SHUTDOWN_DEFAULT_RETRY_MS = 3000;
export const WS_RECONNECT_MAX_DELAY_MS = 30_000;
export const WS_RECONNECT_MAX_DELAY_LISTENING_MS = 10_000;

export function computeWsReconnectDelayMs(
  attempt: number,
  isListening: boolean = false
): number {
  const normalized = Math.max(1, attempt);
  const maxDelay = isListening
    ? WS_RECONNECT_MAX_DELAY_LISTENING_MS
    : WS_RECONNECT_MAX_DELAY_MS;
  const baseMs = isListening ? 500 : 1000;
  return Math.min(maxDelay, 2 ** (normalized - 1) * baseMs);
}

export function shouldRequestOfferOnBroadcastActive(
  language: string | null,
  activeLangs: Record<string, boolean>,
  hasRemoteStream: boolean,
  iceConnectionState: string | undefined
): boolean {
  if (!language || !activeLangs[language]) {
    return false;
  }
  if (hasRemoteStream && isIceConnectionHealthy(iceConnectionState)) {
    return false;
  }
  return true;
}

export function resolveStreamRecoveryAction(
  hasLanguage: boolean,
  wsOpen: boolean,
  hasRemoteStream: boolean,
  iceConnectionState: string | undefined
): ListenerRegistrationAction {
  if (!hasLanguage || !wsOpen) {
    return "none";
  }
  if (hasRemoteStream && isIceConnectionHealthy(iceConnectionState)) {
    return "register-listener";
  }
  return "request-offer";
}

export function shouldShowLivePlayerWhileListening(
  language: string | null,
  status: string
): boolean {
  return Boolean(language) && status !== "idle";
}

export function isServerShutdownMessage(data: {
  type?: string;
  retryAfterMs?: number;
}): boolean {
  return data.type === "server-shutdown";
}

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

export function shouldRequestOfferOnWsReconnect(hasLanguage: boolean): boolean {
  return hasLanguage;
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

export function buildRegisterListenerPayload(
  language: string,
  clientId: string
): {
  type: "register-listener";
  language: string;
  clientId: string;
} {
  return { type: "register-listener", language, clientId };
}

export function buildRequestOfferPayload(
  language: string,
  clientId: string
): {
  type: "request-offer";
  language: string;
  clientId: string;
} {
  return { type: "request-offer", language, clientId };
}

export function buildStopListeningPayload(
  language: string,
  clientId: string
): {
  type: "stop-listening";
  language: string;
  clientId: string;
} {
  return { type: "stop-listening", language, clientId };
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
