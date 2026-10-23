import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Reflection(Base):
    __tablename__ = "reflections"
    __table_args__ = (UniqueConstraint("user_id", "period_type", "period_start", name="uq_reflection_user_period"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    period_type: Mapped[str] = mapped_column(Enum("weekly", "monthly", name="reflection_period"))
    period_start: Mapped[date] = mapped_column(Date)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
