from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.backlog.models import BacklogItem
from app.features.backlog.schemas import BacklogItemCreate, BacklogItemRead, BacklogItemUpdate
from app.shared.auth import get_current_user
from app.shared.crud import create_owned, delete_owned, get_owned, list_owned, update_owned

router = APIRouter(prefix="/backlog/items", tags=["backlog"])


@router.get("", response_model=list[BacklogItemRead])
def list_items(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list_owned(db, BacklogItem, user)


@router.post("", response_model=BacklogItemRead, status_code=status.HTTP_201_CREATED)
def create_item(data: BacklogItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return create_owned(db, BacklogItem, data, user)


@router.get("/{record_id}", response_model=BacklogItemRead)
def get_item(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, BacklogItem, record_id, user)


@router.patch("/{record_id}", response_model=BacklogItemRead)
def update_item(record_id: UUID, data: BacklogItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return update_owned(db, get_owned(db, BacklogItem, record_id, user), data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, BacklogItem, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
