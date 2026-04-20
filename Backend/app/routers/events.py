from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventRead])
def list_my_events(
    skip: int = 0,
    limit: int = 100,
    routine_id: int | None = None,
    event_type: str | None = None,
    date: str | None = None,
    time_str: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.event.get_events_by_user(
        db, 
        current_user.id, 
        skip=skip, 
        limit=limit,
        routine_id=routine_id,
        event_type=event_type,
        date=date,
        time_str=time_str
    )


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.event.create_event(db, event_data, user_id=current_user.id)


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_event = crud.event.get_event(db, event_id)
    if not db_event or db_event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return db_event


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_event = crud.event.get_event(db, event_id)
    if not db_event or db_event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return crud.event.update_event(db, event_id, event_data)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_event = crud.event.get_event(db, event_id)
    if not db_event or db_event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    crud.event.soft_delete_event(db, event_id)


@router.post("/{event_id}/restore", response_model=EventRead)
def restore_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restaura un evento eliminado"""
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    if db_event.deleted_at is None:
        raise HTTPException(status_code=400, detail="El evento no está eliminado")
    
    if db_event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este evento")
    
    restored = crud.event.restore_event(db, event_id)
    return restored
