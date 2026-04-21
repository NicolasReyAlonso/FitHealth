from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from jose import jwt
from sqlalchemy.orm import Session

from app import crud
from app.auth import get_current_user
from app.database import get_db, SessionLocal
from app.models.user import User
from app.schemas.chat import ChatRoomRead, ChatMessageCreate, ChatMessageRead

router = APIRouter(prefix="/chat", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()

# --- REST endpoints ---


@router.get("/rooms", response_model=list[ChatRoomRead])
def list_my_chat_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rooms = crud.chat.get_chat_rooms_for_user(db, current_user.id)
    result = []
    for room in rooms:
        result.append(
            ChatRoomRead(
                id=room.id,
                doctor_id=room.doctor_id,
                patient_id=room.patient_id,
                doctor_username=room.doctor.username,
                patient_username=room.patient.username,
                doctor_profile_picture=room.doctor.profile_picture,
                patient_profile_picture=room.patient.profile_picture,
                created_at=room.created_at,
            )
        )
    return result


from app.models.relationship import DoctorPatient

@router.post("/rooms/{other_user_id}", response_model=ChatRoomRead, status_code=status.HTTP_201_CREATED)
def create_or_get_chat_room(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    other_user = crud.user.get_user(db, other_user_id)
    if not other_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Determine doctor/patient roles
    if current_user.role == "doctor" and other_user.role == "patient":
        doctor_id, patient_id = current_user.id, other_user.id
    elif current_user.role == "patient" and other_user.role == "doctor":
        doctor_id, patient_id = other_user.id, current_user.id
    else:
        raise HTTPException(status_code=400, detail="El chat debe ser entre un doctor y un paciente")

    # Only allow if there's an accepted relationship
    rel = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == doctor_id, 
        DoctorPatient.patient_id == patient_id,
        DoctorPatient.status == "accepted"
    ).first()
    if not rel:
        raise HTTPException(status_code=403, detail="Debes ser paciente/doctor asociado para iniciar chat")

    room = crud.chat.get_or_create_chat_room(db, doctor_id=doctor_id, patient_id=patient_id)
    return ChatRoomRead(
        id=room.id,
        doctor_id=room.doctor_id,
        patient_id=room.patient_id,
        doctor_username=room.doctor.username,
        patient_username=room.patient.username,
        doctor_profile_picture=room.doctor.profile_picture,
        patient_profile_picture=room.patient.profile_picture,
        created_at=room.created_at,
    )


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_chat_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rooms = crud.chat.get_chat_rooms_for_user(db, current_user.id)
    room = next((r for r in rooms if r.id == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail="Sala de chat no encontrada o no tienes acceso")
        
    crud.chat.delete_chat_room(db, room_id)
    
    # Notificar al otro usuario que el chat fue borrado
    from app.routers.notifications import notification_manager
    other_user_id = room.patient_id if current_user.id == room.doctor_id else room.doctor_id
    await notification_manager.send_personal_message(
        {"type": "chat_deleted", "room_id": room_id, "message": f"{current_user.username} ha borrado el chat"},
        other_user_id
    )
    
    return None

@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageRead])
def list_messages(
    room_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify user belongs to this room
    rooms = crud.chat.get_chat_rooms_for_user(db, current_user.id)
    if not any(r.id == room_id for r in rooms):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sala")
    crud.chat.mark_messages_read(db, room_id, current_user.id)
    return crud.chat.get_messages(db, room_id, skip=skip, limit=limit)


from app.routers.notifications import notification_manager

@router.post("/rooms/{room_id}/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    room_id: int,
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rooms = crud.chat.get_chat_rooms_for_user(db, current_user.id)
    room = next((r for r in rooms if r.id == room_id), None)
    if not room:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sala")
    
    msg = crud.chat.create_message(
        db, 
        room_id, 
        sender_id=current_user.id, 
        content=message_data.content, 
        type=message_data.type, 
        report_data=message_data.report_data
    )
    
    broadcast_data = {
        "id": msg.id,
        "chat_room_id": msg.chat_room_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "timestamp": msg.timestamp.isoformat(),
        "type": msg.type,
        "report_data": msg.report_data,
    }
    await manager.broadcast(room_id, broadcast_data)

    # Enviar notificación al otro usuario
    target_user_id = room.doctor_id if current_user.id == room.patient_id else room.patient_id
    await notification_manager.send_personal_message(
        {"type": "new_message", "message": f"Nuevo mensaje de {current_user.username}", "room_id": room_id},
        target_user_id
    )
    
    return msg


from datetime import datetime, timedelta, timezone
from app.models.routine import Routine
from app.models.event import Event

from pydantic import BaseModel

class ReportRequest(BaseModel):
    routine_id: int

from sqlalchemy import or_

@router.post("/rooms/{room_id}/report", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
async def generate_report(
    room_id: int,
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rooms = crud.chat.get_chat_rooms_for_user(db, current_user.id)
    room = next((r for r in rooms if r.id == room_id), None)
    if not room:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sala")
    
    patient_id = room.patient_id

    recent_routine = db.query(Routine).filter(Routine.id == request.routine_id, Routine.user_id == patient_id).first()
    
    if not recent_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no pertenece a este paciente")
        
    start_date = recent_routine.created_at
    
    # Gather events for the patient since start_date or explicitly linked to this routine
    events = db.query(Event).filter(
        Event.user_id == patient_id,
        or_(Event.timestamp >= start_date, Event.routine_id == request.routine_id)
    ).order_by(Event.timestamp.asc()).all()
    
    total_activities = 0
    total_distance = 0.0
    total_steps = 0
    
    bpm_data = []
    steps_data = []
    weight_data = []
    
    for e in events:
        date_str = e.timestamp.strftime("%Y-%m-%d")
        if e.event_type in ["activity", "walking", "running", "Caminar", "Correr"] and e.activity_log:
            total_activities += 1
            if e.activity_log.distance_km:
                total_distance += e.activity_log.distance_km
            if e.activity_log.steps:
                total_steps += e.activity_log.steps
                steps_data.append({"date": date_str, "value": e.activity_log.steps})
        elif e.event_type == "biometric" and e.biometric and e.biometric.heart_rate_avg:
            bpm_data.append({"date": date_str, "value": e.biometric.heart_rate_avg})
        elif e.event_type == "weight" and e.weight_log and e.weight_log.weight_kg:
            weight_data.append({"date": date_str, "value": e.weight_log.weight_kg})

    report_data = {
        "routine_start": start_date.isoformat(),
        "stats": {
            "total_activities": total_activities,
            "total_distance_km": round(total_distance, 2),
            "total_steps": total_steps
        },
        "graphs": {
            "bpm_over_time": bpm_data,
            "steps_over_time": steps_data,
            "weight_over_time": weight_data
        }
    }

    msg = crud.chat.create_message(
        db, 
        room_id, 
        sender_id=current_user.id, 
        content="Reporte de progreso generado", 
        type="report", 
        report_data=report_data
    )
    
    broadcast_data = {
        "id": msg.id,
        "chat_room_id": msg.chat_room_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "timestamp": msg.timestamp.isoformat(),
        "type": msg.type,
        "report_data": msg.report_data,
    }
    await manager.broadcast(room_id, broadcast_data)

    # Enviar notificación al otro usuario
    target_user_id = room.doctor_id if current_user.id == room.patient_id else room.patient_id
    await notification_manager.send_personal_message(
        {"type": "new_report", "message": f"Nuevo reporte de progreso generado por {current_user.username}", "room_id": room_id},
        target_user_id
    )
    
    return msg

@router.get("/doctors", response_model=list[dict])
def list_doctors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doctors = crud.user.get_doctors(db)
    return [{"id": d.id, "username": d.username, "email": d.email, "profile_picture": d.profile_picture} for d in doctors]


# --- WebSocket for real-time chat ---

def _get_user_from_token(token: str, db: Session) -> User | None:
    """Validate a JWT token and return the user, or None."""
    try:
        from app.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
    except Exception:
        return None
    return db.query(User).filter(User.id == user_id).first()


@router.websocket("/ws/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = _get_user_from_token(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        username = user.username
        user_id = user.id

        # Verify the user belongs to this room
        rooms = crud.chat.get_chat_rooms_for_user(db, user.id)
        room = next((r for r in rooms if r.id == room_id), None)
        if not room:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        target_user_id = room.doctor_id if user_id == room.patient_id else room.patient_id
    finally:
        db.close()

    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            if not content:
                continue

            db = SessionLocal()
            try:
                msg = crud.chat.create_message(db, room_id, sender_id=user_id, content=content)
                
                message_data = {
                    "id": msg.id,
                    "chat_room_id": msg.chat_room_id,
                    "sender_id": msg.sender_id,
                    "content": msg.content,
                    "is_read": msg.is_read,
                    "timestamp": msg.timestamp.isoformat(),
                }
            finally:
                db.close()

            await manager.broadcast(room_id, message_data)
            
            await notification_manager.send_personal_message(
                {"type": "new_message", "message": f"Nuevo mensaje de {username}", "room_id": room_id},
                target_user_id
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
