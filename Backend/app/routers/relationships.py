from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.relationship import RelationshipRead
from app.crud.relationship import (
    create_relationship,
    update_relationship_status,
    get_doctor_patients,
    get_patient_doctors,
    get_relationship,
    delete_relationship,
)

router = APIRouter(prefix="/relationships", tags=["relationships"])

from app.routers.notifications import notification_manager

@router.post("/request", response_model=RelationshipRead, status_code=status.HTTP_201_CREATED)
async def send_relationship_request(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can send relationship requests")
        
    patient = crud.user.get_user(db, patient_id)
    if not patient or patient.role != "patient":
        raise HTTPException(status_code=404, detail="Patient not found or invalid role")
        
    rel = create_relationship(db, doctor_id=current_user.id, patient_id=patient_id)
    
    # Notificar al paciente de la solicitud de conexión
    await notification_manager.send_personal_message(
        {"type": "contact_request", "message": f"Tienes una nueva solicitud de {current_user.username}"},
        patient_id
    )

    return RelationshipRead(
        id=rel.id,
        doctor_id=rel.doctor_id,
        patient_id=rel.patient_id,
        status=rel.status,
        created_at=rel.created_at,
        updated_at=rel.updated_at,
        doctor_username=current_user.username,
        patient_username=patient.username,
        doctor_profile_picture=current_user.profile_picture,
        patient_profile_picture=patient.profile_picture,
    )

@router.patch("/{relationship_id}/status", response_model=RelationshipRead)
async def update_request_status(
    relationship_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    rel = get_relationship(db, relationship_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
        
    if current_user.id != rel.patient_id:
        raise HTTPException(status_code=403, detail="Only the patient can update the request status")
        
    rel = update_relationship_status(db, relationship_id, status)
    
    # Notificar al doctor que su solicitud fue aceptada
    if status == "accepted":
        await notification_manager.send_personal_message(
            {"type": "contact_accepted", "message": f"{current_user.username} ha aceptado tu solicitud"},
            rel.doctor_id
        )
    
    return RelationshipRead(
        id=rel.id,
        doctor_id=rel.doctor_id,
        patient_id=rel.patient_id,
        status=rel.status,
        created_at=rel.created_at,
        updated_at=rel.updated_at,
        doctor_username=rel.doctor.username,
        patient_username=rel.patient.username,
        doctor_profile_picture=rel.doctor.profile_picture,
        patient_profile_picture=rel.patient.profile_picture,
    )

@router.get("/doctor/patients", response_model=list[dict])
def get_my_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view their patients")
        
    # Get all patients for this doctor based on accepted relationship
    rels = get_doctor_patients(db, doctor_id=current_user.id, status="accepted")
    return [{"id": rel.patient.id, "username": rel.patient.username, "email": rel.patient.email, "profile_picture": rel.patient.profile_picture, "relationship_id": rel.id} for rel in rels]

@router.get("/doctor/pending", response_model=list[RelationshipRead])
def get_doctor_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view their requests")
        
    rels = get_doctor_patients(db, doctor_id=current_user.id, status="pending")
    return [
        RelationshipRead(
            id=r.id,
            doctor_id=r.doctor_id,
            patient_id=r.patient_id,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
            doctor_username=r.doctor.username,
            patient_username=r.patient.username,
            doctor_profile_picture=r.doctor.profile_picture,
            patient_profile_picture=r.patient.profile_picture,
        ) for r in rels
    ]


@router.get("/patient/pending", response_model=list[RelationshipRead])
def get_patient_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their requests")
        
    rels = get_patient_doctors(db, patient_id=current_user.id, status="pending")
    return [
        RelationshipRead(
            id=r.id,
            doctor_id=r.doctor_id,
            patient_id=r.patient_id,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
            doctor_username=r.doctor.username,
            patient_username=r.patient.username,
            doctor_profile_picture=r.doctor.profile_picture,
            patient_profile_picture=r.patient.profile_picture,
        ) for r in rels
    ]

@router.get("/patient/doctors", response_model=list[dict])
def get_my_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their doctors")
        
    rels = get_patient_doctors(db, patient_id=current_user.id, status="accepted")
    return [{"id": rel.doctor.id, "username": rel.doctor.username, "email": rel.doctor.email, "profile_picture": rel.doctor.profile_picture, "relationship_id": rel.id} for rel in rels]

@router.delete("/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rel = get_relationship(db, relationship_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
        
    if current_user.id not in [rel.doctor_id, rel.patient_id]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this relationship")
        
    delete_relationship(db, relationship_id)
    
    # Notificar al otro usuario
    other_user_id = rel.patient_id if current_user.id == rel.doctor_id else rel.doctor_id
    await notification_manager.send_personal_message(
        {"type": "contact_deleted", "message": f"{current_user.username} ya no está en tus contactos"},
        other_user_id
    )
    
    return None
