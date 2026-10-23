from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.features.auth.models import User
from app.features.daily_sheet.models import DailySheet
from app.features.daily_sheet.schemas import DailySheetCreate, DailySheetRead, DailySheetUpdate
from app.shared.auth import get_current_user
from app.shared.crud import delete_owned, get_owned, update_owned

router = APIRouter(prefix="/daily-sheets", tags=["daily-sheets"])


@router.get("", response_model=list[DailySheetRead])
def list_sheets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(select(DailySheet).where(DailySheet.user_id == user.id).order_by(DailySheet.sheet_date.desc())))


@router.get("/by-date/{sheet_date}", response_model=DailySheetRead)
def get_sheet_by_date(sheet_date: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sheet = db.scalar(select(DailySheet).where(DailySheet.user_id == user.id, DailySheet.sheet_date == sheet_date))
    if sheet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily Sheet not found")
    return sheet


@router.post("", response_model=DailySheetRead, status_code=status.HTTP_201_CREATED)
def create_sheet(data: DailySheetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.scalar(select(DailySheet.id).where(DailySheet.user_id == user.id, DailySheet.sheet_date == data.sheet_date))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A Daily Sheet already exists for this date")
    sheet = DailySheet(user_id=user.id, **data.model_dump())
    db.add(sheet)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A Daily Sheet already exists for this date") from None
    db.refresh(sheet)
    return sheet


@router.get("/{record_id}", response_model=DailySheetRead)
def get_sheet(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, DailySheet, record_id, user)


@router.patch("/{record_id}", response_model=DailySheetRead)
def update_sheet(record_id: UUID, data: DailySheetUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sheet = get_owned(db, DailySheet, record_id, user)
    updated = update_owned(db, sheet, data)
    if updated.sheet_date < date.today() and not updated.is_edited_later:
        updated.is_edited_later = True
        db.commit()
        db.refresh(updated)
    return updated


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sheet(record_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    delete_owned(db, get_owned(db, DailySheet, record_id, user))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
