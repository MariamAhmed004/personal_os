import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Time, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    days_of_week: Mapped[list[int]] = mapped_column(ARRAY(Integer))
    preferred_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    preferred_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    starts_on: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
