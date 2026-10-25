# Personal OS

A personal planning and life-management application centered on the Daily Sheet, with a local Ollama assistant available from Home.

## Quick start

1. Copy `.env.example` to `.env` and change `SECRET_KEY`.
2. Run `docker compose up --build`.
3. Open the frontend at <http://localhost:5173> and the API docs at <http://localhost:8000/docs>.

Compose starts PostgreSQL, the FastAPI API, and the Vite development server. Frontend dependencies are synchronized into the persistent `node_modules` volume at startup, so newly added packages are available even when that volume already exists. File watching uses polling so Vite detects changes through Docker bind mounts on Windows and reloads the page. The API creates its tables on startup for this initial scaffold. Use Alembic migrations before treating the database as production-ready.

## Local AI assistant

Install and start Ollama on the host machine, then download the configured model with `ollama pull llama3.2:latest`. Compose points the API at `http://host.docker.internal:11434` by default. Set `OLLAMA_URL` in `.env` if Ollama is available at a different address. Chat history and approval decisions are saved per user in the existing `chat_messages` table; proposed actions change personal data only after explicit approval.

The chat endpoints `GET /api/v1/ai/chat/history`, `POST /api/v1/ai/chat`, and `POST /api/v1/ai/chat/{message_id}/decision` require the existing bearer token. The assistant receives the user's habits, upcoming events, open backlog items, display name, and current appearance/time-zone preferences as context.

## Local development

- Backend: create a virtual environment in `backend`, install `requirements.txt`, set `DATABASE_URL`, then run `uvicorn app.main:app --reload` from `backend`.
- Frontend: run `npm install` and `npm run dev` from `frontend`.
- For local (non-Docker) backend development, set `OLLAMA_URL=http://localhost:11434` if Ollama is running on the same machine.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_GUIDE.txt](./PROJECT_GUIDE.txt) for structure and design decisions.
