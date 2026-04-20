# Study Environment Monitoring

A full-stack application that monitors physical study conditions in real time — temperature, humidity, light, noise, and air quality — and computes a **study-suitability index** by integrating IoT sensor data with third-party weather and air-quality APIs.

---

## Overview

| Layer | Technology |
|---|---|
| Backend | Node.js · Express 5 |
| Database | MySQL |
| Frontend | Next.js 16 · React 19 · TypeScript |
| Styling | Tailwind CSS 4 |
| Charts | Chart.js · react-chartjs-2 |
| API Spec | OpenAPI 3.0 (Swagger UI at `/api-docs`) |
| Package manager | pnpm workspaces |

---

## Project Structure

```
Study-Environment-Monitoring/
├── backend/
│   ├── config/
│   │   ├── db.js               # MySQL connection pool
│   │   ├── appWeights.js       # Weight load / save / normalize
│   │   └── weights.json        # Persisted scoring weights (runtime, gitignored)
│   ├── controllers/            # Route handler logic
│   ├── models/                 # SQL query functions
│   ├── routes/                 # Express routers
│   ├── services/               # Scoring logic + external API integrations
│   ├── openapi.yaml            # OpenAPI 3.0 specification
│   ├── app.js                  # Express app + Swagger UI mount
│   └── server.js               # Entry point
├── frontend/
│   ├── app/
│   │   ├── dashboard/          # Live overview with score ring
│   │   ├── sensors/            # Raw sensor readings
│   │   ├── air/                # Air quality (IQAir / OpenAQ)
│   │   ├── history/            # Historical charts and data table
│   │   ├── insights/           # Rule-based recommendations
│   │   └── settings/           # Scoring weight configuration
│   ├── components/             # Shared UI components
│   ├── context/                # React context (settings state)
│   ├── lib/                    # Scoring helpers and type definitions
│   └── services/api.ts         # Fetch helpers for all backend endpoints
├── pnpm-workspace.yaml
└── README.md
```

---

## Data Sources

### Primary — IoT Sensors
Physical sensors connected to a microcontroller (Arduino / ESP) post readings to `POST /api/sensors`:

| Sensor | Measures |
|---|---|
| DHT11/22 | Temperature (°C), Humidity (%RH) |
| KY-018 photoresistor | Light level (ADC 0–1023; lower = brighter) |
| Sound sensor | Noise level (ADC 0–1023) |
| PIR | Motion detection |

### Secondary — Web APIs
Polled externally and stored in the database:

| Source | Data |
|---|---|
| [IQAir](https://www.iqair.com/air-quality-api) | US AQI, main pollutant |
| [OpenAQ](https://openaq.org) | PM2.5, PM10 (µg/m³) |
| [OpenWeatherMap](https://openweathermap.org/api) | Outdoor temperature, humidity, weather description |

---

## Study-Suitability Index

Every time a sensor reading arrives, the backend computes a **study index** entry by combining all available data into five sub-scores, then applying a weighted average:

| Sub-score | Ideal range | Scoring method |
|---|---|---|
| Light | 300–500 lux | Linear ramp below 300; gentle penalty above 500 |
| Noise | ADC ≤ 620 (quiet) | Linear 100→0 between ADC 620–800 |
| Temperature | 23–26 °C | Symmetric decay from midpoint (−5 pts/°C outside band) |
| Humidity | 40–60 %RH | Symmetric decay from midpoint (−5 pts/%RH outside band) |
| AQI | ≤ 50 | US EPA piecewise: 100→75→50→25→0 across breakpoints 50/100/150/200/300 |

The **total score** (0–100) is a weighted average of the five sub-scores:

```
total = (light × w_light + noise × w_noise + temp × w_temp
         + humidity × w_humidity + aqi × w_air) / sum(weights)
```

Weights are configurable from the Settings page and persisted on the backend via `PUT /api/settings/weights`.

| Status | Score range |
|---|---|
| Good | ≥ 80 |
| Moderate | 50–79 |
| Poor | < 50 |

---

## API Endpoints

All endpoints are prefixed with `/api`. Full interactive documentation is available at **`/api-docs`** (Swagger UI) once the backend is running.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/sensors` | All sensor readings |
| `POST` | `/api/sensors` | Submit a new sensor reading (triggers scoring) |
| `GET` | `/api/sensors/latest` | Latest sensor reading |
| `GET` | `/api/sensors/range?start=&end=` | Readings within an ISO datetime range |
| `GET` | `/api/iq-air/latest` | Latest IQAir reading |
| `GET` | `/api/openaq/latest` | Latest OpenAQ measurement |
| `GET` | `/api/openweather/latest` | Latest OpenWeatherMap data |
| `GET` | `/api/study-index/latest` | Latest computed study index entry |
| `GET` | `/api/study-index/daily-scores` | Daily average total scores |
| `GET` | `/api/study-index/hourly-averages` | Average score by hour-of-day (0–23) |
| `GET` | `/api/reports/daily?limit=90` | Aggregated daily report (sensor + index) |
| `GET` | `/api/settings/weights` | Current scoring weights |
| `PUT` | `/api/settings/weights` | Update scoring weights |

---

## Setup

### Prerequisites
- Node.js ≥ 18
- pnpm — `npm install -g pnpm`
- MySQL database

### 1. Install dependencies

```bash
# From repo root — installs both backend and frontend
pnpm install
```

### 2. Configure environment variables

**Backend** — `backend/.env`:

```env
PORT=8000

DB_HOST=your-mysql-host
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

> The remote MySQL server enforces `max_user_connections = 5`. The pool's `connectionLimit` is set to `3` in `config/db.js` — do not raise it above `4`.

**Frontend** — `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend
node server.js
# → Server running on port 8000
# → DB connected

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

**API documentation**: http://localhost:8000/api-docs

---

## Common Issues

### `Can't add new command when connection is in closed state`
The MySQL connection timed out. Resolved — the backend uses a connection pool (`mysql.createPool`) which acquires fresh connections automatically.

### `ER_USER_LIMIT_REACHED`
`connectionLimit` in `config/db.js` is too high. Keep it at `3` or lower.

---

## License

ISC
