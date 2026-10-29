# Personal OS

Personal OS is a planning and reflection app centered on a Daily Sheet. It includes habits, a calendar, a backlog, mood check-ins, a journal, and an optional AI assistant.

There are two ways to run the frontend:

| Mode | What it uses | Data and login |
| --- | --- | --- |
| Full application | React frontend, FastAPI API, PostgreSQL, optional Ollama | Sign in or register; data is stored in PostgreSQL for that account |
| GitHub Pages demo | Same React frontend, demo fixtures and an in-memory adapter | No account or backend; edits are temporary and reset on refresh |

## Contents

- [Requirements](#requirements)
- [Run the full application with Docker Compose](#run-the-full-application-with-docker-compose)
- [Use the local AI assistant](#use-the-local-ai-assistant)
- [Use the GitHub Pages demo](#use-the-github-pages-demo)
- [Run the backend and frontend separately](#run-the-backend-and-frontend-separately)
- [Demo account and database seed data](#demo-account-and-database-seed-data)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

## Requirements

### Docker Compose (recommended for the full application)

- Windows, macOS, or Linux
- Docker Desktop or Docker Engine with the Docker Compose plugin
- An internet connection for the first image builds and, if you want AI, the model download
- Enough disk space and memory for the PostgreSQL and Ollama containers. Qwen3 14B is a large model; see [Use the local AI assistant](#use-the-local-ai-assistant).

### GitHub Pages demo or frontend-only development

- Node.js 22 (the Pages workflow uses Node.js 22)
- npm, included with Node.js

The GitHub Pages demo runs without FastAPI, PostgreSQL, Ollama, Docker, credentials, or API keys.

## Run the full application with Docker Compose

These steps run the authenticated application with PostgreSQL and the API. The AI assistant becomes available after Ollama has the configured model.

1. Clone the repository and enter its folder:

   ```powershell
   git clone https://github.com/MariamAhmed004/personal_os.git
   Set-Location personal_os
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env` and replace `SECRET_KEY` with a private random value of at least 32 characters. Keep `.env` on your machine; never commit it or put its values in a frontend build. The other example values are suitable for local development.

4. Build and start the services:

   ```powershell
   docker compose up --build -d
   ```

5. Open:

   - Web app: <http://localhost:5173>
   - API documentation: <http://localhost:8000/docs>
   - API health check: <http://localhost:8000/health>

6. Select **Create an account** in the web app, register, and sign in. The application creates its initial database tables at API startup. For first-time local development, this project does not currently require a separate migration command.

The Compose stack contains `web`, `api`, `db` (PostgreSQL), and `ollama`. PostgreSQL data, frontend `node_modules`, and downloaded Ollama model files are held in Docker volumes. The frontend container runs Vite in development mode and uses `http://localhost:8000/api/v1` to reach the API from your browser. The Compose configuration does not enable the frontend demo mode.

### Stop and restart

Stop the containers but keep database data and downloaded models:

```powershell
docker compose down
```

Start them again:

```powershell
docker compose up -d
```

To follow service logs:

```powershell
docker compose logs -f web api db ollama
```

`docker compose down -v` also deletes the named volumes, including PostgreSQL data and the Ollama model cache. Use it only when you intentionally want to remove those local files.

## Use the local AI assistant

The API sends chat requests to the Ollama service configured by `OLLAMA_URL`. In Docker Compose, that address is `http://ollama:11434`. Download the configured model once:

```powershell
docker compose exec ollama ollama pull qwen3:14b
```

The model download is approximately 9.3 GB and may take a while. Keep at least 10 GB of free disk space for the model; 16 GB or more of system memory is preferable. A GPU with around 12 GB or more of VRAM is recommended for responsive generation. CPU-only generation may be slow. Actual memory use depends on quantization, context length, and other running applications.

After the download completes, open **Home** and use the assistant. Chat history is associated with the signed-in user. The assistant can propose a supported calendar or backlog action, but it does not change application data until you explicitly approve the proposal.

If Ollama is unavailable or the model is missing:

```powershell
docker compose ps
docker compose logs ollama api
docker compose exec ollama ollama pull qwen3:14b
```

Wait for the pull to finish, then try the assistant again. The assistant is optional: the rest of the full application can be used without a downloaded model.

For local backend development outside Docker, run Ollama on the host and configure `OLLAMA_URL=http://localhost:11434` for the backend process. Inside the API container, use the Compose service address (`http://ollama:11434`), not `localhost`.

> **Local debugging note:** Compose enables `AI_DEBUG_RESPONSES` by default so invalid model responses can be inspected during development. Do not enable raw model-response debugging in a shared or production environment; responses may contain personal data.

## Use the GitHub Pages demo

The Pages build reuses the actual frontend components and routes, but explicitly enables `VITE_DEMO_MODE=true`. It provides sample content for the dashboard, calendar, habits, backlog, Daily Sheets, moods, and journal. Existing controls make temporary changes in memory while you navigate; refreshing resets them.

The demo:

- Opens without account creation, sign-in, a real user, or an access token. A direct visit to `/login` offers an **Explore demo without signing in** button.
- Uses the same frontend API call sites through a local in-memory adapter. Demo create, edit, delete, completion, and Daily Sheet changes do not call the backend.
- Does not store demo records in local storage, session storage, cookies, or a remote service. The theme preference alone uses session storage.
- Shows a banner with an information dialog and the repository link.
- Marks the AI assistant unavailable. Demo chat messages are not sent to Ollama or saved.
- Uses hash-based URLs such as `/#/calendar` so direct navigation and browser refresh work on GitHub Pages.

### Try the demo locally

From the repository folder in PowerShell:

```powershell
Set-Location frontend
$env:VITE_DEMO_MODE = 'true'
$env:VITE_PAGES_BASE = '/'
npm ci
npm run dev
```

Open <http://localhost:5173>. Visit <http://localhost:5173/#/login> to see the demo’s sign-in bypass page. Press `Ctrl+C` to stop Vite.

For a local production build and preview:

```powershell
$env:VITE_DEMO_MODE = 'true'
$env:VITE_PAGES_BASE = '/'
npm run build
npm run preview
```

The build output is `frontend/dist`. To build for the repository’s GitHub Pages project URL, set the Pages subpath instead:

```powershell
$env:VITE_DEMO_MODE = 'true'
$env:VITE_PAGES_BASE = '/personal_os/'
npm run build
```

The deployment workflow sets the base path from the repository name automatically. Open a new PowerShell session, or remove the variables, before building the full application:

```powershell
Remove-Item Env:\VITE_DEMO_MODE -ErrorAction SilentlyContinue
Remove-Item Env:\VITE_PAGES_BASE -ErrorAction SilentlyContinue
```

### Publish the demo with GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml`:

1. Runs on pushes to `main` and on manual workflow dispatch.
2. Sets up Node.js 22 and installs the frontend from `frontend/package-lock.json` with `npm ci`.
3. Builds the frontend with demo mode explicitly enabled and the repository-specific Pages base path.
4. Uploads only `frontend/dist` as the Pages artifact and deploys it to the `github-pages` environment.

To enable deployment:

1. Push or merge the workflow to the `main` branch.
2. In the GitHub repository, open **Settings → Pages** and set the source/build-and-deployment method to **GitHub Actions**.
3. Open the **Actions** tab, select **Deploy GitHub Pages**, and check the run. You can also start it with **Run workflow**.
4. Once a run succeeds, find the live URL in the workflow deployment summary or **Settings → Pages**.

The expected project-site URL is <https://mariamahmed004.github.io/personal_os/>. This repository’s Pages URL has not been verified by a successful GitHub deployment yet. No backend, database, Docker configuration, secrets, or private tokens are included in the Pages artifact. Vite variables are public build-time configuration; never put secrets in `VITE_*` variables.

## Run the backend and frontend separately

This option is for development when you want to run the API and frontend outside the Compose stack. You still need a reachable PostgreSQL database and, if testing AI, an Ollama service.

### Backend

1. Start or provide PostgreSQL. One option is to run only the database service from the repository root:

   ```powershell
   docker compose up -d db
   ```

2. In a separate PowerShell terminal, configure and install the backend:

   ```powershell
   Set-Location backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item ..\.env.example .env
   ```

3. Update `backend/.env` for your local setup. Set `DATABASE_URL` to a PostgreSQL URL reachable from Windows (for the Compose database, use `localhost` as the host and the configured local port). Set a private `SECRET_KEY`, and set `OLLAMA_URL=http://localhost:11434` if using host-installed Ollama.

4. Run the API from the `backend` directory:

   ```powershell
   uvicorn app.main:app --reload
   ```

   The API should be available at <http://localhost:8000>; docs at <http://localhost:8000/docs>.

If PowerShell prevents virtual-environment activation, use `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload` instead.

### Frontend connected to the API

In another terminal:

```powershell
Set-Location frontend
npm ci
$env:VITE_API_URL = 'http://localhost:8000/api/v1'
npm run dev
```

Open <http://localhost:5173>. Do not set `VITE_DEMO_MODE` for this full-app frontend; without the exact value `true`, it uses the real API and authentication flow.

## Demo account and database seed data

There are two different kinds of demo data:

1. **GitHub Pages/local frontend demo:** sample records are bundled in the frontend and live only in browser memory. No account or database seeding is needed.
2. **Optional Compose demo account:** a dedicated account with records stored in the local PostgreSQL database, useful for trying the full authenticated application. This is separate from the Pages demo.

To create the optional local demo account, start the Compose stack, then run from the repository root in PowerShell:

```powershell
$env:KANLI_DEMO_SEED_ALLOWED = '1'
$env:KANLI_DEMO_PASSWORD = Read-Host 'Choose a local demo account password (8+ characters)'
docker compose exec -e KANLI_DEMO_SEED_ALLOWED -e KANLI_DEMO_PASSWORD api python -m app.seed_demo
Remove-Item Env:\KANLI_DEMO_PASSWORD
Remove-Item Env:\KANLI_DEMO_SEED_ALLOWED
```

Sign in at <http://localhost:5173> with email `demo@kanli.local` and the password you entered. The seeded sample week is October 25–31, 2026; visit that week in the calendar to see the sample records.

The seed command is explicit and guarded: it requires `APP_ENV=development`, `KANLI_DEMO_SEED_ALLOWED=1`, and the local `personal_os` database/account. It does not run at startup. Rerunning it adds only missing records and does not change existing records or the existing demo password.

To delete only this dedicated demo account and its user-owned records:

```powershell
$env:KANLI_DEMO_SEED_ALLOWED = '1'
docker compose exec -e KANLI_DEMO_SEED_ALLOWED api python -m app.seed_demo --reset
Remove-Item Env:\KANLI_DEMO_SEED_ALLOWED
```

Resetting permanently removes all data owned by `demo@kanli.local`, including anything added while signed in as that account. It does not remove other users' data or reset the database volume.

## Common tasks

Run frontend checks/build:

```powershell
Set-Location frontend
npm ci
npm run build
```

Check or rebuild Docker services:

```powershell
docker compose ps
docker compose up --build -d
docker compose logs -f api
```

Explore the HTTP API at <http://localhost:8000/docs>. Protected API routes require a bearer token from the normal login flow.

## Troubleshooting

### `The Ollama model is unavailable`

Pull the model into the Compose Ollama service:

```powershell
docker compose exec ollama ollama pull qwen3:14b
```

Then confirm Ollama and the API are running with `docker compose ps` and retry. The download can take a while.

### The browser says the API is unavailable

- Confirm `api` and `db` are running: `docker compose ps`.
- Check logs: `docker compose logs api db`.
- Confirm the frontend uses `VITE_API_URL=http://localhost:8000/api/v1` when connecting from the browser. Do not use the Docker-only hostname `api` in the browser URL.
- For a separately run backend, check its `.env`, database URL, and terminal output.

### Login fails or shows an expired-token alert

The full app requires an account and a running API. Register or sign in again at <http://localhost:5173>. If the token is expired, signing out and signing in again requests a fresh token.

### The frontend looks like the login page instead of the demo

The public demo flag is a **build-time** setting. Stop Vite, set `VITE_DEMO_MODE=true`, and start/build again from the `frontend` directory. The regular Compose frontend intentionally does not enable demo mode.

### GitHub Pages displays a 404 or missing assets

- Confirm the Pages source is **GitHub Actions**.
- Check that the **Deploy GitHub Pages** workflow succeeded on `main`.
- Confirm the repository is using the expected project URL and the workflow’s base path is `/<repository-name>/`.
- Use the `/#/page` hash route for direct navigation and refresh.

## Project structure

```text
backend/                 FastAPI app, auth, feature routes, database access
frontend/src/app/        Layout, routing, authentication guard, theme, walkthrough
frontend/src/features/   Dashboard, Daily Sheet, calendar, habits, backlog, journal, settings
frontend/src/shared/     API client, shared types, icons
frontend/src/demo/       Explicit demo-mode flag, typed fixtures, in-memory API adapter
.github/workflows/       GitHub Pages deployment workflow
docker-compose.yml       Local full-application services
```

For design notes and current architectural decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_GUIDE.txt](./PROJECT_GUIDE.txt).

## Known limitations

- GitHub Pages hosts only the frontend demo; it does not provide FastAPI, PostgreSQL, account registration, persistent storage, or AI. Demo changes reset on refresh.
- The AI assistant requires a running Ollama service and the configured model in the full application.
- The API currently creates tables during startup. The project is an initial scaffold and should use Alembic migrations and production hardening before production deployment.
- GitHub Pages publication must be enabled in repository settings, and the workflow must complete successfully before the public demo is available.
