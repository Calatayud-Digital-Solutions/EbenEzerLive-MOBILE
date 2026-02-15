import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Easing,
  Platform,
  NativeModules,
  Linking,
  AppState,
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

import { Info } from "lucide-react-native";
import { TURN_USERNAME, TURN_CREDENTIAL, SIGNALING_URL as SIGNALING_URL_ENV } from "@env";

import { LanguageSelector } from "./src/components/LanguageSelector";
import { LiveStreamPlayer } from "./src/components/LiveStreamPlayer";
import { ChurchInfoScreen } from "./src/components/ChurchInfoScreen";

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
const requestAudioPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Permiso de Audio',
        message: 'Esta aplicación necesita acceso al audio para recibir la transmisión en vivo.',
        buttonNeutral: 'Preguntar Después',
        buttonNegative: 'Cancelar',
        buttonPositive: 'Aceptar',
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

function AppContent() {
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
  useEffect(() => {
    console.log("🌍 Idiomas activos actualizados:", activeLangs);
  }, [activeLangs]);

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

  const startForegroundService = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      if (!fgServiceRef.current) return;
      if (!channelCreatedRef.current) {
        await fgServiceRef.current.createNotificationChannel({
          id: "stream_channel",
          name: "Live Stream Audio",
          description: "Mantiene la transmisión activa en segundo plano",
          importance: 4,
        });
        channelCreatedRef.current = true;
      }
      await fgServiceRef.current.startService({
        channelId: "stream_channel",
        id: 420,
        title: "EbenEzer Live",
        text: "Escuchando transmisión en vivo 🎧",
        icon: "ic_launcher",
      });
      fgStartedRef.current = true;
      AudioModeModule?.setModeNormal();
    } catch (err) {
      console.error("⚠️ Error iniciando servicio:", err);
    }
  }, []);

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

  const requestOffer = useCallback(() => {
    if (
      !language ||
      !wsRef.current ||
      wsRef.current?.readyState !== WebSocket.OPEN
    )
      return;
    console.log("📩 request-offer:", language);
    wsRef.current?.send(JSON.stringify({ type: "request-offer", language }));
    setStatus("requesting");
  }, [language]);

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
      const pc = (new RTCPeerConnection(rtcConfig) as unknown as RTCPeerConnection & {
        onicecandidate: (ev: RTCIceEvent) => void;
        ontrack: (ev: RTCTrackEventWithStreams) => void;
      });
      pcRef.current = pc;

      pc.ontrack = (event: RTCTrackEventWithStreams) => {
        const stream = event.streams[0];
        if (stream) {
          setRemoteStream(stream);
          setStatus("connected");
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
      // Enviar stop-listening si WS está abierto
      if (wsRef.current?.readyState === WebSocket.OPEN && language) {
        wsRef.current.send(
          JSON.stringify({ type: "stop-listening", language })
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
  const createSocket = useCallback(() => {
    console.log("🌐 Creando WebSocket…");
    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      setWsState("open");
      setWsError(null);
      console.log("✅ WS conectado");
    };
    ws.onerror = (e: ErrorEvent | Event) => {
      const msg = "message" in e ? String((e as ErrorEvent).message) : JSON.stringify(e);
      setWsState("error");
      setWsError(msg);
      console.warn("⚠️ WS error", msg);
    };
    ws.onclose = () => {
      setWsState("close");
      console.warn("🔌 WS cerrado");
      if (!allowWSReconnect.current) return;
      console.log("♻️ Reintentando conexión WS en 4s…");
      setTimeout(() => createSocket(), 4000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "active-broadcasts") {
          setActiveLangs({
            es: !!data.active?.es,
            en: !!data.active?.en,
            ro: !!data.active?.ro,
          });
          console.log("📡 active-broadcasts recibido:", data.active);
        }
        if (data.type === "listeners-count") {
          console.log("👥 listeners-count:", data.listeners);
        }
      } catch (err) {
        console.error("⚠️ Error parsing WS:", err);
      }
    };
  }, []);

  useEffect(() => {
    if (socket) {
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "active-broadcasts") {
                  setActiveLangs({
                    es: !!data.active?.es,
                    en: !!data.active?.en,
                    ro: !!data.active?.ro,
                  });
                  console.log("📡 active-broadcasts recibido:", data.active);
                }
                if (data.type === "listeners-count") {
                  console.log("👥 listeners-count:", data.listeners);
                }
                if (data.type === "offer") handleOffer(data);
                if (data.type === "candidate") handleCandidate(data);
              } catch (err) {
                console.error("⚠️ Error parsing WS:", err);
              }
        }
    }
  }, [socket, handleOffer, handleCandidate]);

  useEffect(() => {
    allowWSReconnect.current = true;
    createSocket();
    return () => wsRef.current?.close();
  }, []);

  // --- Helper to wait for socket connection ---
  const waitForSocketConnection = useCallback(async () => {
    const startTime = Date.now();
    return new Promise<boolean>((resolve) => {
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log("✅ WebSocket conectado, procediendo…");
          resolve(true);
        } else if (Date.now() - startTime > 10000) {
          console.warn("⚠️ Timeout esperando WebSocket");
          resolve(false);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }, []);

  const handleSelectLanguage = useCallback(async (code: string) => {
    const active = activeLangs[code as keyof typeof activeLangs];
    if (!active) return;
    
    try {
      // 1. Verificar permisos PRIMERO
      console.log('🔐 Verificando permisos de audio...');
      const hasPermission = await requestAudioPermissions();
      
      if (!hasPermission) {
        console.error('❌ Permisos de audio denegados');
        Alert.alert(
          'Permisos Requeridos',
          'La aplicación necesita acceso al audio para funcionar. Por favor, activa los permisos en la configuración.',
          [{ text: 'OK' }]
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
            'Error de Conexión',
            'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet.',
            [{ text: 'OK' }]
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
        'Error',
        'Ocurrió un error al iniciar la transmisión. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
    }
  }, [activeLangs, createSocket, waitForSocketConnection]);

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

      // WS: si está cerrado, recrearlo
      if (!wsRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log("🔄 WebSocket cerrado, recreando...");

        allowWSReconnect.current = true;
        createSocket();

        // Esperar a que se abra
        await waitForSocketConnection();
      }

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
  }, [language, createSocket, requestOffer, waitForSocketConnection]);

  // --- AppState para manejar audio al background/foreground ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (Platform.OS === "android") {
        try {
          if (nextAppState === "active") {
            // Al volver a foreground, respetamos el estado del altavoz que eligió el usuario
            InCallManager.setSpeakerphoneOn(speakerOn);
            console.log(
              "🔊 Audio restaurado según estado speakerOn:",
              speakerOn
            );
          } else if (
            nextAppState === "background" ||
            nextAppState === "inactive"
          ) {
            // Solo detener servicios auxiliares, NO tocar el altavoz ni InCallManager.stop()
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
  }, [speakerOn]);

  // --- Limpieza completa al desmontar ---
  useEffect(() => {
    return () => {
      stopForegroundService().catch(() => {});
      wsRef.current?.close();
      if (Platform.OS === "android") {
        try {
          InCallManager.setSpeakerphoneOn(false);
          InCallManager.stop();
          if (AudioModeModule?.resetAudioState)
            AudioModeModule.resetAudioState();
          else if (AudioModeModule?.setModeNormal)
            AudioModeModule.setModeNormal();
          if (AudioModeModule?.stopAudioMonitoring)
            AudioModeModule.stopAudioMonitoring();
          if (AudioModeModule?.stopCleanupService)
            AudioModeModule.stopCleanupService();
          if (AudioModeModule?.forceNormalAudioMode)
            AudioModeModule.forceNormalAudioMode();
          console.log("🧹 Limpieza completa de audio al desmontar");
        } catch (e) {
          console.warn("⚠️ Error cleanup audio:", e);
        }
      }
    };
  }, [stopForegroundService]);

  // --- Speaker toggle ---
  const toggleSpeaker = useCallback(() => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    InCallManager.setSpeakerphoneOn(newState);
  }, [speakerOn]);

  // --- Emergency reset ---
  const emergencyAudioReset = useCallback(() => {
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
        console.log("🚨 Emergency audio reset executed");
      } catch (e) {
        console.warn("⚠️ Error en emergency reset:", e);
      }
    }
  }, []);

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
        <View style={[styles.titleBand, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Schedule & contact</Text>
        </View>
        <ChurchInfoScreen onBack={() => setShowInfoScreen(false)} />
        <View style={[styles.footerBand, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footer}>© EBEN-EZER Media 2025</Text>
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
        <Text style={styles.title}>Live translation</Text>
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
        <Text style={styles.subtitle}>
          Listen to the service in your language. Use at church or while
          watching our YouTube stream. Tap a language when it’s live.
        </Text>
        {!language || !remoteStream ? (
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
          />
        )}
        <View style={styles.serviceTimesBar}>
          <Text style={styles.serviceTimesText}>
            Service times: Sun 10:00 & 18:00 · Tue & Thu 20:00
          </Text>
        </View>
        <TouchableOpacity
          style={styles.infoNavButton}
          onPress={() => setShowInfoScreen(true)}
          accessibilityLabel="Open schedule and contact information"
        >
          <Info size={20} color="#3ee8ef" />
          <Text style={styles.infoNavLabel}>Schedule & contact</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>DEBUG</Text>
            <Text style={styles.debugLine}>
              WS: {wsState} {wsError ? `(${wsError})` : ""}
            </Text>
            <Text style={styles.debugLine}>
              Idiomas activos: es {activeLangs.es ? "✓" : "×"} · en{" "}
              {activeLangs.en ? "✓" : "×"} · ro {activeLangs.ro ? "✓" : "×"}
            </Text>
            <Text style={styles.debugLine}>
              Estado: {status} · Idioma: {language ?? "-"}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={[styles.footerBand, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.footer}>© EBEN-EZER Media 2025</Text>
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
      <AppContent />
    </SafeAreaProvider>
  );
}
