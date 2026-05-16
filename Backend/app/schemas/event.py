from datetime import datetime

from pydantic import BaseModel


# --- Sub-data schemas ---
class BiometricDataCreate(BaseModel):
    heart_rate_avg: int | None = None
    heart_rate_max: int | None = None
    heart_rate_min: int | None = None
    blood_sugar: float | None = None
    blood_pressure_systolic: int | None = None
    blood_pressure_diastolic: int | None = None
    blood_oxygen: float | None = None
    temperature: float | None = None


class BiometricDataRead(BiometricDataCreate):
    id: int
    event_id: int
    model_config = {"from_attributes": True}


class WaterLogCreate(BaseModel):
    amount_ml: int


class WaterLogRead(WaterLogCreate):
    id: int
    event_id: int
    model_config = {"from_attributes": True}


class ActivityLogCreate(BaseModel):
    activity_type: str
    duration_minutes: int | None = None
    calories_burned: int | None = None
    distance_km: float | None = None
    steps: int | None = None


class ActivityLogRead(ActivityLogCreate):
    id: int
    event_id: int
    model_config = {"from_attributes": True}


class FoodLogCreate(BaseModel):
    food_name: str
    calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    quantity: float | None = None
    unit: str | None = None


class FoodLogRead(FoodLogCreate):
    id: int
    event_id: int
    model_config = {"from_attributes": True}


class WeightLogCreate(BaseModel):
    weight_kg: float
    body_fat_percentage: float | None = None


class WeightLogRead(WeightLogCreate):
    id: int
    event_id: int
    model_config = {"from_attributes": True}


# --- Event ---
class EventCreate(BaseModel):
    name: str
    event_type: str  # biometric, water, activity, food, weight, custom
    routine_id: int | None = None
    timestamp: datetime | None = None
    notes: str | None = None
    biometric: BiometricDataCreate | None = None
    water_log: WaterLogCreate | None = None
    activity_log: ActivityLogCreate | None = None
    food_log: FoodLogCreate | None = None
    weight_log: WeightLogCreate | None = None


class EventRead(BaseModel):
    id: int
    user_id: int
    routine_id: int | None
    name: str
    event_type: str
    timestamp: datetime
    notes: str | None
    created_at: datetime
    biometric: BiometricDataRead | None = None
    water_log: WaterLogRead | None = None
    activity_log: ActivityLogRead | None = None
    food_log: FoodLogRead | None = None
    weight_log: WeightLogRead | None = None

    model_config = {"from_attributes": True}


class EventUpdate(BaseModel):
    name: str | None = None
    routine_id: int | None = None
    timestamp: datetime | None = None
    notes: str | None = None
