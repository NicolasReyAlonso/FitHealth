# FitHealth

¡Bienvenido a **FitHealth**! Una aplicación completa para la gestión de salud y
fitness entre **pacientes** y **doctores**: rutinas (ejercicios, dietas,
medicaciones y objetivos), registro de actividad, chat en tiempo real y
notificaciones.

Este repositorio contiene todo el ecosistema del proyecto: la API, la app
móvil, la documentación técnica y los recursos de presentación.

## 📂 Estructura del repositorio

- **[`Backend/`](./Backend/)** — API REST en Python (**FastAPI + SQLAlchemy + PostgreSQL**). Autenticación JWT, roles paciente/doctor, WebSockets y `docker-compose.yml` para levantar los servicios. Ver [`Backend/README.md`](./Backend/README.md).
- **[`Frontend/`](./Frontend/)** — App móvil en **React Native + Expo + TypeScript** con Expo Router e i18n. Ver [`Frontend/FitHealth/README.md`](./Frontend/FitHealth/README.md).
- **[`Presentation/`](./Presentation/)** — Presentación del proyecto (HTML/JS), desplegada automáticamente en GitHub Pages mediante GitHub Actions.
- **[`UseCaseDiagram/`](./UseCaseDiagram/)** — Diagramas UML y de casos de uso (`.aird`, `.di`, `.notation`, `.uml`).
- **[`ProjectLibre/`](./ProjectLibre/)** — Archivos de planificación y gestión del proyecto.
- **[`Video/`](./Video/)** — Recursos de la demostración en vídeo (`.kdenlive`).

## ⚙️ Puesta en marcha

El backend y el frontend se ejecutan por separado. Arranca primero el backend.

### 1. Backend

```bash
cd Backend
cp .env.example .env          # define al menos un SECRET_KEY propio
docker compose up --build
```

API en `http://localhost:8000` · Swagger UI en `http://localhost:8000/docs`.
Detalles completos en [`Backend/README.md`](./Backend/README.md).

### 2. Frontend

```bash
cd Frontend/FitHealth
npm install
npx expo start
```

Para un dispositivo físico, configura `EXPO_PUBLIC_API_HOST` con la IP de tu
máquina en la LAN. Detalles en [`Frontend/FitHealth/README.md`](./Frontend/FitHealth/README.md).

## 🚀 Despliegue de la presentación

La presentación web se despliega automáticamente en **GitHub Pages** en cada
push a la rama `main`, mediante **GitHub Actions**.

## 🛠️ Tecnologías utilizadas

- **Frontend**: React Native, Expo, Expo Router, TypeScript, i18next
- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL, JWT, WebSockets
- **Infraestructura**: Docker, docker compose, GitHub Actions (web de presentación)
