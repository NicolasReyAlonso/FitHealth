from datetime import date, datetime

from sqlalchemy import String, DateTime, Date, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="patient")  # "patient" | "doctor"
    is_active: Mapped[bool] = mapped_column(default=True)
    is_verified: Mapped[bool] = mapped_column(default=False)
    verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    second_last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(5))  # "es" | "en" | "cs"


    workouts: Mapped[list["Workout"]] = relationship("Workout", back_populates="user")  # noqa: F821
    routines: Mapped[list["Routine"]] = relationship("Routine", back_populates="user")  # noqa: F821
    events: Mapped[list["Event"]] = relationship("Event", back_populates="user")  # noqa: F821

    # Chat relations
    doctor_chats: Mapped[list["ChatRoom"]] = relationship(  # noqa: F821
        "ChatRoom", foreign_keys="ChatRoom.doctor_id", back_populates="doctor"
    )
    patient_chats: Mapped[list["ChatRoom"]] = relationship(  # noqa: F821
        "ChatRoom", foreign_keys="ChatRoom.patient_id", back_populates="patient"
    )
    sent_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="sender")  # noqa: F821
