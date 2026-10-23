from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.habits.models import Habit
from app.features.habits.schemas import HabitCreate, HabitRead, HabitUpdate
from app.shared.auth import get_current_user
from app.shared.crud import create_owned, delete_owned, get_owned, list_owned, update_owned

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=list[HabitRead])
def list_habits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list_owned(db, Habit, user)


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(data: HabitCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return create_owned(db, Habit, data, user)


@router.get("/{record_id}", response_model=HabitRead)
def get_habit(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, Habit, record_id, user)


@router.patch("/{record_id}", response_model=HabitRead)
def update_habit(record_id: UUID, data: HabitUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    habit = get_owned(db, Habit, record_id, user)
    changes = data.model_dump(exclude_unset=True)
    days = changes.get("days_of_week", habit.days_of_week)
    start_time = changes.get("preferred_start_time", habit.preferred_start_time)
    end_time = changes.get("preferred_end_time", habit.preferred_end_time)
    if days is None or not days or any(day not in range(7) for day in days):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="days_of_week values must be from 0 through 6")
    if (start_time is None) != (end_time is None):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Both preferred times must be supplied together")
    if start_time is not None and end_time <= start_time:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="preferred_end_time must be later than preferred_start_time")
    return update_owned(db, habit, data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, Habit, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
