from datetime import datetime, time

from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="routines")  # noqa: F821
    days: Mapped[list["RoutineDay"]] = relationship("RoutineDay", back_populates="routine", cascade="all, delete-orphan")
    objectives: Mapped[list["RoutineObjective"]] = relationship("RoutineObjective", back_populates="routine", cascade="all, delete-orphan")


class RoutineDay(Base):
    __tablename__ = "routine_days"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday

    routine: Mapped["Routine"] = relationship("Routine", back_populates="days")
    exercises: Mapped[list["RoutineExercise"]] = relationship("RoutineExercise", back_populates="day", cascade="all, delete-orphan")
    diet_items: Mapped[list["RoutineDiet"]] = relationship("RoutineDiet", back_populates="day", cascade="all, delete-orphan")
    medications: Mapped[list["RoutineMedication"]] = relationship("RoutineMedication", back_populates="day", cascade="all, delete-orphan")


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    routine_day_id: Mapped[int] = mapped_column(ForeignKey("routine_days.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    day: Mapped["RoutineDay"] = relationship("RoutineDay", back_populates="exercises")


class RoutineDiet(Base):
    __tablename__ = "routine_diets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    routine_day_id: Mapped[int] = mapped_column(ForeignKey("routine_days.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_of_day: Mapped[time | None] = mapped_column(Time, nullable=True)

    day: Mapped["RoutineDay"] = relationship("RoutineDay", back_populates="diet_items")

class RoutineMedication(Base):
    __tablename__ = "routine_medications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    routine_day_id: Mapped[int] = mapped_column(ForeignKey("routine_days.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    dose: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_of_day: Mapped[time | None] = mapped_column(Time, nullable=True)

    day: Mapped["RoutineDay"] = relationship("RoutineDay", back_populates="medications")


class RoutineObjective(Base):
    __tablename__ = "routine_objectives"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recommended_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deadline_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_completed: Mapped[bool] = mapped_column(default=False)

    routine: Mapped["Routine"] = relationship("Routine", back_populates="objectives")
