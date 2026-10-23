from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.auth.models import User


def list_owned(db: Session, model: type[Any], user: User) -> list[Any]:
    return list(db.scalars(select(model).where(model.user_id == user.id).order_by(model.created_at.desc())))


def create_owned(db: Session, model: type[Any], data: BaseModel, user: User) -> Any:
    record = model(user_id=user.id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_owned(db: Session, model: type[Any], record_id: UUID, user: User) -> Any:
    record = db.scalar(select(model).where(model.id == record_id, model.user_id == user.id))
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return record


def update_owned(db: Session, record: Any, data: BaseModel) -> Any:
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is None and not record.__table__.columns[key].nullable:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{key} cannot be null")
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


def delete_owned(db: Session, record: Any) -> None:
    db.delete(record)
    db.commit()
