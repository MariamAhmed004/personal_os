from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChatMessageRead(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
