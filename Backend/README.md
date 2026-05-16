# FitHealth Backend

API REST desarrollada con **FastAPI + SQLAlchemy + PostgreSQL**.

Gestiona usuarios (pacientes y doctores), rutinas de salud (ejercicios, dietas,
medicaciones y objetivos), entrenamientos, eventos de actividad, relaciones
doctor‑paciente y un chat en tiempo real con generación de reportes de progreso.

## Características principales

- **Autenticación JWT** con verificación de correo por email (Gmail SMTP).
- **Roles**: `patient` y `doctor`, con permisos diferenciados.
- **Rutinas** organizadas por día de la semana, con ejercicios (e imágenes),
  dietas, medicaciones y objetivos. Soporta *soft delete* y restauración.
- **Relaciones doctor‑paciente** mediante solicitudes que el paciente acepta o rechaza.
- **Chat en tiempo real** (WebSocket) entre doctor y paciente, con reportes de progreso.
- **Notificaciones en tiempo real** vía WebSocket.
- **Subida de imágenes** de ejercicios servidas como ficheros estáticos.

## Arrancar el proyecto

```bash
cp .env.example .env
# Edita .env y, como mínimo, define un SECRET_KEY propio.
# Para que funcione el envío de correos de verificación, configura
# SMTP_USERNAME y SMTP_PASSWORD (si se dejan vacíos, los correos se
# imprimen por consola en modo simulador).
docker compose up --build
```

La API queda disponible en `http://localhost:8000`.

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`
- Ficheros estáticos (imágenes de ejercicios): `http://localhost:8000/static/...`

> Las tablas se crean automáticamente al arrancar. La migración
> `migrations/001_add_soft_delete.sql` documenta la columna `deleted_at`
> usada para el *soft delete* de rutinas.

## Flujo de autenticación

La mayoría de endpoints requieren un **token JWT** en la cabecera
`Authorization: Bearer <token>`. El flujo es:

1. **Registro** (`POST /auth/register`): crea el usuario y envía un correo de verificación.
2. **Verificación**: el usuario abre el enlace `GET /auth/verify?token=...` del correo.
3. **Login** (`POST /auth/login`): devuelve el `access_token`. Requiere estar verificado.

```bash
# 1. Registro (role: "patient" o "doctor")
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "username": "alice", "password": "secret123", "role": "patient"}'

# 2. Verifica el correo (enlace recibido por email o impreso en consola)

# 3. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123"}'
# -> {"access_token": "eyJ...", "token_type": "bearer"}

# Usuario autenticado actual
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

En los ejemplos siguientes, sustituye `<TOKEN>` por el `access_token` obtenido.

## Endpoints principales

### Usuarios — `/users`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users/search?query=&role=` | Buscar usuarios por nombre/email |
| GET | `/users/` | Listar usuarios |
| GET | `/users/{user_id}` | Obtener usuario por ID |
| PATCH | `/users/{user_id}` | Actualizar el propio perfil |
| DELETE | `/users/{user_id}` | Eliminar la propia cuenta |

```bash
curl http://localhost:8000/users/ -H "Authorization: Bearer <TOKEN>"

curl -X PATCH http://localhost:8000/users/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Alice", "preferred_language": "es"}'
```

### Entrenamientos — `/workouts`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/workouts/user/{user_id}` | Listar entrenamientos de un usuario |
| POST | `/workouts/user/{user_id}` | Crear entrenamiento |
| GET | `/workouts/{workout_id}` | Obtener entrenamiento |
| PATCH | `/workouts/{workout_id}` | Actualizar entrenamiento |
| DELETE | `/workouts/{workout_id}` | Eliminar entrenamiento |

```bash
curl -X POST http://localhost:8000/workouts/user/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Cardio matutino", "description": "Correr 5km", "duration_minutes": 30, "calories_burned": 300}'
```

### Rutinas — `/routines`

Las rutinas pertenecen a un usuario (`user_id`) y pueden tener un creador
(`creator_id`) cuando un doctor las asigna a un paciente. Un paciente no puede
editar la estructura de una rutina asignada por su doctor (solo marcar
medicaciones/objetivos como completados).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/routines/` | Listar mis rutinas |
| POST | `/routines/` | Crear rutina (un doctor puede asignarla con `patient_id`) |
| GET | `/routines/{routine_id}` | Obtener rutina |
| PATCH | `/routines/{routine_id}` | Actualizar / reasignar rutina |
| DELETE | `/routines/{routine_id}` | Soft delete de la rutina |
| POST | `/routines/{routine_id}/restore` | Restaurar rutina eliminada (≤30 días) |
| POST | `/routines/{routine_id}/days` | Añadir un día (`day_of_week` 0–6) |
| POST | `/routines/{routine_id}/duplicate-day` | Copiar un día a otros días |
| POST | `/routines/{routine_id}/days/{day}/exercises` | Añadir ejercicio |
| POST | `/routines/{routine_id}/days/{day}/diets` | Añadir comida/dieta |
| POST | `/routines/{routine_id}/days/{day}/medications` | Añadir medicación |
| PATCH | `/routines/medications/{medication_id}` | Actualizar medicación |
| POST | `/routines/{routine_id}/objectives` | Añadir objetivo |
| PUT | `/routines/objectives/{objective_id}` | Actualizar objetivo |
| POST | `/routines/exercises/{exercise_id}/image` | Subir imagen de ejercicio (≤5 MB) |
| DELETE | `/routines/items/{item_type}/{item_id}` | Borrar ítem (`exercise`/`diet`/`medication`/`objective`) |
| WS | `/routines/ws/{routine_id}` | Cambios en una rutina en tiempo real |
| WS | `/routines/ws/user/{user_id}` | Cambios en la lista de rutinas de un usuario |

```bash
curl -X POST http://localhost:8000/routines/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Plan semanal"}'
```

### Eventos — `/events`

Registro de actividad del usuario (actividad física, biométricas, peso, etc.).
Soporta filtros por consulta y *soft delete*.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/events/?routine_id=&event_type=&date=&time_str=` | Listar mis eventos (con filtros) |
| POST | `/events/` | Crear evento |
| GET | `/events/{event_id}` | Obtener evento |
| PATCH | `/events/{event_id}` | Actualizar evento |
| DELETE | `/events/{event_id}` | Soft delete del evento |
| POST | `/events/{event_id}/restore` | Restaurar evento eliminado |

### Relaciones doctor‑paciente — `/relationships`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/relationships/request?patient_id=` | El doctor solicita conexión con un paciente |
| PATCH | `/relationships/{id}/status?status=accepted\|rejected` | El paciente acepta/rechaza |
| GET | `/relationships/doctor/patients` | Pacientes aceptados del doctor |
| GET | `/relationships/doctor/pending` | Solicitudes pendientes del doctor |
| GET | `/relationships/patient/doctors` | Doctores aceptados del paciente |
| GET | `/relationships/patient/pending` | Solicitudes pendientes del paciente |
| DELETE | `/relationships/{id}` | Eliminar la relación |

### Chat — `/chat`

Solo disponible entre un doctor y un paciente con relación **aceptada**.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/chat/rooms` | Listar mis salas de chat |
| POST | `/chat/rooms/{other_user_id}` | Crear u obtener sala con otro usuario |
| DELETE | `/chat/rooms/{room_id}` | Eliminar sala |
| GET | `/chat/rooms/{room_id}/messages` | Listar mensajes (marca como leídos) |
| POST | `/chat/rooms/{room_id}/messages` | Enviar mensaje |
| POST | `/chat/rooms/{room_id}/report` | Generar reporte de progreso de una rutina |
| GET | `/chat/doctors` | Listar doctores disponibles |
| WS | `/chat/ws/{room_id}?token=<JWT>` | Chat en tiempo real |

### Notificaciones — `/notifications`

| Método | Ruta | Descripción |
|---|---|---|
| WS | `/notifications/ws/{user_id}` | Recibir notificaciones en tiempo real |

## Estructura del proyecto

```
Backend/
├── docker-compose.yml      # Servicios: api (FastAPI) + db (PostgreSQL 16)
├── Dockerfile
├── requirements.txt
├── .env.example
├── migrations/
│   └── 001_add_soft_delete.sql
└── app/
    ├── main.py             # Punto de entrada FastAPI (routers, CORS, estáticos)
    ├── config.py           # Variables de entorno (Pydantic Settings)
    ├── database.py         # Conexión SQLAlchemy y sesión
    ├── auth.py             # Hash de contraseñas, JWT, get_current_user
    ├── email_utils.py      # Envío de correos de verificación (SMTP)
    ├── models/             # Tablas de la BD (SQLAlchemy)
    │   ├── user.py
    │   ├── workout.py
    │   ├── routine.py
    │   ├── event.py
    │   ├── chat.py
    │   └── relationship.py
    ├── schemas/            # Validación / serialización (Pydantic)
    │   ├── user.py
    │   ├── workout.py
    │   ├── routine.py
    │   ├── event.py
    │   ├── chat.py
    │   └── relationship.py
    ├── crud/               # Lógica de acceso a datos
    │   ├── user.py
    │   ├── workout.py
    │   ├── routine.py
    │   ├── event.py
    │   ├── chat.py
    │   └── relationship.py
    └── routers/            # Endpoints HTTP / WebSocket
        ├── auth.py
        ├── users.py
        ├── workouts.py
        ├── routines.py
        ├── events.py
        ├── chat.py
        ├── relationships.py
        └── notifications.py
```

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL | `fithealth` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `changeme` |
| `POSTGRES_DB` | Nombre de la base de datos | `fithealth_db` |
| `POSTGRES_HOST_PORT` | Puerto host expuesto por la BD | `5432` |
| `DATABASE_URL` | URL de conexión SQLAlchemy | `postgresql+psycopg2://fithealth:changeme@db:5432/fithealth_db` |
| `SECRET_KEY` | Clave para firmar los JWT (**obligatoria**) | *(sin valor por defecto)* |
| `ALGORITHM` | Algoritmo de firma JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Caducidad del token (minutos) | `10080` (7 días) |
| `SMTP_SERVER` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USERNAME` | Usuario/correo SMTP | *(vacío → modo simulador)* |
| `SMTP_PASSWORD` | Contraseña/app password SMTP | *(vacío → modo simulador)* |
| `BACKEND_URL` | URL base usada en los enlaces de verificación | `http://localhost:8000` |

## Stack técnico

- **FastAPI** + **Uvicorn** (ASGI)
- **SQLAlchemy 2.0** sobre **PostgreSQL 16**
- **Pydantic v2** para validación
- **python-jose** (JWT) + **bcrypt** (hash de contraseñas)
- **WebSockets** para chat, notificaciones y actualización de rutinas en tiempo real
- **Docker** / **docker compose** para desarrollo local
