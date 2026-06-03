import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Easing,
  Platform,
  NativeModules,
  AppState,
  BackHandler,
  PermissionsAndroid,
  Alert,
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from "react-native-webrtc";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import Constants from "expo-constants";
import VIForegroundService from "@voximplant/react-native-foreground-service";
import InCallManager from "react-native-incall-manager";

import { ChevronLeft, Info } from "lucide-react-native";
import { TURN_USERNAME, TURN_CREDENTIAL, SIGNALING_URL as SIGNALING_URL_ENV } from "@env";

import { LanguageSelector } from "./src/components/LanguageSelector";
import { LiveStreamPlayer } from "./src/components/LiveStreamPlayer";
import { ChurchInfoScreen } from "./src/components/ChurchInfoScreen";
import { UiLanguageSwitcher } from "./src/components/UiLanguageSwitcher";
import { I18nProvider, useI18n } from "./src/i18n/I18nContext";
import {
  canAttemptReconnect,
  computeWsReconnectDelayMs,
  getHeartbeatIntervalMs,
  getReconnectDebounceMs,
  ICE_DISCONNECTED_GRACE_MS,
  isServerShutdownMessage,
  resolveStreamRecoveryAction,
  resolveLivePlayerReconnectingVisible,
  shouldReconnectWebRtc,
  shouldRecoverOnForeground,
  shouldReconnectAfterIceGrace,
  shouldRequestOfferOnBroadcastActive,
  shouldRequestOfferOnWsReconnect,
  shouldShowLivePlayerWhileListening,
  shouldSendBackgroundKeepalive,
  shouldSendForegroundRecoveryPing,
  parseServerShutdownRetryMs,
  buildRegisterListenerPayload,
  buildRequestOfferPayload,
  buildStopListeningPayload,
  type AppStateName,
} from "./src/streaming/listenerRecovery";
import {
  getOrCreatePersistentClientId,
  buildIdentifyPayload,
} from "./src/streaming/persistentClientId";
import { errorContext, logStreamEvent } from "./src/streaming/streamLogger";

interface AndroidAudioPermissionCopy {
  title: string;
  message: string;
  buttonNeutral: string;
  buttonNegative: string;
  buttonPositive: string;
}

const { AudioModeModule } = NativeModules;

// --- Helper: Safe Audio Module Call ---
const safeAudioModuleCall = (
  methodName: string,
  ...args: (string | number | boolean)[]
) => {
  try {
    if (!AudioModeModule) {
      console.warn(`⚠️ AudioModeModule no disponible para ${methodName}`);
      return false;
    }
    
    if (typeof AudioModeModule[methodName] !== 'function') {
      console.warn(`⚠️ Método ${methodName} no existe en AudioModeModule`);
      return false;
    }
    
    AudioModeModule[methodName](...args);
    console.log(`✅ ${methodName} ejecutado correctamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error en ${methodName}:`, error);
    return false;
  }
};

// --- Helper: Request Audio Permissions ---
const requestAudioPermissions = async (
  copy: AndroidAudioPermissionCopy
): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: copy.title,
        message: copy.message,
        buttonNeutral: copy.buttonNeutral,
        buttonNegative: copy.buttonNegative,
        buttonPositive: copy.buttonPositive,
      }
    );
    
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('✅ Permiso de audio concedido');
      return true;
    } else {
      console.warn('⚠️ Permiso de audio denegado');
      return false;
    }
  } catch (err) {
    console.error('❌ Error solicitando permisos:', err);
    return false;
  }
};

type InfoPlistEnv = { SIGNALING_URL?: string; TURN_USERNAME?: string; TURN_CREDENTIAL?: string };
const infoPlist = (Constants?.expoConfig?.ios?.infoPlist ?? {}) as InfoPlistEnv;

const SIGNALING_URL =
  (process?.env?.EXPO_PUBLIC_SIGNALING_URL as string) ||
  SIGNALING_URL_ENV ||
  infoPlist.SIGNALING_URL ||
  "wss://webrtc-live-ct59.onrender.com";

const TURN_USERNAME_FINAL =
  (process?.env?.EXPO_PUBLIC_TURN_USERNAME as string) ||
  TURN_USERNAME ||
  infoPlist.TURN_USERNAME ||
  "";

const TURN_CREDENTIAL_FINAL =
  (process?.env?.EXPO_PUBLIC_TURN_CREDENTIAL as string) ||
  TURN_CREDENTIAL ||
  infoPlist.TURN_CREDENTIAL ||
  "";

interface CandidatePayload {
  candidate: {
    candidate?: string;
    sdpMLineIndex?: number | null;
    sdpMid?: string | null;
  };
}

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: [
        "turn:standard.relay.metered.ca:80",
        "turn:standard.relay.metered.ca:443",
        "turn:standard.relay.metered.ca:80?transport=tcp",
        "turn:standard.relay.metered.ca:443?transport=tcp",
      ],
      username: TURN_USERNAME_FINAL,
      credential: TURN_CREDENTIAL_FINAL,
    },
  ],
};

function AppScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // --- WS & Refs ---
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const allowWSReconnect = useRef(true);

  // --- Estados ---
  const [activeLangs, setActiveLangs] = useState({
    es: false,
    en: false,
    ro: false,
  });

  const [language, setLanguage] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showInfoScreen, setShowInfoScreen] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [wsState, setWsState] = useState<"init" | "open" | "error" | "close">(
    "init"
  );
  const [wsError, setWsError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueueRef = useRef<CandidatePayload["candidate"][]>([]);
  const fgServiceRef = useRef<any>(null);
  const channelCreatedRef = useRef(false);
  const fgStartedRef = useRef(false);
  const prevWsStateRef = useRef<typeof wsState>("init");
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceDisconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceReconnectAttemptRef = useRef(0);
  const reconnectWebRtcRef = useRef<(reason: string) => Promise<void>>(
    async () => {}
  );
  const appStateRef = useRef<string>(AppState.currentState);
  const clientIdRef = useRef<string | null>(null);
  const wsReconnectAttemptRef = useRef(0);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverRecoveryPendingRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const requestOfferRef = useRef<() => void>(() => {});
  const createSocketRef = useRef<() => void>(() => {});
  const languageRef = useRef<string | null>(null);
  languageRef.current = language;
  remoteStreamRef.current = remoteStream;

  const ensureClientId = useCallback(async (): Promise<string> => {
    if (clientIdRef.current) {
      return clientIdRef.current;
    }
    const id = await getOrCreatePersistentClientId();
    clientIdRef.current = id;
    return id;
  }, []);

  const sendIdentify = useCallback(() => {
    const clientId = clientIdRef.current;
    if (
      !clientId ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    wsRef.current.send(JSON.stringify(buildIdentifyPayload(clientId)));
    logStreamEvent("verbose", "ws.identify.sent", { clientId });
  }, []);

  useEffect(() => {
    void getOrCreatePersistentClientId().then((id) => {
      clientIdRef.current = id;
      logStreamEvent("verbose", "ws.client_id.ready", { clientId: id });
      sendIdentify();
    });
  }, [sendIdentify]);

  // --- Audio setup ---
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        });
        console.log("🎧 Audio configurado correctamente");
      } catch (e) {
        console.warn("⚠️ Error configurando audio:", e);
      }
    })();
  }, []);

  const configureListenerAudio = useCallback(async () => {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    });
  }, []);

  // --- Foreground Service Android ---
  useEffect(() => {
    if (Platform.OS === "android")
      fgServiceRef.current = VIForegroundService.getInstance();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      (async () => {
        try {
          const grantedAudio = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          if (grantedAudio !== PermissionsAndroid.RESULTS.GRANTED)
            console.warn("⚠️ Permiso RECORD_AUDIO denegado");
          if (Platform.Version >= 33) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
          }
        } catch (e) {
          console.warn("⚠️ Error solicitando permisos:", e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!showInfoScreen || Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowInfoScreen(false);
      return true;
    });
    return () => subscription.remove();
  }, [showInfoScreen]);

  const startForegroundService = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      if (!fgServiceRef.current) return;
      if (!channelCreatedRef.current) {
        await fgServiceRef.current.createNotificationChannel({
          id: "stream_channel",
          name: t("foregroundService.channelName"),
          description: t("foregroundService.channelDescription"),
          importance: 4,
        });
        channelCreatedRef.current = true;
      }
      await fgServiceRef.current.startService({
        channelId: "stream_channel",
        id: 420,
        title: t("foregroundService.notificationTitle"),
        text: t("foregroundService.notificationText"),
        icon: "ic_launcher",
      });
      fgStartedRef.current = true;
      AudioModeModule?.setModeNormal();
    } catch (err) {
      console.error("⚠️ Error iniciando servicio:", err);
    }
  }, [t]);

  const stopForegroundService = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      if (fgServiceRef.current && fgStartedRef.current) {
        await fgServiceRef.current.stopService();
        fgStartedRef.current = false;
      }
    } catch (err) {
      console.warn("⚠️ Error deteniendo servicio:", err);
    }
  }, []);

  // --- Handlers defined BEFORE usage in effects ---

  const getIceConnectionState = useCallback((): string | undefined => {
    return (pcRef.current as { iceConnectionState?: string } | null)
      ?.iceConnectionState;
  }, []);

  const requestOffer = useCallback(() => {
    const clientId = clientIdRef.current;
    if (
      !language ||
      !clientId ||
      !wsRef.current ||
      wsRef.current?.readyState !== WebSocket.OPEN
    )
      return;
    logStreamEvent("verbose", "signaling.request_offer", { language });
    wsRef.current?.send(
      JSON.stringify(buildRequestOfferPayload(language, clientId))
    );
    setStatus("requesting");
  }, [language]);

  const registerListener = useCallback(() => {
    const clientId = clientIdRef.current;
    if (
      !language ||
      !clientId ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    logStreamEvent("verbose", "signaling.register_listener", { language });
    wsRef.current.send(
      JSON.stringify(buildRegisterListenerPayload(language, clientId))
    );
  }, [language]);

  const sendWsPing = useCallback((source: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping", source }));
      logStreamEvent("verbose", "ws.heartbeat", { source });
    }
  }, []);

  const handleCandidate = useCallback(async (data: CandidatePayload) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (err) {
        console.warn("⚠️ Error agregando candidate:", err);
      }
    } else {
      candidateQueueRef.current.push(data.candidate);
    }
  }, []);

  const handleOffer = useCallback(
    async (data: { offer: { sdp: string; type: string | null }; clientId: string }) => {
      setStatus("connecting");
      if (pcRef.current) pcRef.current.close();
      interface RTCTrackEventWithStreams {
        streams: MediaStream[];
      }
      interface RTCIceEvent {
        candidate: RTCIceCandidate | null;
      }
      interface RTCPeerConnectionWithIce {
        iceConnectionState: RTCIceConnectionState;
      }
      type PeerConnectionWithHandlers = RTCPeerConnection & {
        onicecandidate: (ev: RTCIceEvent) => void;
        ontrack: (ev: RTCTrackEventWithStreams) => void;
        oniceconnectionstatechange: (() => void) | null;
        iceConnectionState: string;
      };
      const pc = new RTCPeerConnection(
        rtcConfig
      ) as PeerConnectionWithHandlers;
      pcRef.current = pc;

      pc.ontrack = (event: RTCTrackEventWithStreams) => {
        const stream = event.streams[0];
        if (stream) {
          setRemoteStream(stream);
          setStatus("connected");
          iceReconnectAttemptRef.current = 0;
          if (Platform.OS === "android") {
            try {
              if (AudioModeModule?.setModeNormal)
                AudioModeModule.setModeNormal();
              InCallManager.start({ media: "audio", auto: true });
            } catch (err) {
              console.warn("⚠️ Error ajustando audio:", err);
            }
          }
          startForegroundService().catch(console.error);
        }
      };

      pc.onicecandidate = (ev: RTCIceEvent) => {
        if (ev.candidate && wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "candidate",
              candidate: ev.candidate,
              target: data.clientId,
            })
          );
        }
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;

        if (iceState === "connected" || iceState === "completed") {
          if (iceDisconnectTimerRef.current) {
            clearTimeout(iceDisconnectTimerRef.current);
            iceDisconnectTimerRef.current = null;
          }
          logStreamEvent("verbose", "webrtc.ice.connected", {
            language: language ?? null,
            iceState,
          });
          return;
        }

        if (iceState === "failed" || iceState === "disconnected") {
          logStreamEvent("warn", "webrtc.ice.degraded", {
            language: language ?? null,
            iceState,
          });
        }

        if (iceState === "failed") {
          void reconnectWebRtcRef.current("ice-failed");
          return;
        }

        if (iceState === "disconnected") {
          if (iceDisconnectTimerRef.current) {
            clearTimeout(iceDisconnectTimerRef.current);
          }
          iceDisconnectTimerRef.current = setTimeout(() => {
            iceDisconnectTimerRef.current = null;
            const currentPc = pcRef.current as RTCPeerConnectionWithIce | null;
            if (
              currentPc &&
              shouldReconnectAfterIceGrace(currentPc.iceConnectionState)
            ) {
              void reconnectWebRtcRef.current("ice-disconnected");
            }
          }, ICE_DISCONNECTED_GRACE_MS);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        candidateQueueRef.current.forEach((c) =>
          pc.addIceCandidate(new RTCIceCandidate(c))
        );
        candidateQueueRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current?.send(
          JSON.stringify({ type: "answer", answer, target: data.clientId })
        );
      } catch (err) {
        console.warn("❌ Error procesando oferta:", err);
        setStatus("error");
      }
    },
    [startForegroundService]
  );

  const stopListening = useCallback(() => {
    allowWSReconnect.current = false; // Evita reconexión automática de PC
    try {
      if (iceDisconnectTimerRef.current) {
        clearTimeout(iceDisconnectTimerRef.current);
        iceDisconnectTimerRef.current = null;
      }
      iceReconnectAttemptRef.current = 0;

      // Enviar stop-listening si WS está abierto
      const clientId = clientIdRef.current;
      if (wsRef.current?.readyState === WebSocket.OPEN && language && clientId) {
        wsRef.current.send(
          JSON.stringify(buildStopListeningPayload(language, clientId))
        );
        console.log("📩 stop-listening enviado");
      }

      // Cerrar PeerConnection
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;

      // Reset UI y estado
      setRemoteStream(null);
      setLanguage(null);
      setStatus("idle");
      setSpeakerOn(false);

      // Audio Android
      if (Platform.OS === "android") {
        InCallManager.setSpeakerphoneOn(false);
        InCallManager.stop();
        safeAudioModuleCall('resetAudioState');
        safeAudioModuleCall('stopAudioMonitoring');
        safeAudioModuleCall('stopCleanupService');
      }

      // Foreground service
      stopForegroundService().catch(console.warn);
      
      // CRITICAL FIX: Restaurar allowWSReconnect después de la limpieza
      // Esto permite futuras reconexiones después de detener
      setTimeout(() => {
        allowWSReconnect.current = true;
        console.log("✅ WebSocket reconnect habilitado de nuevo");
      }, 500);
    } catch (err) {
      console.warn("⚠️ Error stopping listening:", err);
    }
  }, [language, stopForegroundService]);

  // --- WebSocket ---
  const scheduleWsReconnect = useCallback(() => {
    if (!allowWSReconnect.current) {
      return;
    }
    if (wsReconnectTimerRef.current) {
      return;
    }
    wsReconnectAttemptRef.current += 1;
    const delay = computeWsReconnectDelayMs(
      wsReconnectAttemptRef.current,
      Boolean(languageRef.current)
    );
    logStreamEvent(
      "info",
      "ws.reconnect.scheduled",
      { attempt: wsReconnectAttemptRef.current, delayMs: delay }
    );
    wsReconnectTimerRef.current = setTimeout(() => {
      wsReconnectTimerRef.current = null;
      createSocketRef.current();
    }, delay);
  }, []);

  const createSocket = useCallback(() => {
    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch {
        // Socket may already be closed
      }
      wsRef.current = null;
    }

    logStreamEvent("verbose", "ws.connecting", {});
    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      wsReconnectAttemptRef.current = 0;
      serverRecoveryPendingRef.current = false;
      setWsState("open");
      setWsError(null);
      logStreamEvent("info", "ws.connected", {
        clientId: clientIdRef.current,
        language: languageRef.current,
      });
      sendIdentify();
    };
    ws.onerror = (e: ErrorEvent | Event) => {
      const msg = e instanceof ErrorEvent ? String(e.message) : JSON.stringify(e);
      setWsState("error");
      setWsError(msg);
      logStreamEvent("warn", "ws.error", {
        message: msg,
        language: languageRef.current,
      });
    };
    ws.onclose = () => {
      setWsState("close");
      logStreamEvent("warn", "ws.disconnected", {
        language: languageRef.current,
        clientId: clientIdRef.current,
      });
      if (!allowWSReconnect.current) {
        return;
      }
      scheduleWsReconnect();
    };

  }, [sendIdentify, scheduleWsReconnect]);

  useEffect(() => {
    createSocketRef.current = createSocket;
  }, [createSocket]);

  useEffect(() => {
    if (socket) {
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "active-broadcasts") {
                  const active = {
                    es: !!data.active?.es,
                    en: !!data.active?.en,
                    ro: !!data.active?.ro,
                  };
                  setActiveLangs(active);
                  logStreamEvent("verbose", "signaling.active_broadcasts", {
                    active,
                  });

                  const lang = languageRef.current;
                  if (
                    lang &&
                    shouldRequestOfferOnBroadcastActive(
                      lang,
                      active,
                      Boolean(remoteStreamRef.current),
                      (pcRef.current as { iceConnectionState?: string } | null)
                        ?.iceConnectionState
                    ) &&
                    wsRef.current?.readyState === WebSocket.OPEN
                  ) {
                    logStreamEvent("info", "signaling.broadcast_resumed", {
                      language: lang,
                    });
                    requestOfferRef.current();
                  }
                }
                if (data.type === "offer") handleOffer(data);
                if (data.type === "candidate") handleCandidate(data);
                if (isServerShutdownMessage(data)) {
                  serverRecoveryPendingRef.current = true;
                  const retryMs = parseServerShutdownRetryMs(data.retryAfterMs);
                  logStreamEvent("warn", "server.shutdown", {
                    retryMs,
                    language: languageRef.current,
                  });
                  if (languageRef.current) {
                    setStatus("reconnecting");
                  }
                  setTimeout(() => {
                    void reconnectWebRtcRef.current("server-shutdown");
                  }, retryMs);
                  try {
                    wsRef.current?.close();
                  } catch {
                    // Socket may already be closing
                  }
                }
              } catch (err) {
                logStreamEvent("error", "ws.message.parse_failed", errorContext(err));
              }
        }
    }
  }, [socket, handleOffer, handleCandidate]);

  useEffect(() => {
    allowWSReconnect.current = true;
    createSocket();
    return () => {
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      wsRef.current?.close();
    };
  }, []);

  // Re-register language when WebSocket reconnects while user was already listening
  useEffect(() => {
    const wasReconnecting = prevWsStateRef.current !== "open" && wsState === "open";
    prevWsStateRef.current = wsState;
    if (wasReconnecting && wsRef.current?.readyState === WebSocket.OPEN) {
      sendIdentify();
      if (language && shouldRequestOfferOnWsReconnect(true)) {
        logStreamEvent("info", "ws.reconnected", {
          language,
          clientId: clientIdRef.current,
        });
        requestOffer();
      }
    }
  }, [wsState, language, sendIdentify, requestOffer]);

  // Heartbeat: platform-aware interval; includes listener registration while listening.
  useEffect(() => {
    const intervalMs = getHeartbeatIntervalMs(Boolean(language), Platform.OS);
    if (wsState !== "open" || !wsRef.current) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    heartbeatIntervalRef.current = setInterval(() => {
      sendWsPing("interval");
      const recoveryAction = resolveStreamRecoveryAction(
        Boolean(language),
        wsRef.current?.readyState === WebSocket.OPEN,
        Boolean(remoteStreamRef.current),
        getIceConnectionState()
      );
      if (recoveryAction === "register-listener") {
        registerListener();
      } else if (recoveryAction === "request-offer") {
        requestOffer();
      }
    }, intervalMs);
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [wsState, language, sendWsPing, registerListener]);

  // --- Helper to wait for socket connection ---
  const waitForSocketConnection = useCallback(async () => {
    const startTime = Date.now();
    return new Promise<boolean>((resolve) => {
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          logStreamEvent("verbose", "ws.wait.connected", {});
          resolve(true);
        } else if (Date.now() - startTime > 10000) {
          logStreamEvent("warn", "ws.wait.timeout", {
            language: languageRef.current,
            timeoutMs: 10000,
          });
          resolve(false);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }, []);

  const reconnectWebRtc = useCallback(
    async (reason: string) => {
      if (!language) return;

      const now = Date.now();
      if (
        !canAttemptReconnect(
          iceReconnectAttemptRef.current,
          now,
          getReconnectDebounceMs(true)
        )
      ) {
        logStreamEvent("verbose", "webrtc.reconnect.debounced", { reason });
        return;
      }
      iceReconnectAttemptRef.current = now;

      const hasStream = Boolean(remoteStreamRef.current);
      const iceState = getIceConnectionState();
      const wsOnlyRecovery =
        !shouldReconnectWebRtc(hasStream, iceState);

      logStreamEvent(
        wsOnlyRecovery ? "info" : "warn",
        wsOnlyRecovery ? "webrtc.ws_only_recovery" : "webrtc.reconnect.started",
        { reason, language, iceState }
      );

      allowWSReconnect.current = true;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        createSocket();
        const connected = await waitForSocketConnection();
        if (!connected) {
          setStatus("reconnecting");
          return;
        }
      }

      registerListener();
      if (wsOnlyRecovery) {
        setStatus("connected");
        return;
      }

      setStatus("reconnecting");

      if (iceDisconnectTimerRef.current) {
        clearTimeout(iceDisconnectTimerRef.current);
        iceDisconnectTimerRef.current = null;
      }

      try {
        pcRef.current?.close();
      } catch {
        // Peer may already be closed
      }
      pcRef.current = null;
      setRemoteStream(null);
      candidateQueueRef.current = [];

      requestOffer();
    },
    [
      language,
      createSocket,
      waitForSocketConnection,
      requestOffer,
      registerListener,
      getIceConnectionState,
    ]
  );

  useEffect(() => {
    reconnectWebRtcRef.current = reconnectWebRtc;
  }, [reconnectWebRtc]);

  useEffect(() => {
    requestOfferRef.current = requestOffer;
  }, [requestOffer]);

  const handleSelectLanguage = useCallback(async (code: string) => {
    const active = activeLangs[code as keyof typeof activeLangs];
    if (!active) return;
    
    try {
      // 1. Verificar permisos PRIMERO
      console.log('🔐 Verificando permisos de audio...');
      const hasPermission = await requestAudioPermissions({
        title: t("permissions.audioTitle"),
        message: t("permissions.audioMessage"),
        buttonNeutral: t("permissions.buttonNeutral"),
        buttonNegative: t("permissions.buttonNegative"),
        buttonPositive: t("permissions.buttonPositive"),
      });

      if (!hasPermission) {
        console.error('❌ Permisos de audio denegados');
        Alert.alert(
          t("alerts.permissionsRequiredTitle"),
          t("alerts.permissionsRequiredBody"),
          [{ text: t("alerts.ok") }]
        );
        return;
      }
      
      // 2. Inicializar AudioModeModule de forma segura
      if (Platform.OS === 'android') {
        console.log('🔊 Inicializando módulos de audio...');
        safeAudioModuleCall('setModeNormal');
      }
      
      // 3. Asegurar que allowWSReconnect esté habilitado
      allowWSReconnect.current = true;
      
      // 4. Verificar/crear WebSocket
      if (
        !wsRef.current ||
        wsRef.current?.readyState !== WebSocket.OPEN
      ) {
        console.log(
          "🔄 WebSocket cerrado, recreando y esperando conexión…"
        );
        createSocket();
        
        // Esperar a que el WebSocket se abra (con timeout de 5s)
        const connected = await waitForSocketConnection();
        if (!connected) {
          console.error("❌ No se pudo conectar WebSocket");
          Alert.alert(
            t("alerts.connectionErrorTitle"),
            t("alerts.connectionErrorBody"),
            [{ text: t("alerts.ok") }]
          );
          return;
        }
      }
      
      // 5. Establecer el idioma
      console.log(`🎧 Estableciendo idioma: ${code}`);
      setLanguage(code);
      
    } catch (error) {
      console.error('❌ Error crítico al presionar botón de idioma:', error);
      Alert.alert(
        t("alerts.genericErrorTitle"),
        t("alerts.genericErrorBody"),
        [{ text: t("alerts.ok") }]
      );
    }
  }, [activeLangs, createSocket, waitForSocketConnection, t]);

  useEffect(() => {
    const initListening = async () => {
      if (!language) {
        // Detener servicios si language es null
        if (Platform.OS === "android") {
          safeAudioModuleCall('stopAudioMonitoring');
          safeAudioModuleCall('stopCleanupService');
        }
        return;
      }

      await ensureClientId();

      // WS: si está cerrado, recrearlo
      if (!wsRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log("🔄 WebSocket cerrado, recreando...");

        allowWSReconnect.current = true;
        createSocket();

        // Esperar a que se abra
        await waitForSocketConnection();
      }

      sendIdentify();

      // Servicios Android
      if (Platform.OS === "android") {
        console.log('🔊 Iniciando servicios de audio Android...');
        safeAudioModuleCall('startAudioMonitoring');
        safeAudioModuleCall('startCleanupService');
      }

      // Solicitar offer
      requestOffer();
    };

    void initListening();
  }, [
    language,
    createSocket,
    requestOffer,
    waitForSocketConnection,
    ensureClientId,
    sendIdentify,
  ]);

  // --- AppState: foreground recovery (iOS) + Android audio services ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const prevState = appStateRef.current as AppStateName;
      const next = nextAppState as AppStateName;
      appStateRef.current = nextAppState;

      if (shouldSendForegroundRecoveryPing(prevState, next)) {
        sendWsPing("foreground");
        if (language && wsRef.current?.readyState === WebSocket.OPEN) {
          registerListener();
        }
        const iceState = getIceConnectionState();
        if (
          shouldRecoverOnForeground(
            Boolean(language),
            iceState,
            Boolean(remoteStreamRef.current)
          )
        ) {
          void reconnectWebRtc("foreground-recovery");
        }
      } else if (shouldSendBackgroundKeepalive(Boolean(language), next)) {
        sendWsPing("background");
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          registerListener();
        }
      }

      if (Platform.OS === "android") {
        try {
          if (nextAppState === "active") {
            InCallManager.setSpeakerphoneOn(speakerOn);
            console.log(
              "🔊 Audio restaurado según estado speakerOn:",
              speakerOn
            );
          } else if (
            nextAppState === "background" ||
            nextAppState === "inactive"
          ) {
            safeAudioModuleCall('stopAudioMonitoring');
            safeAudioModuleCall('stopCleanupService');
            console.log("🔇 Audio services stopped, altavoz intacto");
         }
        } catch (e) {
          console.warn("⚠️ Error manejando AppState audio:", e);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [language, speakerOn, sendWsPing, reconnectWebRtc, registerListener, getIceConnectionState]);

  // --- Limpieza completa al desmontar ---
  const cleanupAudioOnUnmount = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      InCallManager.setSpeakerphoneOn(false);
      InCallManager.stop();
      if (AudioModeModule?.resetAudioState) AudioModeModule.resetAudioState();
      else if (AudioModeModule?.setModeNormal) AudioModeModule.setModeNormal();
      if (AudioModeModule?.stopAudioMonitoring) AudioModeModule.stopAudioMonitoring();
      if (AudioModeModule?.stopCleanupService) AudioModeModule.stopCleanupService();
      if (AudioModeModule?.forceNormalAudioMode) AudioModeModule.forceNormalAudioMode();
      console.log("🧹 Limpieza completa de audio al desmontar");
    } catch (e) {
      console.warn("⚠️ Error cleanup audio:", e);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (iceDisconnectTimerRef.current) {
        clearTimeout(iceDisconnectTimerRef.current);
        iceDisconnectTimerRef.current = null;
      }
      stopForegroundService().catch(() => {});
      const clientId = clientIdRef.current;
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        languageRef.current &&
        clientId
      ) {
        try {
          wsRef.current.send(
            JSON.stringify(
              buildStopListeningPayload(languageRef.current, clientId)
            )
          );
        } catch {
          // Ignore if send fails during unmount
        }
      }
      wsRef.current?.close();
      cleanupAudioOnUnmount();
    };
  }, [stopForegroundService, cleanupAudioOnUnmount]);

  // --- Speaker toggle ---
  const toggleSpeaker = useCallback(() => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    InCallManager.setSpeakerphoneOn(newState);
  }, [speakerOn]);

  // --- Emergency reset ---
  const emergencyAudioReset = useCallback(async () => {
    if (Platform.OS === "android") {
      try {
        InCallManager.setSpeakerphoneOn(false);
        InCallManager.stop();
        if (AudioModeModule?.resetAudioState) AudioModeModule.resetAudioState();
        if (AudioModeModule?.stopAudioMonitoring)
          AudioModeModule.stopAudioMonitoring();
        if (AudioModeModule?.stopCleanupService)
          AudioModeModule.stopCleanupService();
        if (AudioModeModule?.forceNormalAudioMode)
          AudioModeModule.forceNormalAudioMode();
        else if (AudioModeModule?.setModeNormal)
          AudioModeModule.setModeNormal();
        setSpeakerOn(false);
        await reconnectWebRtc("emergency-reset");
        console.log("🚨 Emergency audio reset executed (Android)");
      } catch (e) {
        console.warn("⚠️ Error en emergency reset:", e);
      }
      return;
    }

    try {
      await configureListenerAudio();
      await reconnectWebRtc("emergency-reset");
      console.log("🚨 Emergency audio reset executed (iOS)");
    } catch (e) {
      console.warn("⚠️ Error en emergency reset iOS:", e);
    }
  }, [configureListenerAudio, reconnectWebRtc]);

  // --- Animación audio ---
  const animScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (remoteStream) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animScale, {
            toValue: 1.3,
            duration: 470,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(animScale, {
            toValue: 1,
            duration: 470,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      animation.start();
    } else animScale.setValue(1);
    return () => {
      if (animation) animation.stop();
    };
  }, [remoteStream, animScale]);

  // ---------- UI ----------
  if (showInfoScreen) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#171f2e" }}
        edges={["top", "bottom"]}
      >
        <View
          style={[styles.titleBand, styles.infoScreenTitleBand, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity
            style={styles.infoHeaderBack}
            onPress={() => setShowInfoScreen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("churchInfo.backA11y")}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color="#3ee8ef" />
            <Text style={styles.infoHeaderBackText}>{t("churchInfo.back")}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, styles.infoScreenTitleText]} numberOfLines={1}>
            {t("app.titleInfo")}
          </Text>
          <View style={styles.infoHeaderBalance} pointerEvents="none" />
        </View>
        <ChurchInfoScreen />
        <View style={[styles.footerBand, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footer}>{t("app.footerCopyright")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#171f2e" }}
      edges={["top", "bottom"]}
    >
      <View style={[styles.titleBand, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t("app.titleMain")}</Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: insets.bottom + 90,
            paddingTop: insets.top + 60,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t("app.subtitle")}</Text>
        <UiLanguageSwitcher />
        {!shouldShowLivePlayerWhileListening(language, status) ? (
          <LanguageSelector
            activeLangs={activeLangs}
            onSelectLanguage={handleSelectLanguage}
          />
        ) : (
          <LiveStreamPlayer
            remoteStream={remoteStream}
            animScale={animScale}
            stopListening={stopListening}
            speakerOn={speakerOn}
            toggleSpeaker={toggleSpeaker}
            emergencyAudioReset={emergencyAudioReset}
            isReconnecting={resolveLivePlayerReconnectingVisible(
              status,
              Boolean(remoteStream),
              getIceConnectionState()
            )}
          />
        )}
        <View style={styles.serviceTimesBar}>
          <Text style={styles.serviceTimesText}>{t("app.serviceTimes")}</Text>
        </View>
        <TouchableOpacity
          style={styles.infoNavButton}
          onPress={() => setShowInfoScreen(true)}
          accessibilityLabel={t("app.infoNavA11y")}
        >
          <Info size={20} color="#3ee8ef" />
          <Text style={styles.infoNavLabel}>{t("app.scheduleContact")}</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>{t("debug.title")}</Text>
            <Text style={styles.debugLine}>
              WS: {wsState} {wsError ? `(${wsError})` : ""}
            </Text>
            <Text style={styles.debugLine}>
              {t("debug.activeLangs")} es {activeLangs.es ? "✓" : "×"} · en{" "}
              {activeLangs.en ? "✓" : "×"} · ro {activeLangs.ro ? "✓" : "×"}
            </Text>
            <Text style={styles.debugLine}>
              {t("debug.state")} {status} · {t("debug.language")}{" "}
              {language ?? "-"}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={[styles.footerBand, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.footer}>{t("app.footerCopyright")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    minHeight: "100%",
    padding: 16,
    backgroundColor: "#171f2e",
    alignItems: "center",
  },
  titleBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingVertical: 8,
    backgroundColor: "#171f2e",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#334060",
    zIndex: 50,
  },
  infoScreenTitleBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  infoHeaderBack: {
    flexDirection: "row",
    alignItems: "center",
    width: 120,
  },
  infoHeaderBackText: {
    color: "#3ee8ef",
    fontSize: 16,
    fontWeight: "600",
  },
  infoScreenTitleText: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    paddingHorizontal: 4,
  },
  infoHeaderBalance: {
    width: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f4f7fb",
    margin: 0,
  },
  subtitle: {
    fontSize: 15,
    color: "#b7cced",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  serviceTimesBar: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#222e3c",
    borderRadius: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  serviceTimesText: {
    color: "#5de6fa",
    fontSize: 13,
    fontWeight: "600",
  },
  infoNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#222e3c",
    borderWidth: 1.2,
    borderColor: "#283753",
    alignSelf: "stretch",
  },
  infoNavLabel: {
    color: "#3ee8ef",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    color: "#b7cced",
    fontSize: 10,
    fontWeight: "500",
  },
  debugBox: {
    backgroundColor: "#0f1624",
    borderWidth: 1,
    borderColor: "#334060",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignSelf: "stretch",
  },
  debugTitle: {
    color: "#b7cced",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  debugLine: {
    color: "#e3f6fb",
    fontSize: 12,
    marginBottom: 2,
  },
  footerBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    backgroundColor: "#222e3cdd",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334060",
    zIndex: 50,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppScreen />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
