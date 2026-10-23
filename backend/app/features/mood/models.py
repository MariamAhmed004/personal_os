import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class MoodEntry(Base):
    __tablename__ = "mood_entries"
    __table_args__ = (UniqueConstraint("user_id", "entry_date", "period", name="uq_mood_user_date_period"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    period: Mapped[str] = mapped_column(Enum("morning", "evening", name="mood_period"))
    mood: Mapped[str] = mapped_column(String(40))
    note: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
