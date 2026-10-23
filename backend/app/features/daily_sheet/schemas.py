from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DailySheetCreate(BaseModel):
    sheet_date: date
    tasks: list[dict[str, Any]] | None = None
    highlights: list[str] | None = None
    notes: str | None = None


class DailySheetUpdate(BaseModel):
    tasks: list[dict[str, Any]] | None = None
    highlights: list[str] | None = None
    notes: str | None = None


class DailySheetRead(BaseModel):
    id: UUID
    sheet_date: date
    tasks: list[dict[str, Any]] | None
    highlights: list[str] | None
    notes: str | None
    is_edited_later: bool = Field(description="True when this past sheet was modified after its date.")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
