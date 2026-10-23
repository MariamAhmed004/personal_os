from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

EventType = Literal["interview", "workshop", "appointment", "graduation", "custom"]


class CalendarEventFields(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    event_type: EventType = "custom"
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    location: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def validate_range(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Event timestamps must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


class CalendarEventCreate(CalendarEventFields):
    pass


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    event_type: EventType | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=300)


class CalendarEventRead(CalendarEventFields):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
