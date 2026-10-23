from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.mood.models import MoodEntry
from app.features.mood.schemas import MoodEntryCreate, MoodEntryRead, MoodEntryUpdate
from app.shared.auth import get_current_user
from app.shared.crud import delete_owned, get_owned, update_owned

router = APIRouter(prefix="/moods", tags=["moods"])


@router.get("", response_model=list[MoodEntryRead])
def list_moods(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(select(MoodEntry).where(MoodEntry.user_id == user.id).order_by(MoodEntry.entry_date.desc())))


@router.post("", response_model=MoodEntryRead, status_code=status.HTTP_201_CREATED)
def create_mood(data: MoodEntryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    entry = MoodEntry(user_id=user.id, **data.model_dump())
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A mood entry already exists for this date and period") from None
    db.refresh(entry)
    return entry


@router.get("/{record_id}", response_model=MoodEntryRead)
def get_mood(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, MoodEntry, record_id, user)


@router.patch("/{record_id}", response_model=MoodEntryRead)
def update_mood(record_id: UUID, data: MoodEntryUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return update_owned(db, get_owned(db, MoodEntry, record_id, user), data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, MoodEntry, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
