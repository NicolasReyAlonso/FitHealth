from sqlalchemy.orm import Session

from app.models.chat import ChatRoom, ChatMessage


def get_or_create_chat_room(db: Session, doctor_id: int, patient_id: int) -> ChatRoom:
    room = (
        db.query(ChatRoom)
        .filter(ChatRoom.doctor_id == doctor_id, ChatRoom.patient_id == patient_id)
        .first()
    )
    if room:
        return room
    room = ChatRoom(doctor_id=doctor_id, patient_id=patient_id)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def get_chat_rooms_for_user(db: Session, user_id: int) -> list[ChatRoom]:
    return (
        db.query(ChatRoom)
        .filter((ChatRoom.doctor_id == user_id) | (ChatRoom.patient_id == user_id))
        .all()
    )


def get_messages(db: Session, chat_room_id: int, skip: int = 0, limit: int = 100) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.chat_room_id == chat_room_id)
        .order_by(ChatMessage.timestamp.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_chat_room(db: Session, room_id: int) -> ChatRoom | None:
    return db.query(ChatRoom).filter(ChatRoom.id == room_id).first()

def delete_chat_room(db: Session, room_id: int) -> bool:
    room = get_chat_room(db, room_id)
    if room:
        db.delete(room)
        db.commit()
        return True
    return False

def create_message(db: Session, chat_room_id: int, sender_id: int, content: str, type: str = "text", report_data: dict | None = None) -> ChatMessage:
    msg = ChatMessage(
        chat_room_id=chat_room_id, 
        sender_id=sender_id, 
        content=content, 
        type=type, 
        report_data=report_data
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def mark_messages_read(db: Session, chat_room_id: int, reader_id: int) -> None:
    db.query(ChatMessage).filter(
        ChatMessage.chat_room_id == chat_room_id,
        ChatMessage.sender_id != reader_id,
        ChatMessage.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
