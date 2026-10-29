import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.features.ai.schemas import (
    ActionProposal,
    ChatCompletion,
    ChatMessageRead,
    ChatRequest,
    ChatResponse,
    CreateBacklogProposal,
    CreateEventProposal,
    ProposalDecisionRequest,
    ProposalDecisionResponse,
    ScheduleBacklogProposal,
)
from app.features.ai.services import AIService, AIServiceError
from app.features.auth.models import User
from app.features.backlog.models import BacklogItem
from app.features.backlog.schemas import BacklogItemRead
from app.features.calendar.models import CalendarEvent
from app.features.calendar.schemas import CalendarEventRead
from app.features.chat.models import ChatMessage
from app.features.habits.models import Habit
from app.shared.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])
ai_service = AIService(settings.ollama_url)
proposal_adapter = TypeAdapter(ActionProposal)
MESSAGE_FORMAT = "personal_os_chat_v1"
MODEL_CONTEXT_LIMIT = 30
SUPPORTED_ACTIONS = {
    "create_event",
    "create_backlog_item",
    "schedule_backlog_item",
}


class InvalidScheduleProposalError(Exception):
    pass


def _assistant_envelope(content: str) -> dict[str, Any] | None:
    try:
        envelope = json.loads(content)
    except (TypeError, ValueError):
        return None
    if isinstance(envelope, dict) and envelope.get("format") == MESSAGE_FORMAT:
        return envelope
    return None


def _normalize_completion_json(content: str) -> str:
    try:
        completion = json.loads(content)
    except (TypeError, ValueError):
        return content
    if not isinstance(completion, dict):
        return content

    proposal = completion.get("proposal")
    if not isinstance(proposal, dict) or "action" in proposal or len(proposal) != 1:
        return content

    action, details = next(iter(proposal.items()))
    if action not in SUPPORTED_ACTIONS or not isinstance(details, dict):
        return content

    completion["proposal"] = {"action": action, **details}
    return json.dumps(completion, ensure_ascii=False)


def _completion_validation_detail(error: ValidationError) -> str:
    errors = error.errors(include_input=False)
    if any(item["type"] == "json_invalid" for item in errors):
        return "The AI reply was not valid JSON. Please try again."

    if any(item["loc"] and item["loc"][0] == "response" for item in errors):
        return "The AI reply is missing a valid text response. Please try again."

    if any(item["type"] in {"union_tag_invalid", "union_tag_not_found"} for item in errors):
        return (
            "The AI suggested an unsupported action. It can create a calendar event, add an item to For Later, "
            "or schedule an existing item from For Later."
        )

    validation_messages = {
        str(item.get("ctx", {}).get("error", ""))
        for item in errors
        if item["type"] == "value_error" and item.get("ctx")
    }
    if "Proposal event times must include a timezone" in validation_messages:
        return "The proposed event time is missing a timezone. Please include the local date and time."
    if "ends_at must be later than starts_at" in validation_messages:
        return "The proposed end time must be later than its start time. Please try again with a valid time range."

    field_labels = {
        "backlog_item_id": "For Later item",
        "description": "description",
        "ends_at": "end time",
        "event_type": "event type",
        "location": "location",
        "starts_at": "start time",
        "title": "title",
    }
    fields = sorted({
        field_labels.get(item["loc"][-1], item["loc"][-1])
        for item in errors
        if item["loc"]
        and item["loc"][0] == "proposal"
        and isinstance(item["loc"][-1], str)
        and item["loc"][-1] not in {"create_event", "create_backlog_item", "schedule_backlog_item"}
    })
    if fields:
        return f"The action proposal has missing or invalid information for: {', '.join(fields)}. Please try again."

    return "The AI reply did not match the expected chat format. Please try again."


def _include_debug_response(detail: str, generated: str) -> str:
    if not settings.ai_debug_responses:
        return detail
    return f"{detail}\n\nOllama response:\n{generated}"


def _read_message(message: ChatMessage) -> ChatMessageRead:
    envelope = _assistant_envelope(message.content) if message.role == "assistant" else None
    if envelope is None:
        return ChatMessageRead(
            id=message.id,
            role=message.role,
            content=message.content,
            created_at=message.created_at,
        )
    proposal = envelope.get("proposal")
    return ChatMessageRead(
        id=message.id,
        role="assistant",
        content=envelope.get("content", "I couldn't prepare that response."),
        created_at=message.created_at,
        proposal=proposal_adapter.validate_python(proposal) if proposal else None,
        decision=envelope.get("decision"),
        result=envelope.get("result"),
    )


def _store_assistant_message(
    db: Session,
    user_id: UUID,
    content: str,
    proposal: ActionProposal | None,
) -> ChatMessage:
    envelope = {
        "format": MESSAGE_FORMAT,
        "content": content,
        "proposal": proposal_adapter.dump_python(proposal, mode="json") if proposal else None,
        "decision": "pending" if proposal else None,
        "result": None,
    }
    message = ChatMessage(
        user_id=user_id,
        role="assistant",
        content=json.dumps(envelope, ensure_ascii=False),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def _model_history(db: Session, user_id: UUID) -> list[dict[str, str]]:
    messages = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(20)
        )
    )
    history: list[dict[str, str]] = []
    for message in reversed(messages):
        if message.role == "assistant":
            envelope = _assistant_envelope(message.content)
            content = envelope.get("content", "") if envelope else message.content
        else:
            content = message.content
        history.append({"role": message.role, "content": content})
    return history


def _build_context(db: Session, user: User, timezone_name: str, theme: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    local_today = now.astimezone(ZoneInfo(timezone_name)).date()
    habits = list(
        db.scalars(
            select(Habit)
            .where(Habit.user_id == user.id, Habit.is_active.is_(True), Habit.starts_on <= local_today)
            .order_by(Habit.title)
            .limit(MODEL_CONTEXT_LIMIT)
        )
    )
    events = list(
        db.scalars(
            select(CalendarEvent)
            .where(CalendarEvent.user_id == user.id, CalendarEvent.starts_at >= now)
            .order_by(CalendarEvent.starts_at)
            .limit(MODEL_CONTEXT_LIMIT)
        )
    )
    backlog = list(
        db.scalars(
            select(BacklogItem)
            .where(BacklogItem.user_id == user.id, BacklogItem.is_completed.is_(False))
            .order_by(BacklogItem.created_at.desc())
            .limit(MODEL_CONTEXT_LIMIT)
        )
    )
    return {
        "user_settings": {
            "display_name": user.display_name,
            "appearance_theme": theme,
            "timezone": timezone_name,
        },
        "habit_weekday_numbering": "Monday is 0 and Sunday is 6",
        "habits": [
            {
                "id": str(habit.id),
                "title": habit.title,
                "days_of_week": habit.days_of_week,
                "preferred_start_time": habit.preferred_start_time.isoformat() if habit.preferred_start_time else None,
                "preferred_end_time": habit.preferred_end_time.isoformat() if habit.preferred_end_time else None,
            }
            for habit in habits
        ],
        "upcoming_events": [
            {
                "id": str(event.id),
                "title": event.title,
                "starts_at": event.starts_at.isoformat(),
                "ends_at": event.ends_at.isoformat(),
                "event_type": event.event_type,
            }
            for event in events
        ],
        "backlog_items": [
            {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
            }
            for item in backlog
        ],
    }


def _validate_schedule_proposal(db: Session, user: User, proposal: ActionProposal, timezone_name: str) -> ActionProposal:
    if not isinstance(proposal, ScheduleBacklogProposal):
        return proposal
    item = db.scalar(
        select(BacklogItem).where(
            BacklogItem.id == proposal.backlog_item_id,
            BacklogItem.user_id == user.id,
            BacklogItem.is_completed.is_(False),
        )
    )
    if item is None:
        raise InvalidScheduleProposalError(
            "That item is no longer available. Ask me to schedule an item from For Later."
        )
    proposal.title = item.title
    local_zone = ZoneInfo(timezone_name)
    proposal.starts_at = proposal.starts_at.astimezone(local_zone)
    proposal.ends_at = proposal.ends_at.astimezone(local_zone)
    return proposal


@router.get("/chat/history", response_model=list[ChatMessageRead])
def get_chat_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ChatMessageRead]:
    messages = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at, ChatMessage.id)
        )
    )
    return [_read_message(message) for message in messages]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatResponse:
    user_message = ChatMessage(user_id=user.id, role="user", content=data.message)
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    try:
        generated = await ai_service.generate_chat_response(
            history=_model_history(db, user.id),
            context=_build_context(db, user, data.timezone, data.theme),
            timezone=data.timezone,
        )
    except AIServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error

    try:
        completion = ChatCompletion.model_validate_json(_normalize_completion_json(generated))
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_include_debug_response(_completion_validation_detail(error), generated),
        ) from None

    if completion.proposal is not None:
        try:
            completion.proposal = _validate_schedule_proposal(db, user, completion.proposal, data.timezone)
        except InvalidScheduleProposalError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_include_debug_response(str(error), generated),
            ) from None

    response_text = (
        "I’ve prepared this for your review. Please approve the proposal below if it looks right."
        if completion.proposal is not None
        else completion.response
    )
    assistant_message = _store_assistant_message(
        db,
        user.id,
        response_text,
        completion.proposal,
    )
    return ChatResponse(
        user_message=_read_message(user_message),
        assistant_message=_read_message(assistant_message),
    )


@router.post("/chat/{message_id}/decision", response_model=ProposalDecisionResponse)
def decide_proposal(
    message_id: UUID,
    data: ProposalDecisionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalDecisionResponse:
    message = db.scalar(
        select(ChatMessage)
        .where(ChatMessage.id == message_id, ChatMessage.user_id == user.id, ChatMessage.role == "assistant")
        .with_for_update()
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")

    envelope = _assistant_envelope(message.content)
    if envelope is None or not envelope.get("proposal"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This message has no pending proposal")
    if envelope.get("decision") != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This proposal has already been decided")

    proposal = proposal_adapter.validate_python(envelope["proposal"])
    result: dict[str, object] | None = None
    if data.decision == "approved":
        if isinstance(proposal, CreateEventProposal):
            record = CalendarEvent(
                user_id=user.id,
                title=proposal.title,
                event_type=proposal.event_type,
                description=proposal.description,
                starts_at=proposal.starts_at,
                ends_at=proposal.ends_at,
                location=proposal.location,
            )
            db.add(record)
            db.flush()
            result = {
                "kind": "calendar_event",
                "record": CalendarEventRead.model_validate(record).model_dump(mode="json"),
            }
        elif isinstance(proposal, CreateBacklogProposal):
            record = BacklogItem(
                user_id=user.id,
                title=proposal.title,
                description=proposal.description,
                is_completed=False,
            )
            db.add(record)
            db.flush()
            result = {
                "kind": "backlog_item",
                "record": BacklogItemRead.model_validate(record).model_dump(mode="json"),
            }
        elif isinstance(proposal, ScheduleBacklogProposal):
            item = db.scalar(
                select(BacklogItem)
                .where(
                    BacklogItem.id == proposal.backlog_item_id,
                    BacklogItem.user_id == user.id,
                    BacklogItem.is_completed.is_(False),
                )
                .with_for_update()
            )
            if item is None:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The item is no longer available")
            record = CalendarEvent(
                user_id=user.id,
                title=item.title,
                event_type="custom",
                description=item.description,
                starts_at=proposal.starts_at,
                ends_at=proposal.ends_at,
            )
            db.add(record)
            db.flush()
            result = {
                "kind": "calendar_event",
                "record": CalendarEventRead.model_validate(record).model_dump(mode="json"),
                "backlog_item_id": str(item.id),
            }

    envelope["decision"] = data.decision
    envelope["result"] = result
    message.content = json.dumps(envelope, ensure_ascii=False)
    db.add(message)
    db.commit()
    db.refresh(message)
    return ProposalDecisionResponse(message=_read_message(message))
