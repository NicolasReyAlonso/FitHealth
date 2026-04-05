from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid

from app import crud
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.routine import (
    RoutineCreate, RoutineRead, RoutineUpdate,
    RoutineExerciseCreate, RoutineDietCreate, RoutineMedicationCreate,
    RoutineExerciseRead, RoutineDietRead, RoutineMedicationRead
)
from app.models.routine import RoutineDay, RoutineExercise, RoutineDiet, RoutineMedication

router = APIRouter(prefix="/routines", tags=["routines"])


@router.post("/{routine_id}/days/{day_of_week}/exercises", response_model=RoutineExerciseRead)
def add_exercise_to_routine(
    routine_id: int,
    day_of_week: int,
    exercise_data: RoutineExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    day = next((d for d in db_routine.days if d.day_of_week == day_of_week), None)
    if not day:
        day = RoutineDay(routine_id=routine_id, day_of_week=day_of_week)
        db.add(day)
        db.commit()
        db.refresh(day)
    
    db_ex = RoutineExercise(routine_day_id=day.id, **exercise_data.model_dump())
    db.add(db_ex)
    db.commit()
    db.refresh(db_ex)
    return db_ex

@router.post("/{routine_id}/days/{day_of_week}/diets", response_model=RoutineDietRead)
def add_diet_to_routine(
    routine_id: int,
    day_of_week: int,
    diet_data: RoutineDietCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    day = next((d for d in db_routine.days if d.day_of_week == day_of_week), None)
    if not day:
        day = RoutineDay(routine_id=routine_id, day_of_week=day_of_week)
        db.add(day)
        db.commit()
        db.refresh(day)
    
    db_diet = RoutineDiet(routine_day_id=day.id, **diet_data.model_dump())
    db.add(db_diet)
    db.commit()
    db.refresh(db_diet)
    return db_diet

@router.post("/{routine_id}/days/{day_of_week}/medications", response_model=RoutineMedicationRead)
def add_medication_to_routine(
    routine_id: int,
    day_of_week: int,
    med_data: RoutineMedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    day = next((d for d in db_routine.days if d.day_of_week == day_of_week), None)
    if not day:
        day = RoutineDay(routine_id=routine_id, day_of_week=day_of_week)
        db.add(day)
        db.commit()
        db.refresh(day)
    
    db_med = RoutineMedication(routine_day_id=day.id, **med_data.model_dump())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    return db_med

@router.delete("/items/{item_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine_item(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model_map = {
        "exercise": RoutineExercise,
        "diet": RoutineDiet,
        "medication": RoutineMedication
    }
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Tipo de ítem inválido")
    
    ItemModel = model_map[item_type]
    db_item = db.query(ItemModel).filter(ItemModel.id == item_id).first()
    if not db_item or db_item.day.routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    
    db.delete(db_item)
    db.commit()

@router.post("/exercises/{exercise_id}/image", response_model=dict)
async def upload_exercise_image(
    exercise_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure exercise belongs to the current user
    db_ex = db.query(RoutineExercise).filter(RoutineExercise.id == exercise_id).first()
    if not db_ex or db_ex.day.routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    # Guardar archivo localmente
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/exercises/{file_name}"
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    db_ex.image_url = f"/static/exercises/{file_name}"
    db.commit()
    db.refresh(db_ex)

    return {"message": "Imagen subida correctamente", "url": db_ex.image_url}

@router.get("/", response_model=list[RoutineRead])
def list_my_routines(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.routine.get_routines_by_user(db, current_user.id, skip=skip, limit=limit)


@router.post("/", response_model=RoutineRead, status_code=status.HTTP_201_CREATED)
def create_routine(
    routine_data: RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.routine.create_routine(db, routine_data, user_id=current_user.id)


@router.get("/{routine_id}", response_model=RoutineRead)
def get_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return db_routine


@router.patch("/{routine_id}", response_model=RoutineRead)
def update_routine(
    routine_id: int,
    routine_data: RoutineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return crud.routine.update_routine(db, routine_id, routine_data)


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    crud.routine.delete_routine(db, routine_id)
