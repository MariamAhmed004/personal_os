from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ReflectionPeriod = Literal["weekly", "monthly"]


class ReflectionCreate(BaseModel):
    period_type: ReflectionPeriod
    period_start: date
    content: str = Field(min_length=1, max_length=10000)


class ReflectionUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class ReflectionRead(ReflectionCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
