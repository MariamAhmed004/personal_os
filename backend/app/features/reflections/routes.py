from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.reflections.models import Reflection
from app.features.reflections.schemas import ReflectionCreate, ReflectionRead, ReflectionUpdate
from app.shared.auth import get_current_user
from app.shared.crud import delete_owned, get_owned, update_owned

router = APIRouter(prefix="/reflections", tags=["reflections"])


@router.get("", response_model=list[ReflectionRead])
def list_reflections(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(select(Reflection).where(Reflection.user_id == user.id).order_by(Reflection.period_start.desc())))


@router.post("", response_model=ReflectionRead, status_code=status.HTTP_201_CREATED)
def create_reflection(data: ReflectionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reflection = Reflection(user_id=user.id, **data.model_dump())
    db.add(reflection)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A reflection already exists for this period") from None
    db.refresh(reflection)
    return reflection


@router.get("/{record_id}", response_model=ReflectionRead)
def get_reflection(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, Reflection, record_id, user)


@router.patch("/{record_id}", response_model=ReflectionRead)
def update_reflection(record_id: UUID, data: ReflectionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return update_owned(db, get_owned(db, Reflection, record_id, user), data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reflection(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, Reflection, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
