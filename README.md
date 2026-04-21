# Study Environment Monitoring

A full-stack application that monitors physical study conditions in real time — temperature, humidity, light, noise, and air quality — and computes a **study-suitability index** by integrating IoT sensor data with third-party weather and air-quality APIs.

---

## Team Members

| Name | Department / Faculty / University |
|---|---|
| Pakorn Fudulyawajananont | 6710545806 |
| Pattadon Udompaipuek | 6710545750 |

---

## Project Overview

This system continuously collects environmental data from physical IoT sensors installed in a study room (temperature, humidity, light, noise) and enriches it with outdoor air-quality readings from public APIs (IQAir, OpenAQ, OpenWeatherMap). A scoring algorithm converts raw sensor values into a **study-suitability index** (0–100) that tells you at a glance how conducive your current environment is for focused study.

### Features

- **Live dashboard** — real-time study index ring with per-metric sub-scores
- **Air quality page** — current US AQI, PM2.5, outdoor temperature/humidity with time-series charts
- **History page** — interactive historical charts and raw data table with configurable date range
- **Forecast page** — ML-based predictions of the study index and PM2.5 for the next N hours, with four swappable models (MLP, Linear Regression, Decision Tree, Random Forest)
- **Insights page** — rule-based recommendations based on current readings
- **Settings page** — configurable scoring weights persisted on the backend
- **Swagger UI** — interactive API documentation at `/api-docs`

---

## Required Libraries and Tools

### Runtime requirements

| Tool | Required version |
|---|---|
| Node.js | ≥ 18 (tested on v25.9) |
| pnpm | ≥ 9 (tested on 10.33) |
| MySQL | ≥ 8.0 |

### Backend dependencies

| Package | Version |
|---|---|
| express | ^5.2.1 |
| mysql2 | ^3.20.0 |
| @tensorflow/tfjs | ^4.22.0 |
| swagger-ui-express | ^5.0.1 |
| js-yaml | ^4.1.1 |
| cors | ^2.8.6 |
| dotenv | ^17.3.1 |

### Frontend dependencies

| Package | Version |
|---|---|
| next | 16.2.1 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| chart.js | ^4.5.1 |
| react-chartjs-2 | ^5.3.1 |
| tailwindcss | ^4 |
| typescript | ^5 |

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
│   │   └── models/             # Forecast model implementations (MLP, Linear, DT, RF)
│   ├── openapi.yaml            # OpenAPI 3.0 specification
│   ├── app.js                  # Express app + Swagger UI mount
│   └── server.js               # Entry point
├── frontend/
│   ├── app/
│   │   ├── dashboard/          # Live overview with score ring
│   │   ├── sensors/            # Raw sensor readings
│   │   ├── air/                # Air quality (IQAir / OpenAQ / OpenWeatherMap)
│   │   ├── forecast/           # ML-based forecast with model selector
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
| DHT11 | Temperature (°C), Humidity (%RH) |
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
| `GET` | `/api/iq-air/history?days=7` | IQAir history |
| `GET` | `/api/openaq/latest` | Latest OpenAQ measurement |
| `GET` | `/api/openaq/history?days=7` | OpenAQ history |
| `GET` | `/api/openweather/latest` | Latest OpenWeatherMap data |
| `GET` | `/api/openweather/history?days=7` | OpenWeatherMap history |
| `GET` | `/api/study-index/latest` | Latest computed study index entry |
| `GET` | `/api/study-index/history?days=7` | Study index history |
| `GET` | `/api/study-index/daily-scores` | Daily average total scores |
| `GET` | `/api/study-index/hourly-averages` | Average score by hour-of-day (0–23) |
| `GET` | `/api/reports/daily?limit=90` | Aggregated daily report (sensor + index) |
| `GET` | `/api/forecast?hours=24&model=mlp` | ML forecast (`mlp` / `linear` / `decision_tree` / `random_forest`) |
| `GET` | `/api/forecast/models` | Available forecast model list |
| `GET` | `/api/settings/weights` | Current scoring weights |
| `PUT` | `/api/settings/weights` | Update scoring weights |

---

## GitHub Repository

**[https://github.com/BossPattadon/Study-Environment-Monitoring](https://github.com/BossPattadon/Study-Environment-Monitoring)**

### Building and Running

#### 1. Clone the repository

```bash
git clone https://github.com/BossPattadon/Study-Environment-Monitoring.git
cd Study-Environment-Monitoring
```

#### 2. Install dependencies

```bash
# Installs both backend and frontend from the repo root
npm install -g pnpm
pnpm install
```

#### 3. Configure environment variables

**Backend** — create `backend/.env`:

```env
PORT=8000

DB_HOST=your-mysql-host
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

> The remote MySQL server enforces `max_user_connections = 5`. The pool's `connectionLimit` is set to `3` in `config/db.js` — do not raise it above `4`.

**Frontend** — create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 4. Run the application

Open two terminals:

```bash
# Terminal 1 — Backend (port 8000)
cd backend
node server.js

# Terminal 2 — Frontend (port 3000)
cd frontend
pnpm dev
```

- Frontend: http://localhost:3000
- API documentation (Swagger UI): http://localhost:8000/api-docs

---

## Common Issues

### `Can't add new command when connection is in closed state`
The MySQL connection timed out. Resolved — the backend uses a connection pool (`mysql.createPool`) which acquires fresh connections automatically.

### `ER_USER_LIMIT_REACHED`
`connectionLimit` in `config/db.js` is too high. Keep it at `3` or lower.

---

## License

ISC
