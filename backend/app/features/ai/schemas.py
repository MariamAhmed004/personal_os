from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    timezone: str = Field(default="UTC", min_length=1, max_length=100)
    theme: Literal["dark", "light"] = "dark"

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("timezone must be a valid IANA timezone") from None
        return value


class CreateEventProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["create_event"]
    title: str = Field(min_length=1, max_length=200)
    event_type: Literal["interview", "workshop", "appointment", "graduation", "custom"] = "custom"
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    location: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def validate_range(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Proposal event times must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


class CreateBacklogProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["create_backlog_item"]
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ScheduleBacklogProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["schedule_backlog_item"]
    backlog_item_id: UUID
    title: str = Field(min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime

    @model_validator(mode="after")
    def validate_range(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Proposal event times must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


ActionProposal = Annotated[
    CreateEventProposal | CreateBacklogProposal | ScheduleBacklogProposal,
    Field(discriminator="action"),
]


class ChatCompletion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    response: str = Field(min_length=1, max_length=4000)
    proposal: ActionProposal | None


class ChatMessageRead(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    proposal: ActionProposal | None = None
    decision: Literal["pending", "approved", "denied"] | None = None
    result: dict[str, object] | None = None


class ChatResponse(BaseModel):
    user_message: ChatMessageRead
    assistant_message: ChatMessageRead


class ProposalDecisionRequest(BaseModel):
    decision: Literal["approved", "denied"]


class ProposalDecisionResponse(BaseModel):
    message: ChatMessageRead
