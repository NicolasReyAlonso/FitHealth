from datetime import datetime

from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # biometric, water, activity, food, weight, custom
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="events")  # noqa: F821
    routine: Mapped["Routine | None"] = relationship("Routine")  # noqa: F821
    biometric: Mapped["BiometricData | None"] = relationship("BiometricData", back_populates="event", uselist=False, cascade="all, delete-orphan")
    water_log: Mapped["WaterLog | None"] = relationship("WaterLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    activity_log: Mapped["ActivityLog | None"] = relationship("ActivityLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    food_log: Mapped["FoodLog | None"] = relationship("FoodLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    weight_log: Mapped["WeightLog | None"] = relationship("WeightLog", back_populates="event", uselist=False, cascade="all, delete-orphan")


class BiometricData(Base):
    __tablename__ = "biometric_data"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False)
    heart_rate_avg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heart_rate_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heart_rate_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blood_sugar: Mapped[float | None] = mapped_column(Float, nullable=True)
    blood_pressure_systolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blood_pressure_diastolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blood_oxygen: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)

    event: Mapped["Event"] = relationship("Event", back_populates="biometric")


class WaterLog(Base):
    __tablename__ = "water_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)

    event: Mapped["Event"] = relationship("Event", back_populates="water_log")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False)
    activity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)

    event: Mapped["Event"] = relationship("Event", back_populates="activity_log")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False)
    food_name: Mapped[str] = mapped_column(String(200), nullable=False)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

    event: Mapped["Event"] = relationship("Event", back_populates="food_log")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)

    event: Mapped["Event"] = relationship("Event", back_populates="weight_log")
