# Personal OS

A personal planning and life-management application centered on the Daily Sheet, with a local Ollama assistant available from Home.

## Quick start

1. Copy `.env.example` to `.env` and change `SECRET_KEY`.
2. Run `docker compose up --build`.
3. Open the frontend at <http://localhost:5173> and the API docs at <http://localhost:8000/docs>.

Compose starts PostgreSQL, Ollama, the FastAPI API, and the Vite development server. Frontend dependencies are synchronized into the persistent `node_modules` volume at startup, so newly added packages are available even when that volume already exists. File watching uses polling so Vite detects changes through Docker bind mounts on Windows and reloads the page. The API creates its tables on startup for this initial scaffold. Use Alembic migrations before treating the database as production-ready.

For local debugging, Docker Compose enables `AI_DEBUG_RESPONSES` by default. When an assistant reply fails validation, the raw Ollama response is appended to the chat error shown in the Home assistant. The setting defaults to `false` outside Compose; keep it disabled in shared or production environments because model replies may contain personal data.

## Local AI assistant

The Compose setup runs Ollama in its own container and points the API at `http://ollama:11434`. Download the configured Qwen3 14B model once after starting Compose:

```powershell
docker compose up --build -d
docker compose exec ollama ollama pull qwen3:14b
```

The download is about 9.3 GB and may take several minutes to over an hour depending on your internet speed (roughly 13 minutes at 100 Mbps or 50 minutes at 25 Mbps, before overhead). The `ollama_data` Docker volume persists downloaded model files across container restarts and rebuilds, so this is normally a one-time download. Removing that volume will remove the model cache.

Qwen3 14B is a large model: allow at least 10 GB of free disk space for the model and preferably 16 GB or more of system memory. A GPU with around 12 GB or more of VRAM is recommended for responsive generation; CPU-only systems can run it but responses may be slow. Actual memory use depends on quantization, context length, and other running applications.

For a demo, register or sign in at <http://localhost:5173>, then open the Home assistant. Chat history and approval decisions are saved per user in the existing `chat_messages` table; proposed actions change personal data only after explicit approval. If you override `OLLAMA_URL` in `.env` while using Compose, set it to `http://ollama:11434` so the API container can reach the Ollama service. For local (non-Docker) backend development, run Ollama on the host and use `OLLAMA_URL=http://localhost:11434`.

The chat endpoints `GET /api/v1/ai/chat/history`, `POST /api/v1/ai/chat`, and `POST /api/v1/ai/chat/{message_id}/decision` require the existing bearer token. The assistant receives the user's habits, upcoming events, open backlog items, display name, and current appearance/time-zone preferences as context.

## GitHub Pages demo

The public demo is a separate Vite build configuration of the same frontend. It uses typed sample fixtures and an in-memory API adapter, so edits work during navigation but reset on refresh. It does not use authentication, send requests to the backend, or persist demo content. The AI assistant is intentionally unavailable in this build. Docker Compose does not set `VITE_DEMO_MODE`, so it continues to use the real API, authentication, and AI integration.

To run the demo locally from PowerShell:

```powershell
cd frontend
$env:VITE_DEMO_MODE = 'true'
$env:VITE_PAGES_BASE = '/'
npm run dev
```

For a demo production build, use the same environment variables and run `npm run build`; the output is `frontend/dist`. Remove the variables or open a new PowerShell session to return to the normal build configuration.

The `.github/workflows/deploy-pages.yml` workflow builds the demo on pushes to `main` and on manual runs, using a base path derived from the repository name, and deploys only `frontend/dist` to GitHub Pages. Enable GitHub Pages in the repository settings with **GitHub Actions** as the build and deployment source. The expected project-site URL is `https://MariamAhmed004.github.io/personal_os/`; GitHub displays the final published URL after a successful workflow run. The build itself does not publish the site until the workflow runs on GitHub.

## Local development

- Backend: create a virtual environment in `backend`, install `requirements.txt`, set `DATABASE_URL`, then run `uvicorn app.main:app --reload` from `backend`.
- Frontend: run `npm install` and `npm run dev` from `frontend`.

## Demo data and walkthrough

The walkthrough starts after a user creates an account through the frontend and signs in for the first time. Use **Help** in the top bar to launch it again. Its started and finished state is stored in this browser, scoped to the signed-in user; it does not sync to another browser or device. Accounts created outside the frontend registration flow can start it with **Help**.

Demo data is created only by an explicit command. Start the local Compose services, choose a local-only password for the dedicated demo account, then run:

```powershell
$env:KANLI_DEMO_SEED_ALLOWED = '1'
$env:KANLI_DEMO_PASSWORD = Read-Host 'Choose a password for the local demo account'
docker compose exec -e KANLI_DEMO_SEED_ALLOWED -e KANLI_DEMO_PASSWORD api python -m app.seed_demo
Remove-Item Env:\KANLI_DEMO_PASSWORD
Remove-Item Env:\KANLI_DEMO_SEED_ALLOWED
```

The seed command requires the explicit `KANLI_DEMO_SEED_ALLOWED=1` confirmation, `APP_ENV=development`, and the local `personal_os` database/account. It creates `demo@kanli.local` with the password supplied in `KANLI_DEMO_PASSWORD`; it never changes the password or existing records when rerun. Sign in with that account and navigate the calendar to **October 25–31, 2026** to see the fixed sample week, including a day without scheduled events or habits. The sample includes recurring habits, events, Daily Sheets and tasks, wins, highlights, morning/evening moods, unscheduled items, and a weekly reflection.

To remove only the dedicated demo account and its user-owned data, then optionally reseed it, run:

```powershell
$env:KANLI_DEMO_SEED_ALLOWED = '1'
docker compose exec -e KANLI_DEMO_SEED_ALLOWED api python -m app.seed_demo --reset
Remove-Item Env:\KANLI_DEMO_SEED_ALLOWED
```

Use this only for the local demo account: resetting removes all data owned by `demo@kanli.local`, including anything you added while signed in as that account. It does not remove other users' data or reset the database volume. The seed command is never run automatically on application startup.

Habit and event occurrence completion is stored alongside ordinary tasks in the existing date- and user-scoped Daily Sheet JSON field; no database migration or API route change is required. The model currently has no separate "skipped" state, so an unchecked occurrence remains incomplete rather than being recorded as skipped.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_GUIDE.txt](./PROJECT_GUIDE.txt) for structure and design decisions.
