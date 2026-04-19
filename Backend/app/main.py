from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import auth, users, workouts, routines, events, chat, relationships

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas al arrancar (en producción usar Alembic en su lugar)
    Base.metadata.create_all(bind=engine)
    # Ensure static uploads directory exists
    os.makedirs("uploads/exercises", exist_ok=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="API de FitHealth — seguimiento de entrenamientos y salud",
    lifespan=lifespan,
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workouts.router)
app.include_router(routines.router)
app.include_router(events.router)
app.include_router(chat.router)
app.include_router(relationships.router)

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
