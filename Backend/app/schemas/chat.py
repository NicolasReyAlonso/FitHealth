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


from typing import Any

class ChatMessageCreate(BaseModel):
    content: str
    type: str = "text"
    report_data: dict[str, Any] | None = None


class ChatMessageRead(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    content: str
    type: str
    report_data: dict[str, Any] | None
    is_read: bool
    timestamp: datetime

    model_config = {"from_attributes": True}
