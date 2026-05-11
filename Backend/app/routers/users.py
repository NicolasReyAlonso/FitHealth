from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[dict])
def search_users(
    query: str,
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search_pattern = f"%{query}%"
    db_query = db.query(User).filter(
        (User.username.ilike(search_pattern)) | (User.email.ilike(search_pattern))
    )
    if role:
        db_query = db_query.filter(User.role == role)

    users = db_query.limit(20).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "profile_picture": u.profile_picture,
        }
        for u in users
    ]


@router.get("/", response_model=list[UserRead])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.user.get_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user = crud.user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No puedes modificar otro usuario")
    db_user = crud.user.update_user(db, user_id, user_data)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No puedes eliminar otro usuario")
    if not crud.user.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
