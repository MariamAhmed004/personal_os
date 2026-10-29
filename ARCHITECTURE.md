# Architecture

## Product center

The Daily Sheet is the user's day-level workspace and the primary planning surface. Habits, calendar events, backlog items, mood entries, and reflections are structured inputs that can be presented in a Daily Sheet. The local AI chat can propose actions, but personal data is changed only after the user explicitly approves a proposal.

## System context

```text
React + TypeScript (Vite)
        │ HTTP / JSON, JWT bearer token
        ▼
FastAPI feature routers ── shared authentication and database session
        │ SQLAlchemy
        ▼
PostgreSQL

FastAPI AI chat service → Ollama (Qwen3 14B, optional local model provider)
```

## Backend organization

Features own their API concerns: routes, schemas, models and (as behavior grows) services/repositories. `core` owns cross-cutting configuration and security; `database` owns engine/session setup; `shared` holds reusable primitives. Features must not depend on frontend presentation details. Keep cross-feature orchestration in an application-level service rather than coupling route modules.

The `features/ai` package provides the chat routes and calls the configured Ollama model. Chat messages and approval decisions use the existing chat persistence; approved proposals are applied through existing feature models and do not change the database schema.

## Data and safety principles

- PostgreSQL stores typed, structured values. Weekdays use integers (`0` Monday through `6` Sunday); times use `time`; event timestamps are timezone-aware.
- Every personal record belongs to a user. API queries scope records to the authenticated user.
- Suggestions, when implemented, must be pending until the user explicitly approves them. Approval is the only point at which a proposed change may be applied.
- The app is usable without AI. Model providers are optional adapters, not dependencies of core planning.
- Passwords are hashed; API authentication uses expiring JWT access tokens. This starter does not include refresh tokens or email verification.

## Initial API

All routes are under `/api/v1`.

| Feature | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` |
| Users | `GET /users/me` |
| Habits | `GET/POST /habits`, `GET/PATCH/DELETE /habits/{id}` |
| Calendar | `GET/POST /calendar/events`, `GET/PATCH/DELETE /calendar/events/{id}` |
| Backlog | `GET/POST /backlog/items`, `GET/PATCH/DELETE /backlog/items/{id}` |
| Daily Sheet | `GET/POST /daily-sheets`, `GET/PATCH/DELETE /daily-sheets/{id}` |
| Mood | `GET/POST /moods`, `GET/PATCH/DELETE /moods/{id}` |
| Reflections | `GET/POST /reflections`, `GET/PATCH/DELETE /reflections/{id}` |
| Suggestions | Reserved; future approval workflow |
| Chat | `GET /ai/chat/history`, `POST /ai/chat`, `POST /ai/chat/{message_id}/decision` |

The implementation includes CRUD routes for habits, calendar events, backlog items, daily sheets, moods, and reflections, plus local-model chat with an explicit proposal approval flow. Auth is intentionally a small first implementation. Suggestions remain reserved for future work.

## Frontend organization

Pages live under `features/`, with feature-specific API clients and components kept close to their use. Shared layout, route protection, API transport and theme live in `app/` and `shared/`. The Home assistant uses the local model when Ollama and Qwen3 14B are available.

## Next architectural steps

1. Add Alembic migrations and migration-based startup.
2. Add automated backend/frontend tests and CI.
3. Add durable refresh-token and account lifecycle decisions.
4. Define suggestion provenance, approval, denial and application semantics.
5. Keep AI model use optional so core planning remains available without Ollama.
