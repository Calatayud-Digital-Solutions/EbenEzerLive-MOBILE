# Publicar en Google Play Store (cuenta nueva, conflicto de firma resuelto)

Tu cuenta de Play Console es nueva y la app **nunca se ha publicado**. La clave de firma que Play pide (`3E:E8:0F:...`) se registró en un intento anterior (p. ej. otro programador). Para que funcione con **tu** clave (EAS, `07:FD:91:...`) sin depender de ese keystore, sigue estos pasos.

---

## Paso 1: Quitar la app actual en Play Console

Así eliminamos el conflicto de firma. Solo es posible si la app **no está publicada** en producción.

1. Entra en [Play Console](https://play.google.com/console).
2. Abre la app **Traducción en vivo** (com.cds.eben_ezer_live).
3. Menú lateral → **Configuración** (o **Policy and programs** / **Configuración de la app**).
4. Busca **“Eliminar app”** / **“Remove app”** / **“Eliminar aplicación”** (suele estar al final de la página de configuración).
5. Confirma. La app desaparece de tu cuenta; el nombre del paquete queda libre de nuevo para una app nueva.

Si no ves “Eliminar app”, en algunas cuentas está en **Configuración** → **Datos de la app** o en la página principal de la app. Si no existe la opción, usa el **Paso 1 alternativo** más abajo.

---

## Paso 2: Crear una app nueva (misma identidad)

1. En Play Console, **“Crear aplicación”** / **“Create app”**.
2. Nombre: **Traducción en vivo**.
3. Idioma predeterminado: español.
4. Tipo: aplicación.
5. Gratuita o de pago: según quieras.
6. Crea la app. **No subas ningún AAB todavía** desde otra fuente; el primer AAB que subas debe ser el de EAS (Paso 4).

---

## Paso 3: Generar el AAB con tu clave (EAS)

En la raíz del proyecto:

```bash
npm run build:play
```

O:

```bash
npx eas build --platform android --profile production
```

Cuando termine, EAS te dará un enlace para descargar el `.aab`. Descárgalo.

---

## Paso 4: Subir el AAB en la app nueva

1. En Play Console, entra en la **app nueva** que creaste en el paso 2.
2. **Producción** (o la pista que uses) → **Crear nueva versión**.
3. En **App bundles**, sube el archivo `.aab` que descargaste en el paso 3.
4. Rellena **nombre de versión** (p. ej. `1.0.1`) y **notas de la versión**.
5. Guarda y envía a revisión.

Como es la **primera** versión de esta app en tu cuenta, Play aceptará la firma del AAB (tu clave de EAS, SHA1 `07:FD:91:...`).

---

## Paso 5: Completar la ficha y publicar

Completa lo que Play pida antes de publicar:

- Ficha de la tienda (descripción, capturas, icono 512×512).
- Clasificación de contenido.
- **Política de privacidad:** pega esta URL en la ficha de la app:  
  `https://adicampan.github.io/EbenEzerLive-MOBILE/privacy_policy.html`
- Declaración de datos (si aplica).

Luego envía a revisión. La revisión suele tardar entre 1 y 7 días.

---

## Paso 1 alternativo (si no puedes eliminar la app)

Si no encuentras “Eliminar app”:

1. Play Console → tu app → **Release** → **Setup** → **App signing** (o **Integridad de la app**).
2. Busca **“Solicitar restablecimiento de la clave de carga”** / **“Request upload key reset”**.
3. Sigue el proceso de Google (suelen pedir que demuestres que eres el propietario).
4. Si lo aprueban, podrás registrar tu clave de EAS y luego subir el AAB generado con `npm run build:play` en la **misma** app, sin crear una nueva.

---

## Resumen de comandos

| Acción              | Comando              |
|---------------------|----------------------|
| Build para Play Store | `npm run build:play` |

El proyecto ya está configurado con package `com.cds.eben_ezer_live`, versión 1.0.1 y nombre “Traducción en vivo”. No hace falta cambiar código; solo seguir los pasos anteriores en Play Console.
