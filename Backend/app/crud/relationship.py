from sqlalchemy.orm import Session
from app.models.relationship import DoctorPatient
from app.models.user import User

def create_relationship(db: Session, doctor_id: int, patient_id: int):
    # Check if already exists
    existing = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == doctor_id, 
        DoctorPatient.patient_id == patient_id
    ).first()
    
    if existing:
        return existing
        
    db_rel = DoctorPatient(
        doctor_id=doctor_id,
        patient_id=patient_id,
        status="pending"
    )
    db.add(db_rel)
    db.commit()
    db.refresh(db_rel)
    return db_rel

def get_relationship(db: Session, relationship_id: int):
    return db.query(DoctorPatient).filter(DoctorPatient.id == relationship_id).first()

def update_relationship_status(db: Session, relationship_id: int, status: str):
    rel = get_relationship(db, relationship_id)
    if rel:
        rel.status = status
        db.commit()
        db.refresh(rel)
    return rel

def get_doctor_patients(db: Session, doctor_id: int, status: str | None = None):
    query = db.query(DoctorPatient).filter(DoctorPatient.doctor_id == doctor_id)
    if status is not None:
        query = query.filter(DoctorPatient.status == status)
    return query.all()

def get_patient_doctors(db: Session, patient_id: int, status: str | None = None):
    query = db.query(DoctorPatient).filter(DoctorPatient.patient_id == patient_id)
    if status is not None:
        query = query.filter(DoctorPatient.status == status)
    return query.all()
    
def get_relationship_between(db: Session, doctor_id: int, patient_id: int):
    return db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == doctor_id,
        DoctorPatient.patient_id == patient_id
    ).first()
