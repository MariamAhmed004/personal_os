import argparse
import os
from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import SessionLocal
from app.features.auth.models import User
from app.features.backlog.models import BacklogItem
from app.features.calendar.models import CalendarEvent
from app.features.daily_sheet.models import DailySheet
from app.features.habits.models import Habit
from app.features.mood.models import MoodEntry
from app.features.reflections.models import Reflection


DEMO_EMAIL = "demo@kanli.local"
DEMO_NAME = "Personal OS Demo"
DEMO_ZONE = ZoneInfo("America/New_York")
DEMO_WEEK_START = date(2026, 10, 25)


def demo_id(user_id: UUID, key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"kanli-demo:{user_id}:{key}")


def require_development_database() -> None:
    if os.environ.get("APP_ENV", "").lower() != "development":
        raise SystemExit("Demo seeding is allowed only when APP_ENV=development.")
    if os.environ.get("KANLI_DEMO_SEED_ALLOWED") != "1":
        raise SystemExit("Set KANLI_DEMO_SEED_ALLOWED=1 to confirm this explicit demo-data operation.")

    url = make_url(settings.database_url)
    if (
        url.host not in {"db", "localhost", "127.0.0.1"}
        or url.database != "personal_os"
        or url.username != "personal_os"
    ):
        raise SystemExit(
            "Demo seeding requires the local personal_os database using the personal_os account."
        )


def require_demo_password() -> str:
    password = os.environ.get("KANLI_DEMO_PASSWORD", "")
    if len(password) < 8:
        raise SystemExit("Set KANLI_DEMO_PASSWORD to a password of at least 8 characters.")
    return password


def get_or_create_demo_user(db: Session, password: str) -> User:
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user:
        if user.display_name != DEMO_NAME:
            raise SystemExit(
                f"{DEMO_EMAIL} exists but is not the expected demo account; no data was changed."
            )
        return user

    user = User(
        id=uuid5(NAMESPACE_URL, "kanli-demo-user"),
        email=DEMO_EMAIL,
        display_name=DEMO_NAME,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.flush()
    return user


def add_if_missing(
    db: Session,
    user_id: UUID,
    model: type[Base],
    key: str,
    **fields: Any,
) -> bool:
    record_id = demo_id(user_id, key)
    if db.get(model, record_id) is not None:
        return False
    db.add(model(id=record_id, user_id=user_id, **fields))
    return True


def at(day_offset: int, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(
        DEMO_WEEK_START + timedelta(days=day_offset),
        time(hour, minute),
        tzinfo=DEMO_ZONE,
    )


def seed_demo_data(db: Session, password: str) -> int:
    inserted = 0
    user = get_or_create_demo_user(db, password)

    habits = {
        "morning-walk": {
            "title": "Morning walk",
            "description": "A little fresh air before the day begins.",
            "days_of_week": [0, 4],
            "preferred_start_time": time(7, 30),
            "preferred_end_time": time(8),
            "starts_on": DEMO_WEEK_START,
            "is_active": True,
        },
        "weekly-reset": {
            "title": "Weekly reset",
            "description": "Make a little room for the week ahead.",
            "days_of_week": [6],
            "preferred_start_time": time(16),
            "preferred_end_time": time(16, 45),
            "starts_on": DEMO_WEEK_START,
            "is_active": True,
        },
        "evening-reading": {
            "title": "Evening reading",
            "description": "A few quiet pages to end the day.",
            "days_of_week": [1, 3],
            "preferred_start_time": time(20),
            "preferred_end_time": time(20, 30),
            "starts_on": DEMO_WEEK_START,
            "is_active": True,
        },
    }
    for key, fields in habits.items():
        inserted += add_if_missing(db, user.id, Habit, f"habit:{key}", **fields)
    db.flush()

    morning_walk = db.get(Habit, demo_id(user.id, "habit:morning-walk"))
    if morning_walk is None:
        raise RuntimeError("Could not retrieve the seeded morning-walk habit.")
    events = {
        "planning-session": {
            "title": "Planning session",
            "event_type": "workshop",
            "description": "Choose a few priorities for the week.",
            "starts_at": at(1, 10),
            "ends_at": at(1, 11),
            "location": "Home",
        },
        "dentist": {
            "title": "Dentist appointment",
            "event_type": "appointment",
            "description": None,
            "starts_at": at(4, 14),
            "ends_at": at(4, 15),
            "location": "Oak Street",
        },
        "family-celebration": {
            "title": "Family celebration",
            "event_type": "graduation",
            "description": "An afternoon with family.",
            "starts_at": at(6, 13),
            "ends_at": at(6, 16),
            "location": None,
        },
    }
    for key, fields in events.items():
        inserted += add_if_missing(db, user.id, CalendarEvent, f"event:{key}", **fields)
    db.flush()

    backlog = {
        "update-portfolio": {
            "title": "Refresh my portfolio",
            "description": "Gather a few recent projects first.",
            "is_completed": False,
        },
        "call-friend": {
            "title": "Call an old friend",
            "description": None,
            "is_completed": False,
        },
        "sort-photos": {
            "title": "Sort last month’s photos",
            "description": None,
            "is_completed": True,
        },
    }
    for key, fields in backlog.items():
        inserted += add_if_missing(db, user.id, BacklogItem, f"backlog:{key}", **fields)

    planning_session_id = demo_id(user.id, "event:planning-session")
    dental_appointment_id = demo_id(user.id, "event:dentist")
    sheets = {
        1: {
            "tasks": [
                {"title": "Prepare breakfast", "completed": True},
                {"title": "Send the project notes", "completed": False},
                {
                    "type": "schedule_completion",
                    "item_type": "habit",
                    "item_id": str(morning_walk.id),
                    "completed": True,
                },
                {
                    "type": "schedule_completion",
                    "item_type": "event",
                    "item_id": str(planning_session_id),
                    "completed": True,
                },
            ],
            "highlights": ["Finished a walk before work", "Had a clear planning conversation"],
            "notes": "Keep tomorrow’s first task small.",
        },
        2: {
            "tasks": [
                {"title": "Pick up a library book", "completed": False},
                {"title": "Water the plants", "completed": True},
            ],
            "highlights": ["Made time for a slower lunch"],
            "notes": None,
        },
        3: {
            "tasks": [],
            "highlights": [],
            "notes": None,
        },
        4: {
            "tasks": [
                {"title": "Bring insurance card", "completed": True},
                {
                    "type": "schedule_completion",
                    "item_type": "event",
                    "item_id": str(dental_appointment_id),
                    "completed": True,
                },
            ],
            "highlights": ["Took care of an appointment I had been putting off"],
            "notes": "The day felt lighter after finishing it.",
        },
    }
    for offset, fields in sheets.items():
        sheet_date = DEMO_WEEK_START + timedelta(days=offset)
        existing_sheet = db.scalar(
            select(DailySheet.id).where(
                DailySheet.user_id == user.id,
                DailySheet.sheet_date == sheet_date,
            )
        )
        if existing_sheet is None:
            inserted += add_if_missing(
                db,
                user.id,
                DailySheet,
                f"sheet:{sheet_date}",
                sheet_date=sheet_date,
                **fields,
            )

    moods = [
        (1, "morning", "good", "Feeling ready to start gently."),
        (1, "evening", "great", "Proud of the walk and the planning session."),
        (2, "morning", "okay", None),
        (4, "evening", "low", "A full day; taking it easy tonight."),
    ]
    for offset, period, mood, note in moods:
        entry_date = DEMO_WEEK_START + timedelta(days=offset)
        existing = db.scalar(
            select(MoodEntry.id).where(
                MoodEntry.user_id == user.id,
                MoodEntry.entry_date == entry_date,
                MoodEntry.period == period,
            )
        )
        if existing is None:
            db.add(MoodEntry(
                id=demo_id(user.id, f"mood:{entry_date}:{period}"),
                user_id=user.id,
                entry_date=entry_date,
                period=period,
                mood=mood,
                note=note,
            ))
            inserted += 1

    reflection = db.scalar(
        select(Reflection.id).where(
            Reflection.user_id == user.id,
            Reflection.period_type == "weekly",
            Reflection.period_start == DEMO_WEEK_START,
        )
    )
    if reflection is None:
        db.add(Reflection(
            id=demo_id(user.id, "weekly-reflection"),
            user_id=user.id,
            period_type="weekly",
            period_start=DEMO_WEEK_START,
            content="The week had a few steady moments. Getting outside and sharing plans helped me feel more grounded.",
        ))
        inserted += 1

    db.commit()
    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed or reset the Personal OS development demo account.")
    parser.add_argument("--reset", action="store_true", help="remove only the dedicated demo account and its records")
    args = parser.parse_args()

    require_development_database()
    with SessionLocal() as db:
        if args.reset:
            user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
            if user is None:
                print("The dedicated demo account does not exist; nothing was removed.")
                return
            if user.display_name != DEMO_NAME:
                raise SystemExit(
                    f"{DEMO_EMAIL} exists but is not the expected demo account; no data was changed."
                )
            db.delete(user)
            db.commit()
            print("Removed only the dedicated demo account and its user-owned records.")
            return

        inserted = seed_demo_data(db, require_demo_password())
    print(f"Demo account: {DEMO_EMAIL}")
    print(f"Inserted {inserted} missing demo records; existing records were left unchanged.")
    print(f"Sample dates: {DEMO_WEEK_START.isoformat()} through 2026-10-31.")


if __name__ == "__main__":
    main()
