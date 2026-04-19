from sqlalchemy.orm import Session

from app.models.routine import Routine, RoutineDay, RoutineExercise, RoutineDiet, RoutineMedication, RoutineObjective
from app.schemas.routine import RoutineCreate, RoutineUpdate


def get_routine(db: Session, routine_id: int) -> Routine | None:
    return db.query(Routine).filter(Routine.id == routine_id).first()


def get_routines_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Routine]:
    return db.query(Routine).filter(Routine.user_id == user_id).offset(skip).limit(limit).all()


def create_routine(db: Session, routine_data: RoutineCreate, user_id: int) -> Routine:
    db_routine = Routine(
        user_id=user_id,
        name=routine_data.name,
        description=routine_data.description,
    )
    for day_data in routine_data.days:
        db_day = RoutineDay(day_of_week=day_data.day_of_week)
        for ex in day_data.exercises:
            db_day.exercises.append(RoutineExercise(**ex.model_dump()))
        for di in day_data.diet_items:
            db_day.diet_items.append(RoutineDiet(**di.model_dump()))
        for med in day_data.medications:
            db_day.medications.append(RoutineMedication(**med.model_dump()))
        db_routine.days.append(db_day)

    if hasattr(routine_data, "objectives") and routine_data.objectives:
        for obj_data in routine_data.objectives:
            db_routine.objectives.append(RoutineObjective(**obj_data.model_dump()))

    db.add(db_routine)
    db.commit()
    db.refresh(db_routine)
    return db_routine


def update_routine(db: Session, routine_id: int, routine_data: RoutineUpdate) -> Routine | None:
    db_routine = get_routine(db, routine_id)
    if not db_routine:
        return None
    for field, value in routine_data.model_dump(exclude_unset=True).items():
        setattr(db_routine, field, value)
    db.commit()
    db.refresh(db_routine)
    return db_routine


def delete_routine(db: Session, routine_id: int) -> bool:
    db_routine = get_routine(db, routine_id)
    if not db_routine:
        return False
    db.delete(db_routine)
    db.commit()
    return True


def create_routine_objective(db: Session, routine_id: int, obj_data: dict) -> RoutineObjective:
    db_obj = RoutineObjective(routine_id=routine_id, **obj_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_routine_objective(db: Session, objective_id: int) -> RoutineObjective | None:
    return db.query(RoutineObjective).filter(RoutineObjective.id == objective_id).first()

def update_routine_objective(db: Session, objective_id: int, obj_data: dict) -> RoutineObjective | None:
    db_obj = get_routine_objective(db, objective_id)
    if not db_obj:
        return None
    for field, value in obj_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_routine_objective(db: Session, objective_id: int) -> bool:
    db_obj = get_routine_objective(db, objective_id)
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True
