from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import os
import uuid

from app import crud
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.relationship import DoctorPatient
from app.schemas.routine import (
    RoutineCreate, RoutineRead, RoutineUpdate,
    RoutineExerciseCreate, RoutineDietCreate, RoutineMedicationCreate,
    RoutineExerciseRead, RoutineDietRead, RoutineMedicationRead, RoutineDayRead, RoutineObjectiveCreate, RoutineObjectiveRead, RoutineObjectiveUpdate
)
from app.models.routine import RoutineDay, RoutineExercise, RoutineDiet, RoutineMedication, RoutineObjective
from app.routers.notifications import notification_manager

router = APIRouter(prefix="/routines", tags=["routines"])

class RoutineConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, routine_id: int):
        await websocket.accept()
        if routine_id not in self.active_connections:
            self.active_connections[routine_id] = []
        self.active_connections[routine_id].append(websocket)

    def disconnect(self, websocket: WebSocket, routine_id: int):
        if routine_id in self.active_connections:
            if websocket in self.active_connections[routine_id]:
                self.active_connections[routine_id].remove(websocket)

    async def broadcast(self, routine_id: int, message: dict):
        if routine_id in self.active_connections:
            for connection in self.active_connections[routine_id]:
                await connection.send_json(message)

manager = RoutineConnectionManager()

class RoutineListConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections and websocket in self.active_connections[user_id]:
            self.active_connections[user_id].remove(websocket)

    async def broadcast(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

list_manager = RoutineListConnectionManager()

@router.websocket("/ws/user/{user_id}")
async def user_routines_websocket(websocket: WebSocket, user_id: int):
    await list_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        list_manager.disconnect(websocket, user_id)

@router.websocket("/ws/{routine_id}")
async def websocket_endpoint(websocket: WebSocket, routine_id: int):
    await manager.connect(websocket, routine_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, routine_id)


@router.post("/{routine_id}/days/{day_of_week}/exercises", response_model=RoutineExerciseRead)
async def add_exercise_to_routine(
    routine_id: int,
    day_of_week: int,
    exercise_data: RoutineExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
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
    await manager.broadcast(routine_id, {"type": "routine_updated"})
    
    if current_user.id != db_routine.user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha modificado tu rutina: {db_routine.name}"},
            db_routine.user_id
        )

    return db_ex

@router.post("/{routine_id}/days/{day_of_week}/diets", response_model=RoutineDietRead)
async def add_diet_to_routine(
    routine_id: int,
    day_of_week: int,
    diet_data: RoutineDietCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
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
    await manager.broadcast(routine_id, {"type": "routine_updated"})

    if current_user.id != db_routine.user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha modificado tu rutina: {db_routine.name}"},
            db_routine.user_id
        )

    return db_diet

@router.post("/{routine_id}/days/{day_of_week}/medications", response_model=RoutineMedicationRead)
async def add_medication_to_routine(
    routine_id: int,
    day_of_week: int,
    med_data: RoutineMedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
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
    await manager.broadcast(routine_id, {"type": "routine_updated"})

    if current_user.id != db_routine.user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha modificado tu rutina: {db_routine.name}"},
            db_routine.user_id
        )

    return db_med

@router.delete("/items/{item_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine_item(
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
        owner_id = db_item.routine.user_id
        creator_id = db_item.routine.creator_id
    else:
        owner_id = db_item.day.routine.user_id
        creator_id = db_item.day.routine.creator_id
        
    if owner_id != current_user.id and creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if owner_id == current_user.id and creator_id is not None and creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminar items de la rutina de tu doctor")
    
    db.delete(db_item)
    db.commit()
    
    routine_id = db_item.routine_id if item_type == "objective" else db_item.day.routine_id
    await manager.broadcast(routine_id, {"type": "routine_updated"})
    
    if current_user.id != owner_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha eliminado un elemento de tu rutina"},
            owner_id
        )

@router.post("/exercises/{exercise_id}/image", response_model=dict)
async def upload_exercise_image(
    exercise_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure exercise belongs to the current user
    db_ex = db.query(RoutineExercise).filter(RoutineExercise.id == exercise_id).first()
    if not db_ex:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
        
    owner_id = db_ex.day.routine.user_id
    creator_id = db_ex.day.routine.creator_id
    
    if owner_id != current_user.id and creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if owner_id == current_user.id and creator_id is not None and creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes modificar la foto de un ejercicio de tu doctor")

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
    await manager.broadcast(db_ex.day.routine_id, {"type": "routine_updated"})

    return {"message": "Imagen subida correctamente", "url": db_ex.image_url}

@router.get("/", response_model=list[RoutineRead])
def list_my_routines(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.routine.get_routines_by_user(db, current_user.id, skip=skip, limit=limit)


from app.schemas.routine import RoutineMedicationUpdate

@router.patch("/medications/{medication_id}", response_model=RoutineMedicationRead)
async def update_medication(
    medication_id: int,
    medication_data: RoutineMedicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_med = crud.routine.get_routine_medication(db, medication_id)
    if not db_med:
        raise HTTPException(status_code=404, detail="Medicación no encontrada")
    
    db_day = db.query(RoutineDay).filter(RoutineDay.id == db_med.routine_day_id).first()
    db_routine = crud.routine.get_routine(db, db_day.routine_id)
    
    is_owner = db_routine and db_routine.user_id == current_user.id
    is_creator = db_routine and db_routine.creator_id == current_user.id
    
    if not is_owner and not is_creator:
        raise HTTPException(status_code=403, detail="No autorizado")

    if is_owner and db_routine.creator_id is not None and db_routine.creator_id != current_user.id:
        update_data = medication_data.model_dump(exclude_unset=True)
        allowed_keys = {"is_completed"}
        if any(k not in allowed_keys for k in update_data.keys()):
             raise HTTPException(status_code=403, detail="Solo puedes completar una medicacion de doctor")
             
    updated_med = crud.routine.update_routine_medication(
        db, medication_id, medication_data.model_dump(exclude_unset=True)
    )
    
    await manager.broadcast(db_routine.id, {"type": "medication_updated", "id": medication_id, "is_completed": updated_med.is_completed})
    target_user_id = db_routine.creator_id if current_user.id == db_routine.user_id else db_routine.user_id
    if target_user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha actualizado el estado de una medicación en la rutina: {db_routine.name}"},
            target_user_id
        )
    return updated_med

@router.post("/", response_model=RoutineRead, status_code=status.HTTP_201_CREATED)
async def create_routine(
    routine_data: RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user_id = current_user.id
    creator_id = None
    
    if current_user.role == "doctor" and routine_data.patient_id is not None:
        # Check if the doctor is assigned to this patient
        rel = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == current_user.id,
            DoctorPatient.patient_id == routine_data.patient_id,
            DoctorPatient.status == "accepted"
        ).first()
        if not rel:
            raise HTTPException(status_code=403, detail="No puedes asignar rutinas a este paciente")
        target_user_id = routine_data.patient_id
        creator_id = current_user.id
        
    routine = crud.routine.create_routine(db, routine_data, user_id=target_user_id, creator_id=creator_id)
    await list_manager.broadcast(target_user_id, {"type": "routine_added"})
    
    if current_user.id != target_user_id:
        await notification_manager.send_personal_message(
            {"type": "new_routine", "message": f"{current_user.username} te ha asignado una nueva rutina: {routine.name}"},
            target_user_id
        )

    if creator_id:
        await list_manager.broadcast(creator_id, {"type": "routine_added"})
    return routine


@router.post("/{routine_id}/days", response_model=RoutineRead)
def add_day_to_routine(
    routine_id: int,
    day_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
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
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
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
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return db_routine


@router.patch("/{routine_id}", response_model=RoutineRead)
async def update_routine(
    routine_id: int,
    routine_data: RoutineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    # User must be creator or owner, but if it has a creator, owner can't edit
    is_owner = db_routine.user_id == current_user.id
    is_creator = db_routine.creator_id == current_user.id
    
    if not is_owner and not is_creator:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta rutina")
        
    if is_owner and db_routine.creator_id is not None and db_routine.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes editar una rutina asignada por un doctor")
        
    # Check if a doctor is re-assigning it to another patient
    if routine_data.user_id is not None:
        if current_user.role != "doctor":
            raise HTTPException(status_code=403, detail="Solo los doctores pueden reasignar rutinas")
        # Ensure the patient is a valid accepted relationship
        from app.models.relationship import DoctorPatient
        rel = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == current_user.id, 
            DoctorPatient.patient_id == routine_data.user_id,
            DoctorPatient.status == "accepted"
        ).first()
        if not rel and routine_data.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Paciente no válido")
        
    old_user_id = db_routine.user_id
    res = crud.routine.update_routine(db, routine_id, routine_data)
    await manager.broadcast(routine_id, {"type": "routine_updated"})
    
    # Update lists for both users via WebSocket
    await list_manager.broadcast(old_user_id, {"type": "routine_unassigned"})
    if routine_data.user_id is not None:
        await list_manager.broadcast(routine_data.user_id, {"type": "routine_added"})
    if db_routine.creator_id:
        await list_manager.broadcast(db_routine.creator_id, {"type": "routine_updated"})
    
    target_user_id = db_routine.creator_id if current_user.id == db_routine.user_id else db_routine.user_id
    if target_user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha modificado los detalles de la rutina: {db_routine.name}"},
            target_user_id
        )
    if routine_data.user_id is not None and routine_data.user_id != old_user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_assigned", "message": f"{current_user.username} te ha asignado una nueva rutina: {db_routine.name}"},
            routine_data.user_id
        )
        if old_user_id != current_user.id:
            await notification_manager.send_personal_message(
                {"type": "routine_unassigned", "message": f"{current_user.username} te ha desasignado la rutina: {db_routine.name}"},
                old_user_id
            )

    return res


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    is_owner = db_routine.user_id == current_user.id
    is_creator = db_routine.creator_id == current_user.id
    
    if not is_owner and not is_creator:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta rutina")
        
    if is_owner and db_routine.creator_id is not None and db_routine.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminar una rutina asignada por un doctor")
        
    crud.routine.delete_routine(db, routine_id)
    
    await list_manager.broadcast(db_routine.user_id, {"type": "routine_deleted"})
    if db_routine.creator_id:
        await list_manager.broadcast(db_routine.creator_id, {"type": "routine_deleted"})
        
    # Notificación de desasignación/eliminación al paciente (user_id)
    await list_manager.broadcast(db_routine.user_id, {
        "type": "routine_unassigned", 
        "message": f"La rutina '{db_routine.name}' ha sido eliminada o desasignada."
    })

    if current_user.id != db_routine.user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_deleted", "message": f"{current_user.username} ha eliminado la rutina: {db_routine.name}"},
            db_routine.user_id
        )


@router.post("/{routine_id}/objectives", response_model=RoutineObjectiveRead)
async def add_objective_to_routine(
    routine_id: int,
    objective_data: RoutineObjectiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.routine.get_routine(db, routine_id)
    if not db_routine: raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if db_routine.user_id != current_user.id and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No autorizado")
    if db_routine.user_id == current_user.id and db_routine.creator_id is not None and db_routine.creator_id != current_user.id: raise HTTPException(status_code=403, detail="No puedes modificar esta rutina de doctor")
    
    obj = crud.routine.create_routine_objective(db, routine_id, objective_data.model_dump())
    await manager.broadcast(routine_id, {"type": "routine_updated"})
    
    target_user_id = db_routine.creator_id if current_user.id == db_routine.user_id else db_routine.user_id
    if target_user_id:
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} ha añadido o actualizado un objetivo en la rutina: {db_routine.name}"},
            target_user_id
        )
        
    return obj

@router.put("/objectives/{objective_id}", response_model=RoutineObjectiveRead)
async def update_objective(
    objective_id: int,
    objective_data: RoutineObjectiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud.routine.get_routine_objective(db, objective_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    
    db_routine = crud.routine.get_routine(db, db_obj.routine_id)
    is_owner = db_routine and db_routine.user_id == current_user.id
    is_creator = db_routine and db_routine.creator_id == current_user.id
    
    if not is_owner and not is_creator:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    # Prevent patient from editing anything other than is_completed if created by doctor
    if is_owner and db_routine.creator_id is not None and db_routine.creator_id != current_user.id:
        update_data = objective_data.model_dump(exclude_unset=True)
        # Check if they are trying to update something else than is_completed or current_value
        allowed_keys = {"is_completed", "current_value"}
        if any(k not in allowed_keys for k in update_data.keys()):
             raise HTTPException(status_code=403, detail="Solo puedes completar o actualizar valor en una meta de doctor")
             
    updated_obj = crud.routine.update_routine_objective(
        db, objective_id, objective_data.model_dump(exclude_unset=True)
    )
    
    await manager.broadcast(db_routine.id, {"type": "objective_updated", "id": objective_id, "is_completed": updated_obj.is_completed})
    
    target_user_id = db_routine.creator_id if current_user.id == db_routine.user_id else db_routine.user_id
    if target_user_id:
        msg_text = "ha completado un" if updated_obj.is_completed else "ha modificado el estado de un"
        await notification_manager.send_personal_message(
            {"type": "routine_updated", "message": f"{current_user.username} {msg_text} objetivo en la rutina: {db_routine.name}"},
            target_user_id
        )
        
    return updated_obj
