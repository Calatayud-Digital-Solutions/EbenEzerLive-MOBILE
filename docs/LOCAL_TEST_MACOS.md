# Guía de pruebas locales en macOS

Pasos para verificar que la app funciona correctamente en tu Mac sin errores.

## 1. Requisitos previos

- **Node.js 18+**
- **Xcode** (para simulador iOS): `xcode-select --install` si no lo tienes
- **CocoaPods** (para iOS): `sudo gem install cocoapods`
- **Android Studio** (solo si quieres probar Android)

## 2. Instalación

```bash
cd /Users/calaespi/Desktop/Proyectos/Personales/EbenEzerLive-MOBILE
npm install
```

## 3. Variables de entorno (opcional)

Si usas servidor local o credenciales propias:

```bash
cp .env.example .env
# Edita .env con tus valores (SIGNALING_URL, TURN_USERNAME, etc.)
```

Si no tienes `.env`, la app usará los valores por defecto (Render en producción).

## 4. Verificar sin errores

### Tests

```bash
npm test
```

Debe ejecutar Jest y pasar los tests.

### TypeScript

```bash
npx tsc --noEmit
```

No debe mostrar errores de tipos.

### Lint (si tienes ESLint configurado)

```bash
npx eslint . --ext .ts,.tsx
```

## 5. Ejecutar la app

### iOS (recomendado en Mac)

```bash
npx expo run:ios
```

Se abrirá el simulador iOS y la app. Si es la primera vez, el prebuild puede tardar unos minutos.

### Android

```bash
npx expo run:android
```

Necesitas tener un emulador Android configurado o un dispositivo conectado.

### Modo desarrollo (selector de plataforma)

```bash
npm start
```

Abre Metro. Pulsa `i` para iOS o `a` para Android en la terminal.

## 6. Verificaciones rápidas en la app

1. **Arranque**: la app se abre sin crash
2. **Conexión**: si hay emisión activa, se muestran idiomas en verde; si no, el mensaje "No languages available yet"
3. **Escuchar**: al pulsar un idioma activo, empieza el audio (necesitas emisión en vivo en el servidor)
4. **Detener**: el botón "Detener" para la escucha
5. **DEBUG** (en modo desarrollo): se muestra el panel con estado WS, idiomas activos, etc.

## 7. Problemas habituales

| Problema | Solución |
|----------|----------|
| `pod install` falla en iOS | `cd ios && pod install` manualmente |
| Simulador no abre | Abre Xcode → Window → Devices and Simulators, crea un simulador |
| Metro no conecta | `npx expo start --clear` para limpiar caché |
| Tests fallan con watchman | Ejecuta en terminal normal (fuera de IDE). O desactiva: `DISABLE_WATCHMAN=1 npm test` |

## 8. Probar app móvil + servidor/web en local

Para probar la app móvil conectada al servidor webrtc-live y a la web en tu Mac:

### Terminal 1: Servidor y web (webrtc-live)

```bash
cd /Users/calaespi/Desktop/Proyectos/Personales/webrtc-live
npm install
```

Crea el `.env` del servidor:

```bash
cp webrtc-live/server/.env.example webrtc-live/server/.env
```

Edita `webrtc-live/server/.env` y rellena con tus valores reales (o cópialos desde Render → webrtc-live → Environment):

| Variable | Ejemplo / descripción |
|----------|------------------------|
| `PORT` | `8080` |
| `SECRET_KEY` | Clave JWT (mín. 32 caracteres) |
| `ADMIN_USERNAME` | Usuario admin para login broadcaster |
| `ADMIN_PASSWORD` | Contraseña admin |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de Firebase Admin SDK (una sola línea) |

```bash
npm run dev
```

- Servidor: `http://localhost:8080`
- Web: `http://localhost:3000`

### Terminal 2: App móvil apuntando a local

Edita `EbenEzerLive-MOBILE/.env`:

```
SIGNALING_URL=ws://localhost:8080
```

Reinicia Metro si ya estaba corriendo, luego:

```bash
cd /Users/calaespi/Desktop/Proyectos/Personales/EbenEzerLive-MOBILE
npx expo run:ios
```

### Flujo de prueba

1. **Broadcaster**: en el navegador `http://localhost:3000`, inicia sesión como admin y activa un idioma (es/en/ro).
2. **Web listener**: en otra pestaña o ventana, abre `http://localhost:3000` y pulsa un idioma activo → debería empezar el audio.
3. **App móvil**: en el simulador iOS, pulsa el mismo idioma → debería escuchar también.
4. **Detener**: prueba el botón "Detener" en ambos clientes y comprueba que el audio se corta.

### Nota

El simulador iOS usa `localhost` para acceder a tu Mac, así que `ws://localhost:8080` funciona. Si usas dispositivo físico en la misma red WiFi, cambia a `ws://TU_IP_MAC:8080` (ej. `ws://192.168.1.10:8080`).

---

## 9. Resumen de comandos

```bash
cd EbenEzerLive-MOBILE
npm install
npm test
npx tsc --noEmit
npx expo run:ios
```
