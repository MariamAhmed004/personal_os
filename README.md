# Personal OS

A personal planning and life-management application centered on the Daily Sheet. This repository starts with a manual-first, feature-based foundation; AI integrations are intentionally placeholders.

## Quick start

1. Copy `.env.example` to `.env` and change `SECRET_KEY`.
2. Run `docker compose up --build`.
3. Open the frontend at <http://localhost:5173> and the API docs at <http://localhost:8000/docs>.

Compose starts PostgreSQL, the FastAPI API, and the Vite development server. The API creates its tables on startup for this initial scaffold. Use Alembic migrations before treating the database as production-ready.

## Local development

- Backend: create a virtual environment in `backend`, install `requirements.txt`, set `DATABASE_URL`, then run `uvicorn app.main:app --reload` from `backend`.
- Frontend: run `npm install` and `npm run dev` from `frontend`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_GUIDE.txt](./PROJECT_GUIDE.txt) for structure and design decisions.
