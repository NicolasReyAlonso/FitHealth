from datetime import datetime, time

from pydantic import BaseModel


# --- Routine Exercise ---
class RoutineExerciseCreate(BaseModel):
    name: str
    sets: int | None = None
    reps: int | None = None
    duration_minutes: int | None = None
    notes: str | None = None
    image_url: str | None = None

class RoutineExerciseRead(BaseModel):
    id: int
    routine_day_id: int
    name: str
    sets: int | None
    reps: int | None
    duration_minutes: int | None
    notes: str | None
    image_url: str | None

    model_config = {"from_attributes": True}


# --- Routine Diet ---
class RoutineDietCreate(BaseModel):
    name: str
    description: str | None = None
    calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    notes: str | None = None
    time_of_day: time | None = None


class RoutineDietRead(BaseModel):
    id: int
    routine_day_id: int
    name: str
    description: str | None
    calories: int | None
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    notes: str | None
    time_of_day: time | None

    model_config = {"from_attributes": True}


# --- Routine Medication ---
class RoutineMedicationCreate(BaseModel):
    name: str
    dose: str
    notes: str | None = None
    time_of_day: time | None = None
    is_completed: bool = False

class RoutineMedicationUpdate(BaseModel):
    is_completed: bool

class RoutineMedicationRead(BaseModel):
    id: int
    routine_day_id: int
    name: str
    dose: str
    notes: str | None
    time_of_day: time | None
    is_completed: bool

    model_config = {"from_attributes": True}


# --- Routine Day ---
class RoutineDayCreate(BaseModel):
    day_of_week: int
    exercises: list[RoutineExerciseCreate] = []
    diet_items: list[RoutineDietCreate] = []
    medications: list[RoutineMedicationCreate] = []

class RoutineDayRead(BaseModel):
    id: int
    routine_id: int
    day_of_week: int
    exercises: list[RoutineExerciseRead] = []
    diet_items: list[RoutineDietRead] = []
    medications: list[RoutineMedicationRead] = []

    model_config = {"from_attributes": True}




# --- Routine Objective ---
class RoutineObjectiveCreate(BaseModel):
    name: str
    description: str | None = None
    type: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    unit: str | None = None
    recommended_date: datetime | None = None
    deadline_date: datetime | None = None
    is_completed: bool = False

class RoutineObjectiveUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    unit: str | None = None
    recommended_date: datetime | None = None
    deadline_date: datetime | None = None
    is_completed: bool | None = None

class RoutineObjectiveRead(BaseModel):
    id: int
    routine_id: int
    name: str
    description: str | None
    type: str | None
    target_value: float | None
    current_value: float | None
    unit: str | None
    recommended_date: datetime | None
    deadline_date: datetime | None
    is_completed: bool

    model_config = {"from_attributes": True}

# --- Routine ---
class RoutineCreate(BaseModel):
    name: str
    description: str | None = None
    patient_id: int | None = None
    days: list[RoutineDayCreate] = []
    objectives: list[RoutineObjectiveCreate] = []


class RoutineRead(BaseModel):
    id: int
    user_id: int
    creator_id: int | None = None
    name: str
    description: str | None
    created_at: datetime
    days: list[RoutineDayRead] = []
    objectives: list[RoutineObjectiveRead] = []

    model_config = {"from_attributes": True}


class RoutineUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
