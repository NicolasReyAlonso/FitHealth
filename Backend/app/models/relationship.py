from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, func, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DoctorPatient(Base):
    __tablename__ = "doctor_patient_relationships"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # "pending", "accepted", "rejected"
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    doctor: Mapped["User"] = relationship("User", foreign_keys=[doctor_id])
    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_id])
