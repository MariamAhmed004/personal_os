import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class DailySheet(Base):
    __tablename__ = "daily_sheets"
    __table_args__ = (UniqueConstraint("user_id", "sheet_date", name="uq_daily_sheet_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    sheet_date: Mapped[date] = mapped_column(Date, index=True)
    tasks: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    highlights: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_edited_later: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
