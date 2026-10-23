from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

MoodPeriod = Literal["morning", "evening"]


class MoodEntryCreate(BaseModel):
    entry_date: date
    period: MoodPeriod
    mood: str = Field(min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=2000)


class MoodEntryUpdate(BaseModel):
    mood: str | None = Field(default=None, min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=2000)


class MoodEntryRead(MoodEntryCreate):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
