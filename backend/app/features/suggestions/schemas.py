from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SuggestionRead(BaseModel):
    id: UUID
    title: str
    rationale: str | None
    proposed_change: dict[str, Any]
    status: Literal["pending", "approved", "denied"]
    created_at: datetime
    decided_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
