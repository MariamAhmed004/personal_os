from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BacklogItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


class BacklogItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    is_completed: bool | None = None


class BacklogItemRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    is_completed: bool

    model_config = ConfigDict(from_attributes=True)
