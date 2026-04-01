#!/bin/bash

set -euo pipefail

json_escape() {
  local value=${1//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  printf '%s' "$value"
}

CONNECT_URL="${DEBEZIUM_CONNECT_URL:-${CONNECT_URL:-http://localhost:18083}}"
CONNECTOR_NAME="${DEBEZIUM_CONNECTOR_NAME:-${CONNECTOR_NAME:-pg-cdc}}"

# Match the database stack defaults unless explicitly overridden.
DB_HOST="${DBZ_DATABASE_HOST:-${POSTGRES_HOST:-persistence_postgres}}"
DB_PORT="${DBZ_DATABASE_PORT:-${POSTGRES_PORT:-5432}}"
DB_USER="${DBZ_DATABASE_USER:-${POSTGRES_USER:-postgres}}"
DB_PASSWORD="${DBZ_DATABASE_PASSWORD:-${POSTGRES_PASSWORD:-postgres}}"
DB_NAME="${DBZ_DATABASE_NAME:-${POSTGRES_DB:-postgres}}"

TOPIC_PREFIX="${DBZ_TOPIC_PREFIX:-postgres}"
SERVER_NAME="${DBZ_SERVER_NAME:-$TOPIC_PREFIX}"
PUBLICATION_NAME="${DBZ_PUBLICATION_NAME:-dbz_publication}"
SLOT_NAME="${DBZ_SLOT_NAME:-dbz_slot}"

DB_HOST_ESCAPED="$(json_escape "$DB_HOST")"
DB_PORT_ESCAPED="$(json_escape "$DB_PORT")"
DB_USER_ESCAPED="$(json_escape "$DB_USER")"
DB_PASSWORD_ESCAPED="$(json_escape "$DB_PASSWORD")"
DB_NAME_ESCAPED="$(json_escape "$DB_NAME")"
TOPIC_PREFIX_ESCAPED="$(json_escape "$TOPIC_PREFIX")"
SERVER_NAME_ESCAPED="$(json_escape "$SERVER_NAME")"
PUBLICATION_NAME_ESCAPED="$(json_escape "$PUBLICATION_NAME")"
SLOT_NAME_ESCAPED="$(json_escape "$SLOT_NAME")"

curl --silent --show-error --fail-with-body \
  -X PUT "${CONNECT_URL}/connectors/${CONNECTOR_NAME}/config" \
  -H 'Content-Type: application/json' \
  -d "{
    \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",
    \"database.hostname\": \"${DB_HOST_ESCAPED}\",
    \"database.port\": \"${DB_PORT_ESCAPED}\",
    \"database.user\": \"${DB_USER_ESCAPED}\",
    \"database.password\": \"${DB_PASSWORD_ESCAPED}\",
    \"database.dbname\": \"${DB_NAME_ESCAPED}\",
    \"database.server.name\": \"${SERVER_NAME_ESCAPED}\",
    \"topic.prefix\": \"${TOPIC_PREFIX_ESCAPED}\",
    \"publication.name\": \"${PUBLICATION_NAME_ESCAPED}\",
    \"publication.autocreate.mode\": \"all_tables\",
    \"slot.name\": \"${SLOT_NAME_ESCAPED}\",
    \"plugin.name\": \"pgoutput\",
    \"slot.drop.on.stop\": \"false\",
    \"poll.interval.ms\": \"500\",
    \"max.batch.size\": \"8192\",
    \"max.queue.size\": \"65536\",
    \"include.schema.changes\": \"false\",
    \"snapshot.mode\": \"initial\",
    \"snapshot.fetch.size\": \"5000\",
    \"snapshot.max.threads\": \"1\",
    \"tombstones.on.delete\": \"false\",
    \"heartbeat.interval.ms\": \"10000\",
    \"time.precision.mode\": \"connect\",
    \"errors.tolerance\": \"all\",
    \"errors.log.enable\": \"true\",
    \"errors.deadletterqueue.topic.name\": \"postgres-dlq\",
    \"errors.deadletterqueue.context.headers.enable\": \"true\",
    \"transforms\": \"unwrap\",
    \"transforms.unwrap.type\": \"io.debezium.transforms.ExtractNewRecordState\",
    \"transforms.unwrap.drop.tombstones\": \"false\",
    \"transforms.unwrap.delete.handling.mode\": \"rewrite\",
    \"transforms.unwrap.add.fields\": \"op,ts_ms,source.ts_ms,source.lsn\",
    \"transforms.unwrap.add.fields.prefix\": \"__\",
    \"decimal.handling.mode\": \"double\"
  }"

echo
echo "Connector ${CONNECTOR_NAME} configured against ${DB_HOST}:${DB_PORT}/${DB_NAME}"
