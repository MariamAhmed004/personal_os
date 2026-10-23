from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class HabitFields(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    days_of_week: list[int] = Field(min_length=1, max_length=7)
    preferred_start_time: time | None = None
    preferred_end_time: time | None = None
    starts_on: date
    is_active: bool = True

    @model_validator(mode="after")
    def validate_schedule(self):
        if any(day not in range(7) for day in self.days_of_week):
            raise ValueError("days_of_week values must be from 0 (Monday) through 6 (Sunday)")
        if (self.preferred_start_time is None) != (self.preferred_end_time is None):
            raise ValueError("Both preferred times must be supplied together")
        if self.preferred_start_time and self.preferred_end_time <= self.preferred_start_time:
            raise ValueError("preferred_end_time must be later than preferred_start_time")
        return self


class HabitCreate(HabitFields):
    pass


class HabitUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    days_of_week: list[int] | None = Field(default=None, min_length=1, max_length=7)
    preferred_start_time: time | None = None
    preferred_end_time: time | None = None
    starts_on: date | None = None
    is_active: bool | None = None


class HabitRead(HabitFields):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
