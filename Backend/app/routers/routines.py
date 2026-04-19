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
    RoutineExerciseRead, RoutineDietRead, RoutineMedicationRead, RoutineDayRead, RoutineObjectiveCreate, RoutineObjectiveRead, RoutineObjectiveUpdate
)
from app.models.routine import RoutineDay, RoutineExercise, RoutineDiet, RoutineMedication, RoutineObjective

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
        "medication": RoutineMedication,
        "objective": RoutineObjective
    }
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Tipo de ítem inválido")
    
    ItemModel = model_map[item_type]
    db_item = db.query(ItemModel).filter(ItemModel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
        
    # Check permissions based on relation type
    if item_type == "objective":
        if db_item.routine.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Ítem no encontrado")
    else:
        if db_item.day.routine.user_id != current_user.id:
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


@router.post("/{routine_id}/days", response_model=RoutineRead)
def add_day_to_routine(
    routine_id: int,
    day_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    day_of_week = day_data.get("day_of_week")
    if day_of_week is None or not isinstance(day_of_week, int) or day_of_week < 0 or day_of_week > 6:
        raise HTTPException(status_code=400, detail="day_of_week debe ser un número entre 0 y 6")
    
    # Verificar si ya existe
    existing_day = next((d for d in db_routine.days if d.day_of_week == day_of_week), None)
    if not existing_day:
        # Crear nuevo día
        new_day = RoutineDay(routine_id=routine_id, day_of_week=day_of_week)
        db.add(new_day)
        db.commit()
    
    # Refrescar la rutina completa y devolverla
    db.refresh(db_routine)
    return db_routine


@router.post("/{routine_id}/duplicate-day", response_model=RoutineRead)
def duplicate_routine_day(
    routine_id: int,
    day_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copia el contenido de un día a otros días de la rutina"""
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    source_day = day_data.get("source_day")
    target_days = day_data.get("target_days", [])
    
    if source_day is None or not isinstance(source_day, int) or source_day < 0 or source_day > 6:
        raise HTTPException(status_code=400, detail="source_day debe ser un número entre 0 y 6")
    
    if not isinstance(target_days, list) or len(target_days) == 0:
        raise HTTPException(status_code=400, detail="target_days debe ser una lista con al menos un día")
    
    # Obtener el día fuente
    source_routine_day = next((d for d in db_routine.days if d.day_of_week == source_day), None)
    if not source_routine_day:
        raise HTTPException(status_code=404, detail="El día de origen no existe en la rutina")
    
    # Para cada día destino
    for target_day in target_days:
        if not isinstance(target_day, int) or target_day < 0 or target_day > 6:
            continue
        
        # Crear el día destino si no existe
        target_routine_day = next((d for d in db_routine.days if d.day_of_week == target_day), None)
        if not target_routine_day:
            target_routine_day = RoutineDay(routine_id=routine_id, day_of_week=target_day)
            db.add(target_routine_day)
            db.flush()  # Para obtener el ID antes de hacer commit
        
        # Copiar ejercicios
        for exercise in source_routine_day.exercises:
            new_exercise = RoutineExercise(
                routine_day_id=target_routine_day.id,
                name=exercise.name,
                sets=exercise.sets,
                reps=exercise.reps,
                image_url=exercise.image_url
            )
            db.add(new_exercise)
        
        # Copiar dietas
        for diet in source_routine_day.diet_items:
            new_diet = RoutineDiet(
                routine_day_id=target_routine_day.id,
                name=diet.name,
                calories=diet.calories,
                time_of_day=diet.time_of_day
            )
            db.add(new_diet)
        
        # Copiar medicamentos
        for medication in source_routine_day.medications:
            new_medication = RoutineMedication(
                routine_day_id=target_routine_day.id,
                name=medication.name,
                dose=medication.dose,
                time_of_day=medication.time_of_day
            )
            db.add(new_medication)
    
    db.commit()
    db.refresh(db_routine)
    return db_routine


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


@router.post("/{routine_id}/objectives", response_model=RoutineObjectiveRead)
def add_objective_to_routine(
    routine_id: int,
    objective_data: RoutineObjectiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    return crud.routine.create_routine_objective(db, routine_id, objective_data.model_dump())

@router.put("/objectives/{objective_id}", response_model=RoutineObjectiveRead)
def update_objective(
    objective_id: int,
    objective_data: RoutineObjectiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud.routine.get_routine_objective(db, objective_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    
    db_routine = crud.routine.get_routine(db, db_obj.routine_id)
    if not db_routine or db_routine.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    updated_obj = crud.routine.update_routine_objective(
        db, objective_id, objective_data.model_dump(exclude_unset=True)
    )
    return updated_obj
