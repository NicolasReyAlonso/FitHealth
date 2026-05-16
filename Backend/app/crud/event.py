from datetime import datetime, timezone

from sqlalchemy import cast, Date, Time
from sqlalchemy.orm import Session

from app.models.event import (
    Event, BiometricData, WaterLog, ActivityLog, FoodLog, WeightLog,
)
from app.schemas.event import EventCreate, EventUpdate


def get_event(db: Session, event_id: int) -> Event | None:
    return db.query(Event).filter(Event.id == event_id, Event.deleted_at == None).first()


def get_events_by_user(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100,
    routine_id: int | None = None,
    event_type: str | None = None,
    date: str | None = None,
    time_str: str | None = None
) -> list[Event]:
    query = db.query(Event).filter(Event.user_id == user_id, Event.deleted_at == None)
    
    if routine_id is not None:
        query = query.filter(Event.routine_id == routine_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if date:
        query = query.filter(cast(Event.timestamp, Date) == date)
    if time_str:
        # NOTE: this casts timestamp to Time and matches strings if format is "HH:MM:SS" or similar depending on dialect.
        # Alternatively, depending on DB could use func.to_char, but cast(..., Time) works on PostgreSQL/MySQL
        query = query.filter(cast(Event.timestamp, Time) == time_str)

    return (
        query
        .order_by(Event.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_event(db: Session, event_data: EventCreate, user_id: int) -> Event:
    db_event = Event(
        user_id=user_id,
        routine_id=event_data.routine_id,
        name=event_data.name,
        event_type=event_data.event_type,
        timestamp=event_data.timestamp or datetime.now(timezone.utc),
        notes=event_data.notes,
    )
    if event_data.biometric:
        db_event.biometric = BiometricData(**event_data.biometric.model_dump())
    if event_data.water_log:
        db_event.water_log = WaterLog(**event_data.water_log.model_dump())
    if event_data.activity_log:
        db_event.activity_log = ActivityLog(**event_data.activity_log.model_dump())
    if event_data.food_log:
        db_event.food_log = FoodLog(**event_data.food_log.model_dump())
    if event_data.weight_log:
        db_event.weight_log = WeightLog(**event_data.weight_log.model_dump())

    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def update_event(db: Session, event_id: int, event_data: EventUpdate) -> Event | None:
    db_event = get_event(db, event_id)
    if not db_event:
        return None
    for field, value in event_data.model_dump(exclude_unset=True).items():
        setattr(db_event, field, value)
    db.commit()
    db.refresh(db_event)
    return db_event


def soft_delete_event(db: Session, event_id: int) -> Event | None:
    """Soft delete: marca el evento como eliminado sin borrar los datos"""
    db_event = get_event(db, event_id)
    if not db_event:
        return None
    db_event.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_event)
    return db_event


def restore_event(db: Session, event_id: int) -> Event | None:
    """Restaura un evento eliminado"""
    # Usar query sin el filtro de deleted_at para obtener el evento eliminado
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event or db_event.deleted_at is None:
        return None
    db_event.deleted_at = None
    db.commit()
    db.refresh(db_event)
    return db_event
