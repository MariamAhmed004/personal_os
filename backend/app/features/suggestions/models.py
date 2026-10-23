import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Suggestion(Base):
    __tablename__ = "suggestions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_change: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(Enum("pending", "approved", "denied", name="suggestion_status"), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
