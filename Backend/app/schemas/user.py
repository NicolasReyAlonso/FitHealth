from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str = "patient"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    profile_picture: str | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    profile_picture: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
