# Builds de prueba interna (testers)

Guía para generar builds de prueba en iPhone (TestFlight interno) y Android (pista interna de Play o APK directo) **sin pasar por la revisión completa de producción** cada vez.

Los perfiles `test` y `preview` usan el **mismo servidor de señalización de producción** (`wss://webrtc-live-ct59.onrender.com` por defecto, o las variables del entorno EAS `production` si están configuradas en [expo.dev](https://expo.dev)).

---

## Perfiles EAS

| Perfil | Plataforma | Distribución | Uso |
|--------|------------|--------------|-----|
| **`test`** | iOS + Android | Tienda (TestFlight / Play interna) | Flujo principal para testers con cuenta en App Store Connect o Play Console |
| **`preview`** | iOS + Android | Interna (enlace EAS / ad-hoc) | Instalación directa sin tienda; Android genera APK |
| **`production`** | iOS + Android | Tienda (producción) | Publicación final en App Store y Play Store |

---

## Comandos para desarrolladores

Desde la raíz del proyecto (`EbenEzerLive-MOBILE`):

### Build + envío automático a testers (recomendado)

```bash
# iOS → TestFlight (testers internos)
npm run release:test:ios

# Android → pista interna de Google Play
npm run release:test:android

# Ambas plataformas
npm run release:test:all
```

### Solo build (envío manual después)

```bash
npm run build:test:ios
npm run build:test:android
npm run build:test:all
```

Cuando termine el build en [expo.dev](https://expo.dev):

```bash
npm run submit:test:ios
npm run submit:test:android
```

### Instalación directa sin tienda (perfil `preview`)

```bash
# Android: descarga el APK desde el enlace de EAS
npm run build:preview:android

# iOS: build ad-hoc (requiere registrar UDID del dispositivo en Apple Developer)
npm run build:preview:ios
```

---

## Cómo instalan los testers

### iPhone (TestFlight interno)

1. El desarrollador ejecuta `npm run release:test:ios` (o build + `submit:test:ios`).
2. En [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight** → **Internal Testing**, añade al tester como usuario interno (máx. 100, roles Admin/App Manager/Developer/Marketing).
3. El tester recibe un correo de invitación de TestFlight o abre la app **TestFlight** en el iPhone.
4. Acepta la invitación e instala **Traducción en vivo**.

**Nota:** Los testers internos de TestFlight **no requieren revisión beta de Apple**. Solo los testers externos (más de 100 o fuera del equipo) pasan por Beta App Review.

### Android (pista interna de Play)

1. El desarrollador ejecuta `npm run release:test:android`.
2. En [Play Console](https://play.google.com/console) → **Testing** → **Internal testing**, añade el correo del tester a la lista.
3. Comparte el enlace de opt-in de la pista interna (Play Console lo genera).
4. El tester abre el enlace, acepta ser tester e instala desde Play Store.

### Android (APK directo, perfil `preview`)

1. El desarrollador ejecuta `npm run build:preview:android`.
2. Descarga el `.apk` desde el enlace del build en expo.dev.
3. Envía el APK al tester (correo, Drive, etc.).
4. El tester activa **Instalar apps desconocidas** para el navegador o gestor de archivos y abre el APK.

---

## Diferencia respecto a producción

| Aspecto | `test` / `preview` | `production` |
|---------|-------------------|--------------|
| Servidor WebRTC | Producción (mismo backend) | Producción |
| Firma / bundle ID | Igual que producción | Igual |
| Revisión Apple/Google | No (interno / TestFlight interno) | Sí (App Store / Play producción) |
| Comando típico | `npm run release:test:ios` | `npm run release:ios` |
| Pista Android | `internal` | `production` |

Los builds de prueba son binarios de release firmados igual que producción; la diferencia está en **dónde se publican** (TestFlight interno / Play interna) y que **no sustituyen** la versión pública de la tienda hasta que envíes con el perfil `production`.

---

## Requisitos previos (una sola vez)

- Cuenta [Expo](https://expo.dev) con acceso al proyecto (`owner: calaespi`).
- `eas login` en la máquina de build.
- **iOS:** app registrada en App Store Connect (`ascAppId` en `eas.json`), certificados gestionados por EAS.
- **Android:** app en Play Console con pista **Internal testing** creada.
- (Opcional) Variables en EAS entorno `production`: `SIGNALING_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`. Si no existen, la app usa los valores por defecto de producción embebidos en el código.

---

## Incremento de versión

Antes de un build de prueba que vaya a TestFlight o Play, incrementa en `app.json`:

- **iOS:** `expo.ios.buildNumber`
- **Android:** `expo.android.versionCode`
- **Ambos:** `expo.version` y `package.json` → `version` si cambias la versión visible

El perfil `test` hereda `autoIncrement: true` de `production`, por lo que EAS puede incrementar el build number automáticamente en builds remotos.
