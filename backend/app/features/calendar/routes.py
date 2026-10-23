from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.calendar.models import CalendarEvent
from app.features.calendar.schemas import CalendarEventCreate, CalendarEventRead, CalendarEventUpdate
from app.shared.auth import get_current_user
from app.shared.crud import create_owned, delete_owned, get_owned, list_owned, update_owned

router = APIRouter(prefix="/calendar/events", tags=["calendar"])


@router.get("", response_model=list[CalendarEventRead])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list_owned(db, CalendarEvent, user)


@router.post("", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
def create_event(data: CalendarEventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return create_owned(db, CalendarEvent, data, user)


@router.get("/{record_id}", response_model=CalendarEventRead)
def get_event(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, CalendarEvent, record_id, user)


@router.patch("/{record_id}", response_model=CalendarEventRead)
def update_event(record_id: UUID, data: CalendarEventUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = get_owned(db, CalendarEvent, record_id, user)
    changes = data.model_dump(exclude_unset=True)
    starts_at = changes.get("starts_at", event.starts_at)
    ends_at = changes.get("ends_at", event.ends_at)
    if starts_at is None or ends_at is None or starts_at.tzinfo is None or ends_at.tzinfo is None or ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Event timestamps must include a timezone and end after they start")
    return update_owned(db, event, data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, CalendarEvent, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
