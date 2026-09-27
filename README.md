# CUTFLOW

Standalone autonomous AI video post-production studio. Upload footage + music, choose a theme, optionally describe the edit, and CUTFLOW builds and renders a real MP4 using FFmpeg and a server-side Gemini editorial layer.

## Flat GitHub package
Every project file is at the repository root. There are **no project subfolders** to upload. Extract the ZIP and upload all files together to the root of a GitHub repository.

Do not upload `.env` or any real API key.

## Input limit
CUTFLOW accepts source video up to **4 minutes / 240 seconds** and source audio up to **4 minutes / 240 seconds**. The generated timeline is capped at 240 seconds.

## Local setup
Requirements: Node.js 22+ and FFmpeg/FFprobe on PATH.

```bash
npm install
cp .env.example .env
# Put your Gemini API key in .env
npm run build
npm start
```

Open `http://localhost:10000`.

## Production

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

The server uses `PORT` when provided and binds to `0.0.0.0`.

## Render

Create a **Web Service** connected to the GitHub repository and choose Docker. The included `Dockerfile` installs FFmpeg and runs the production build. The included `render.yaml` defines the service and `/health` check.

If configuring manually:

- Runtime: Docker
- Dockerfile: `./Dockerfile`
- Docker context: repository root
- Health check: `/health`
- Environment variable: `GEMINI_API_KEY` (required for Gemini editorial intelligence)
- Optional: `MAX_UPLOAD_MB` (default 500)
- Optional: `RETENTION_MINUTES` (default 180)

Do not hard-code `PORT`; Render supplies it.

## Commands

- `POST /api/projects` creates a project.
- `PUT /api/projects/:id/source-video` uploads video.
- `PUT /api/projects/:id/source-audio` uploads music/audio.
- `POST /api/projects/:id/create` starts the real editing job.
- `GET /api/projects/:id/events` streams progress with SSE.
- `POST /api/projects/:id/commands` applies a natural-language timeline modification and creates a new version.
- `GET /api/projects/:id/output` downloads the rendered MP4.
- `GET /health` reports service health.

## AI architecture
Gemini is used only as an editorial decision layer. It returns bounded structured plans/operations. It does not receive arbitrary filesystem access and does not render media. FFmpeg executes the validated timeline deterministically.

If `GEMINI_API_KEY` is absent, CUTFLOW reports Gemini as unavailable instead of pretending AI was used; the deterministic editorial fallback can still build a timeline.

## Storage
Temporary project media is stored under `CUTFLOW_STORAGE_DIR` (default `./tmp`). The storage module is intentionally isolated so object storage can be added later.
