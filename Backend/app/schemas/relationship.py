from datetime import datetime

from pydantic import BaseModel


class RelationshipBase(BaseModel):
    doctor_id: int
    patient_id: int


class RelationshipCreate(BaseModel):
    patient_id: int  # Only need patient ID since the doctor will be sending it.


class RelationshipRead(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    # Additional info
    doctor_username: str | None = None
    patient_username: str | None = None
    doctor_profile_picture: str | None = None
    patient_profile_picture: str | None = None

    model_config = {"from_attributes": True}


class RelationshipUpdate(BaseModel):
    status: str  # "accepted" or "rejected"
