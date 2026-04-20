import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse

from app import crud
from app.auth import verify_password, create_access_token, get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, Token, LoginRequest
from app.email_utils import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if crud.user.get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    if crud.user.get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=400, detail="Username ya registrado")
    if user_data.role not in ("patient", "doctor"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    # Generar token y enviar correo
    verification_token = secrets.token_urlsafe(32)
    user = crud.user.create_user(db, user_data, verification_token=verification_token)
    
    # Mandamos el correo (en modo simulador si no hay credenciales)
    send_verification_email(user_data.email, verification_token)
    
    return user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = crud.user.get_user_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Por favor, verifica tu correo primero haciendo clic en el enlace que te enviamos.",
        )
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/verify", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    
    if not user:
        return f"""
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {{ font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 40px 20px; background-color: #FFFFFF; color: #0F172A; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: #FFFFFF; padding: 40px 20px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E2E8F0; }}
                    h1 {{ color: #EF4444; font-size: 24px; margin-bottom: 16px; }}
                    p {{ font-size: 16px; line-height: 1.5; color: #64748B; }}
                    .icon {{ font-size: 56px; margin-bottom: 16px; display: block; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <span class="icon">❌</span>
                    <h1>Enlace Inválido o Expirado</h1>
                    <p>El enlace de verificación no es válido. Puede que ya hayas verificado tu cuenta o que el enlace esté incompleto.</p>
                </div>
            </body>
        </html>
        """
        
    user.is_verified = True
    user.verification_token = None # Invalidar el token para que no se re-use
    db.commit()
    
    return f"""
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 40px 20px; background-color: #EEF2FF; color: #0F172A; }}
                .container {{ max-width: 500px; margin: 0 auto; background: #FFFFFF; padding: 40px 20px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E2E8F0; }}
                h1 {{ color: #6366F1; font-size: 24px; margin-bottom: 16px; }}
                p {{ font-size: 16px; line-height: 1.5; color: #64748B; }}
                b {{ color: #0F172A; }}
                .icon {{ font-size: 56px; margin-bottom: 16px; display: block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <span class="icon">✅</span>
                <h1>¡Cuenta Verificada Exitosamente!</h1>
                <p>Tu correo <b>{user.email}</b> ha sido verificado.</p>
                <p>Ya puedes volver a la aplicación e iniciar sesión.</p>
            </div>
        </body>
    </html>
    """
