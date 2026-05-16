from sqlalchemy import or_, update
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models.chat import ChatMessage, ChatRoom
from app.models.event import Event
from app.models.relationship import DoctorPatient
from app.models.routine import Routine
from app.models.user import User
from app.models.workout import Workout
from app.schemas.user import UserCreate, UserUpdate


def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()


def get_doctors(db: Session) -> list[User]:
    return db.query(User).filter(User.role == "doctor", User.is_active == True).all()  # noqa: E712


def create_user(db: Session, user_data: UserCreate, verification_token: str | None = None) -> User:
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        verification_token=verification_token
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User | None:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if not db_user:
        return False

    # Las FKs hacia users.id no tienen ON DELETE CASCADE, así que limpiamos
    # las filas dependientes a mano antes de borrar el usuario.

    # 1. Mensajes enviados por el usuario en cualquier sala.
    db.query(ChatMessage).filter(ChatMessage.sender_id == user_id).delete(synchronize_session=False)

    # 2. Salas de chat donde el usuario es doctor o paciente
    #    (los mensajes restantes caen en cascada vía chat_messages.chat_room_id ON DELETE CASCADE).
    db.query(ChatRoom).filter(
        or_(ChatRoom.doctor_id == user_id, ChatRoom.patient_id == user_id)
    ).delete(synchronize_session=False)

    # 3. Relaciones doctor-paciente del usuario (en ambos roles).
    db.query(DoctorPatient).filter(
        or_(DoctorPatient.doctor_id == user_id, DoctorPatient.patient_id == user_id)
    ).delete(synchronize_session=False)

    # 4. Entrenamientos del usuario.
    db.query(Workout).filter(Workout.user_id == user_id).delete(synchronize_session=False)

    # 5. Eventos del usuario (sus tablas hijas caen vía ON DELETE CASCADE).
    db.query(Event).filter(Event.user_id == user_id).delete(synchronize_session=False)

    # 6. Rutinas: borrar las que pertenecen al usuario (días/objetivos caen vía cascada
    #    declarada en el ORM). Para rutinas creadas por el usuario pero asignadas a otro,
    #    sólo desvinculamos el creator_id ya que esa columna es nullable.
    db.execute(
        update(Routine)
        .where(Routine.creator_id == user_id, Routine.user_id != user_id)
        .values(creator_id=None)
    )
    routines_to_delete = db.query(Routine).filter(Routine.user_id == user_id).all()
    for routine in routines_to_delete:
        db.delete(routine)

    db.flush()
    db.delete(db_user)
    db.commit()
    return True
