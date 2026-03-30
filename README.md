# Study Environment Monitoring

A real-time dashboard for monitoring study environment conditions — temperature, humidity, light, noise, air quality, and a computed study-suitability index — built as a **pnpm monorepo** with a Node.js/Express backend and a Next.js frontend.

---

## Project Structure

```
Study-Environment-Monitoring/
├── backend/               # Express API server
│   ├── config/db.js       # MySQL connection pool
│   ├── controllers/       # Route handler logic
│   ├── models/            # SQL query functions
│   ├── routes/            # Express routers
│   ├── services/          # External API integrations
│   ├── app.js             # Express app setup
│   ├── server.js          # Entry point
│   └── .env               # Backend environment variables
├── frontend/              # Next.js dashboard
│   ├── app/               # App Router pages
│   │   ├── dashboard/     # Main overview page
│   │   ├── sensors/       # Live sensor readings
│   │   ├── air/           # Air quality (IQAir / OpenAQ)
│   │   ├── history/       # Historical data & charts
│   │   ├── insights/      # Study index analytics
│   │   └── settings/      # App settings
│   ├── components/        # Shared UI components
│   ├── services/          # API fetch helpers
│   └── .env               # Frontend environment variables
├── pnpm-workspace.yaml    # pnpm monorepo config
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend framework | Express 5 |
| Database | MySQL (via `mysql2` connection pool) |
| Frontend framework | Next.js 16 (App Router) |
| UI language | TypeScript + React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Chart.js + react-chartjs-2 |
| Package manager | pnpm (workspaces) |

---

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** — install with `npm install -g pnpm`
- Access to the MySQL database server

---

## Setup

### 1. Install dependencies

```bash
# From the repo root — installs both backend and frontend
pnpm install
```

### 2. Configure environment variables

**Backend** — copy and fill in `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

```env
PORT=8000

DB_HOST=your-mysql-host
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

> **Note:** The remote MySQL server enforces `max_user_connections = 5`.
> The pool's `connectionLimit` is set to `3` in `config/db.js` to stay within this limit.
> Do **not** raise it above `4` or you will hit `ER_USER_LIMIT_REACHED`.

**Frontend** — copy and fill in `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Running the Project

Open two terminals:

**Terminal 1 — Backend:**

```bash
cd backend
node server.js
```

Expected output:
```
Server running on port 8000
DB connected
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Route | Description |
|---|---|
| `GET /api/sensors` | All sensor data |
| `GET /api/sensors/latest` | Latest sensor reading |
| `GET /api/sensors/range` | Sensor data for a time range |
| `GET /api/sensors/daily-averages` | Daily sensor averages |
| `GET /api/iq-air/latest` | Latest IQAir air quality reading |
| `GET /api/openaq/latest` | Latest OpenAQ measurement |
| `GET /api/openweather/latest` | Latest OpenWeatherMap data |
| `GET /api/study-index/latest` | Latest study suitability index |
| `GET /api/study-index/daily-scores` | Daily average study scores |
| `GET /api/study-index/hourly-averages` | Hourly average study scores |
| `GET /api/reports` | Generated reports |

---

## Common Issues

### `Can't add new command when connection is in closed state`
The single MySQL connection timed out. This is resolved — the backend now uses a **connection pool** (`mysql.createPool`), which automatically acquires fresh connections.

### `ER_USER_LIMIT_REACHED` — max_user_connections exceeded
The `connectionLimit` in `backend/config/db.js` is too high for the server's per-user connection cap. Keep it at `3` or lower.

---

## License

ISC