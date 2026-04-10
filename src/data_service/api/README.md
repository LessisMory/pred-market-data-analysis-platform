# Data Service API

This directory contains the FastAPI layer for `data_service`.

Current scope:
- `GET /health`
- `GET /chainlink/prices`
- `GET /markets`
- `GET /markets/depth-volume-chart`

This first API slice reads Chainlink price data from ClickHouse and is structured to make future endpoints easy to add with the same pattern:
- `db/`: database client and env config
- `fetchers/`: query logic
- `routes/`: HTTP handling and parameter validation
- `api.py`: app entrypoint and router registration only

## Current Endpoints

### `GET /health`

Checks whether the API can reach ClickHouse and whether the expected Chainlink table exists.

Successful response:

```json
{
  "status": "ok",
  "database": "analytics",
  "table": "chainlink_prices"
}
```

### `GET /chainlink/prices`

Returns Chainlink price points from ClickHouse.

Successful response shape:

```json
{
  "symbol": "BTC/USD",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-01T01:00:00Z",
  "count": 2,
  "data": [
    {
      "update_timestamp": "2024-01-01T00:00:00Z",
      "value": 42123.45,
      "symbol": "BTC/USD"
    }
  ]
}
```

When you use `latest=true`, the response keeps the same shape, but `start` and `end` are `null` because the request is not window-based. The `data` array contains the newest rows up to `limit`.

## Accepted Parameters

### `symbol`

Required.

The route accepts user-friendly symbol formats and normalizes them internally.

Supported examples:
- `btc`
- `BNB`
- `btc/usd`
- `BTCUSD`
- `eth-usd`
- `sol_usd`

Normalization examples:
- `btc` -> `BTC/USD`
- `bnb` -> `BNB/USD`
- `btcusd` -> `BTC/USD`

The value is case-insensitive.

### Time Parameters

The route now supports only two time-query modes.

#### Option 1: explicit ISO 8601 window

Use `start` and `end` together.

Example:

```text
start=2024-01-01T00:00:00Z
end=2024-01-01T01:00:00Z
```

#### Option 2: latest rows

Use `latest=true`. Pair it with `limit` to control how many of the newest rows you want back.

Example:

```text
latest=true&limit=10
```

If you omit all time parameters, the request is rejected. This keeps the API behavior narrow and easier to validate.

### `limit`

Optional.

Applies to both query modes. With `latest=true`, it controls how many of the newest rows are returned.

Rules:
- default: `1000`
- minimum: `1`
- maximum: `10000`

## Valid Parameter Combinations

Allowed:
- `symbol + start + end`
- `symbol + latest=true`

Rejected:
- `symbol` only
- `start` without `end`
- `end` without `start`
- `latest=true` together with `start` or `end`

## Example Calls

### Health

```bash
curl "http://localhost:8000/health"
```

### Explicit UTC time range

```bash
curl "http://localhost:8000/chainlink/prices?symbol=btcusd&start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z"
```

### Latest record

```bash
curl "http://localhost:8000/chainlink/prices?symbol=eth&latest=true&limit=10"
```

### `GET /markets`

Returns distinct markets currently available in the chart table.

Successful response shape:

```json
{
  "count": 1,
  "data": [
    {
      "slug": "btc-updown-15m-1764565200",
      "market_id": "0xmarket",
      "asset_id": "123",
      "market_name": "Bitcoin Up or Down",
      "token_name": "Up"
    }
  ]
}
```

### `GET /markets/depth-volume-chart`

Returns the latest chart-ready market points for a `market_id + asset_id` pair. Each point contains:
- transaction volume metrics for the timestamp
- order book depth across bid and ask levels
- top-of-book summary fields such as mid price, spread, and imbalance

Required query parameters:
- `market_id`
- `asset_id`

Optional query parameters:
- `limit` with default `100`, minimum `1`, maximum `10000`

Example:

```bash
curl "http://localhost:8000/markets"
curl "http://localhost:8000/markets/depth-volume-chart?market_id=0xmarket&asset_id=123&limit=300"
```

Successful response shape:

```json
{
  "slug": "btc-updown-15m-1764565200",
  "count": 1,
  "market_id": "0xmarket",
  "asset_id": "123",
  "market_name": "Bitcoin Up or Down",
  "token_name": "Up",
  "data": [
    {
      "slug": "btc-updown-15m-1764565200",
      "timestamp": "2025-12-01T05:00:23Z",
      "trade_volume": {
        "buy": {
          "vwap": 0.44,
          "size": 2.27,
          "count": 1,
          "nominal_value": 1.0
        },
        "sell": {
          "vwap": null,
          "size": 0.0,
          "count": 0,
          "nominal_value": 0.0
        },
        "total_size": 2.27,
        "total_count": 1,
        "total_nominal_value": 1.0
      },
      "order_book_depth": {
        "bids": [
          {
            "level": 1,
            "price": 0.43,
            "size": 1568.0,
            "cumulative_size": 1568.0
          }
        ],
        "asks": [
          {
            "level": 1,
            "price": 0.44,
            "size": 2.72,
            "cumulative_size": 2.72
          }
        ],
        "total_bid_size": 1568.0,
        "total_ask_size": 2.72
      },
      "mid_price": 0.44,
      "spread": 0.01,
      "imbalance": 0.53
    }
  ]
}
```

## Environment Variables

The API reads ClickHouse connection settings from environment variables.

Supported variables:
- `CLICKHOUSE_HOST`
- `CLICKHOUSE_PORT`
- `CLICKHOUSE_USER`
- `CLICKHOUSE_USERNAME`
- `CLICKHOUSE_PASSWORD`
- `CLICKHOUSE_DB`
- `CLICKHOUSE_DATABASE`
- `CLICKHOUSE_SECURE`

Local defaults are aligned with the current `transform_layer` ClickHouse service:

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=clickhouse
CLICKHOUSE_DB=analytics
CLICKHOUSE_SECURE=false
```

See [.env.example](/Users/moryshi/Projects/fintech/512/pred_market_data_platform/src/data_service/api/.env.example).

## Running Locally

The API dependency set targets Python 3.11, which matches the GitLab CI image.

From the repo root:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r src/data_service/api/requirements-dev.txt
```

Then from `src/data_service`:

```bash
uvicorn api.api:app --reload
```

Then open:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Running With Docker

From `src/data_service/api`:

```bash
docker compose up --build
```

The API container is configured to connect to the shared `data_pipeline` network and uses:

```env
CLICKHOUSE_HOST=transform_clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=analytics
```

See:
- [Dockerfile](/Users/moryshi/Projects/fintech/512/pred_market_data_platform/src/data_service/api/Dockerfile)
- [docker-compose.yaml](/Users/moryshi/Projects/fintech/512/pred_market_data_platform/src/data_service/api/docker-compose.yaml)

## Running Tests

Use the same Python 3.11 virtualenv described above, then from the repo root:

```bash
python -m pytest src/data_service/api/tests
```

Coverage:

```bash
python -m coverage run --source=src/data_service/api --omit='*/tests/*' -m pytest src/data_service/api/tests
python -m coverage report -m
```

At the time this README was written, the current API implementation had full production-code coverage.

## Notes

- The fetcher remains API-agnostic and keeps the SQL/query handling out of the route layer.
- Timestamps in responses are serialized as UTC ISO 8601 strings.
- Empty query results are valid and return `count: 0` with an empty `data` array.
