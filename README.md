# cocoon

cocoon is a private journaling application with a react frontend and a fastapi backend. this repository is prepared for public source control and keeps local user data, credentials, and private backend code out of git.

## overview

- frontend built with react, react router, vite, typescript, and tailwind css
- backend built with fastapi and sqlite
- google oauth handled by the python backend
- progressive web app support for notifications and reminders
- public-safe backend entrypoint that can fall back to a local private implementation

## repository modes

the tracked backend entrypoint is `backend/main.py`.

- if `backend/main_private.py` exists locally, `backend/main.py` loads it automatically
- if `backend/main_private.py` is missing, `backend/main.py` serves the redacted public backend from `backend/public_app.py`

this lets the public repository stay open-source-friendly while keeping private routes and local application details outside version control.

## local development

1. install dependencies:

```bash
npm install
```

2. create your local environment file from the example:

```bash
cp .env.example .env.local
```

3. fill in the required oauth and application values in your local env file

4. if you need the full private backend locally, place it at `backend/main_private.py`

5. start the frontend:

```bash
npm run dev
```

6. start the backend in a second terminal:

```bash
python backend/main.py
```

the default frontend dev server runs on `http://localhost:5173`. the backend runs on `http://localhost:8000`.

## environment

the repository ships with `.env.example` for local setup. the main values are:

- `VITE_API_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `FRONTEND_URLS`
- `COOKIE_SECURE`
- `SECRET_KEY`
- `DATABASE_PATH`

local env files are ignored by git. only `.env.example` is tracked.

## scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
python backend/main.py
```

## open-source safety

the following local-only files are intentionally ignored:

- env files other than `.env.example`
- `backend/main_private.py`
- sqlite database files and related local artifacts
- python cache files
- local backup exports such as `*-backup.json` and `*-encrypted-backup.json`

if you plan to publish your fork, keep your database, local exports, and private backend implementation untracked.

## production notes

- build the frontend with `npm run build`
- the generated frontend is served from `dist/` when present
- set `COOKIE_SECURE=true` when deploying behind https
- update `GOOGLE_REDIRECT_URI` and `FRONTEND_URLS` for your deployed domain
- point `DATABASE_PATH` at durable storage if you are not using the default local sqlite file

## verification

before pushing changes, the main checks are:

```bash
npm run typecheck
npm run lint
npm run build
python -m py_compile backend/main.py
```
