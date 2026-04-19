from datetime import datetime

from pydantic import BaseModel


class ChatRoomCreate(BaseModel):
    doctor_id: int
    patient_id: int


class ChatRoomRead(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    doctor_username: str | None = None
    patient_username: str | None = None
    doctor_profile_picture: str | None = None
    patient_profile_picture: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageRead(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    content: str
    is_read: bool
    timestamp: datetime

    model_config = {"from_attributes": True}
