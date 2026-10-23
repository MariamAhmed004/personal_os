from typing import Protocol


class AIService(Protocol):
    async def generate_text(self, prompt: str) -> str: ...


class PromptBuilder(Protocol):
    def build(self, instruction: str, context: dict[str, object]) -> str: ...


class PlanningService(Protocol):
    async def propose_plan(self, request: str) -> dict[str, object]: ...


class ChatService(Protocol):
    async def reply(self, message: str, context: dict[str, object]) -> str: ...


class SuggestionService(Protocol):
    async def create_pending_suggestion(self, user_id: str, proposal: dict[str, object]) -> str: ...
