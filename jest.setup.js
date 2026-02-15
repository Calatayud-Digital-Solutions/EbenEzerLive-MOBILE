// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    ios: { infoPlist: {} },
    android: { package: 'com.test' },
  },
  manifest: {
    extra: {
      eas: { projectId: 'test' },
    },
  },
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), stopAsync: jest.fn(), unloadAsync: jest.fn() } })),
    },
  },
  InterruptionModeAndroid: {},
  InterruptionModeIOS: {},
}));

// Mock react-native-webrtc
jest.mock('react-native-webrtc', () => ({
  RTCView: 'RTCView',
  RTCPeerConnection: jest.fn(),
  RTCSessionDescription: jest.fn(),
  RTCIceCandidate: jest.fn(),
}));

// Mock foreground service
jest.mock('@voximplant/react-native-foreground-service', () => ({
  getInstance: jest.fn(() => ({
    createNotificationChannel: jest.fn(),
    startService: jest.fn(),
    stopService: jest.fn(),
  })),
}));

// Mock incall manager
jest.mock('react-native-incall-manager', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setSpeakerphoneOn: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  MapPin: 'MapPin',
  Phone: 'Phone',
  Mail: 'Mail',
  Clock: 'Clock',
  PlayCircle: 'PlayCircle',
  Globe: 'Globe',
  MessageCircle: 'MessageCircle',
  Volume2: 'Volume2',
  VolumeX: 'VolumeX',
  Radio: 'Radio',
}));

// Mock SVG
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  Defs: 'Defs',
  Stop: 'Stop',
  LinearGradient: 'LinearGradient',
}));

// Mock NativeModules
import { NativeModules } from 'react-native';
NativeModules.AudioModeModule = {
  setModeNormal: jest.fn(),
  resetAudioState: jest.fn(),
  stopAudioMonitoring: jest.fn(),
  startAudioMonitoring: jest.fn(),
  startCleanupService: jest.fn(),
  stopCleanupService: jest.fn(),
  forceNormalAudioMode: jest.fn(),
};
