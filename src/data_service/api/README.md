# Data Service API

FastAPI read-only REST layer over the prediction-market and crypto-price tables
populated by `transform_layer`. Consumed by the Node backend's `analyticsService`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | DB connectivity probe |
| GET | `/chainlink/prices` | Chainlink on-chain price ticks, filtered by symbol + time range |
| GET | `/prices/binance` | Binance ticker snapshots |
| GET | `/markets` | Polymarket market metadata (filter by slug, closed) |
| GET | `/data` | Order-book snapshot aggregates (1s or 5s buckets) |

Interactive docs: `http://localhost:8000/docs`

## Local run

```bash
cd src/data_service/api
pip install -r requirements.txt

export POSTGRES_DSN="postgresql://postgres:postgres@localhost:5432/postgres"
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker

```bash
docker build -t ob-data-service .
docker run -p 8000:8000 \
  -e POSTGRES_DSN="postgresql://postgres:postgres@host.docker.internal:5432/postgres" \
  ob-data-service
```

## Tests

```bash
cd src/data_service
PYTHONPATH=. pytest api/tests -v
```

Tests use a fake asyncpg pool — no real database required.

## Integration with Node backend

The Node backend reads `DATA_SERVICE_API_BASE_URL` from its `.env` file.
Point it at this service:

```
DATA_SERVICE_API_BASE_URL=http://localhost:8000
```
