# Raqetzone

Monorepo containing the Raqetzone AI web app:

- `ui/`: React + Vite frontend
- `server/`: Node.js (Express) backend API + background jobs/workers
- `gateway/`: SEP payment gateway service (Express)

## Prerequisites

- Node.js 18+
- npm (or Bun)
- Postgres (for `server/`)
- Redis (used by `server/` for queues/background processing)

## Repository Structure

- `ui/`
  - Frontend app (Vite + React)
  - Uses environment variables prefixed with `VITE_`
- `server/`
  - Main API server (Express)
  - Database access via Drizzle + Postgres
  - Background worker(s) for video generation
- `gateway/`
  - Payment gateway integration service

## Quick Start (Local Development)

### 1) Backend (`server/`)

Create a `.env` file inside `server/` (or export env vars in your shell).

Install dependencies:

```bash
npm install
```

Run the API server:

```bash
npm run dev
```

The server exposes:

- `GET /health`
- API routes under `/api/*`

### 2) Frontend (`ui/`)

Create `ui/.env` based on `ui/.env.example`.

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

### 3) Payment Gateway (`gateway/`) (Optional)

Install dependencies:

```bash
npm install
```

Start the gateway:

```bash
node server.js
```

## Environment Variables

### Frontend (`ui/.env`)

See `ui/.env.example`:

- `VITE_WEBSITE_URL` (backend base URL)
- `VITE_GOOGLE_CLIENT_ID`

### Backend (`server/.env`)

The backend reads environment variables from `server/src/config/env.js`.

Core:

- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `PAYMENT_GATEWAY_URL`

AI Providers (set what you use):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`
- `XAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `OPEN_ROUTER_API_KEY`
- `FAL_KEY`

Redis:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`

S3 (uploads/media):

- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

SMS.ir:

- `SMSIR_API_KEY`
- `SMSIR_LINE_NUMBER`
- `SMSIR_TEMPLATE_ID`

Google OAuth (backend-side):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Database (Drizzle)

From `server/`:

- Generate migrations:

```bash
npm run db:gen
```

- Push schema to Postgres:

```bash
npm run db:push
```

- Open Drizzle Studio:

```bash
npm run db:studio
```

## Scripts

### `server/`

- `npm run dev`: run API server in watch mode
- `npm start`: run API server
- `npm run worker`: run video worker (if you want it separate)

### `ui/`

- `npm run dev`: Vite dev server
- `npm run build`: production build
- `npm run preview`: preview production build

## Notes

- The backend serves uploaded files under `/uploads` from `server/public/uploads`.
