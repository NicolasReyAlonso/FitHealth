# FitHealth — App móvil

Aplicación móvil de **FitHealth** desarrollada con **React Native + Expo +
TypeScript**, usando [Expo Router](https://docs.expo.dev/router/introduction)
para la navegación basada en ficheros.

Permite a pacientes y doctores gestionar rutinas de salud (ejercicios, dietas,
medicaciones y objetivos), registrar eventos de actividad, comunicarse por chat
en tiempo real y recibir notificaciones. Consume la API del
[Backend](../../Backend/README.md).

## Requisitos

- **Node.js** 18+ y **npm**
- **Expo CLI** (se ejecuta vía `npx`, no requiere instalación global)
- El **backend** corriendo (ver [`Backend/README.md`](../../Backend/README.md))
- Para móvil físico: la app [Expo Go](https://expo.dev/go) y estar en la misma red LAN que el backend

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar la conexión al backend (ver sección siguiente).

3. Arrancar la app:

   ```bash
   npx expo start
   ```

   En la salida podrás abrir la app en:

   - **Android emulator** / **iOS simulator**
   - **Expo Go** (escaneando el QR con el móvil)
   - **Web** (`w` en la terminal)

## Configuración del backend

La URL base de la API se resuelve automáticamente según la plataforma en
[`services/api.ts`](./services/api.ts):

| Plataforma | URL por defecto |
|---|---|
| Web | `http://localhost:8000` |
| Emulador Android | `http://10.0.2.2:8000` |
| iOS / dispositivo físico | `http://<LAN_HOST>:8000` |

Para un **dispositivo físico** necesitas apuntar a la IP de tu máquina en la
LAN. Crea un fichero `.env` en esta carpeta:

```bash
EXPO_PUBLIC_API_HOST=192.168.1.50   # IP de tu PC en la red local
EXPO_PUBLIC_API_PORT=8000
```

Las URLs de WebSocket (chat, notificaciones, rutinas en tiempo real) se derivan
de la misma base sustituyendo `http` por `ws`.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo de Expo |
| `npm run android` | Inicia y abre en emulador/dispositivo Android |
| `npm run ios` | Inicia y abre en simulador iOS |
| `npm run web` | Inicia la versión web |
| `npm run lint` | Ejecuta ESLint (config de Expo) |
| `npm run reset-project` | Mueve el código de ejemplo y crea un `app/` en blanco |

## Estructura del proyecto

```
Frontend/FitHealth/
├── app/                     # Rutas (Expo Router, navegación por ficheros)
│   ├── _layout.tsx          # Layout raíz (providers, navegación)
│   ├── login.tsx            # Inicio de sesión
│   ├── register.tsx         # Registro
│   ├── verify-notice.tsx    # Aviso de verificación de correo
│   ├── edit_profile.tsx     # Edición de perfil
│   ├── contacts.tsx         # Contactos / relaciones doctor-paciente
│   ├── routines/[id].tsx    # Detalle de una rutina
│   └── (tabs)/              # Navegación por pestañas
│       ├── index.tsx        # Inicio
│       ├── routines.tsx     # Lista de rutinas
│       ├── events.tsx       # Eventos de actividad
│       ├── chat.tsx         # Chat en tiempo real
│       └── profile.tsx      # Perfil de usuario
├── components/              # Componentes reutilizables (incluye ui/)
├── context/                 # Estado global (React Context)
│   ├── auth-context.tsx     # Autenticación / sesión
│   ├── notification-context.tsx  # Notificaciones en tiempo real
│   └── toast-context.tsx    # Avisos tipo toast
├── services/
│   ├── api.ts               # Cliente Axios + token JWT + URLs WS
│   └── i18n.ts              # Configuración de i18next
├── locales/                 # Traducciones (es, en, de, cs)
├── hooks/                   # Hooks personalizados
├── constants/theme.ts       # Tema (colores, estilos)
├── styles/                  # Estilos compartidos
├── assets/                  # Imágenes e iconos
└── app.json                 # Configuración de Expo
```

## Autenticación

El cliente Axios ([`services/api.ts`](./services/api.ts)) añade automáticamente
el token JWT (`Authorization: Bearer ...`) a cada petición, leyéndolo de
`AsyncStorage`. El flujo de sesión (login, registro, verificación de correo,
logout) se gestiona desde [`context/auth-context.tsx`](./context/auth-context.tsx).

## Internacionalización

La app soporta varios idiomas mediante **i18next** / **react-i18next**. Los
ficheros de traducción están en [`locales/`](./locales/):

- 🇪🇸 Español (`es`, idioma por defecto)
- 🇬🇧 Inglés (`en`)
- 🇩🇪 Alemán (`de`)
- 🇨🇿 Checo (`cs`)

## Stack técnico

- **React Native** 0.81 + **React** 19
- **Expo** ~54 + **Expo Router** (navegación por ficheros)
- **TypeScript**
- **Axios** para el consumo de la API REST
- **WebSockets** para chat, notificaciones y rutinas en tiempo real
- **i18next** para internacionalización
- **react-native-chart-kit** para gráficas de progreso
- **AsyncStorage** para persistencia del token de sesión
