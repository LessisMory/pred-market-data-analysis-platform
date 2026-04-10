DROP VIEW IF EXISTS analytics.series_mv;
DROP TABLE IF EXISTS analytics.series_kafka;
DROP TABLE IF EXISTS analytics.series;

CREATE TABLE analytics.series_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.series',
  kafka_group_name = 'ch_series_v3',   -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.series
(
  id Int64,
  series_id String,
  ticker String,
  slug String,
  title String,
  series_type String,
  recurrence String,
  active Nullable(UInt8),
  closed Nullable(UInt8),
  published_at Nullable(DateTime64(3)),
  updated_at Nullable(DateTime64(3)),
  start_date Nullable(DateTime64(3)),
  created_at Nullable(DateTime64(3)),

  _op String,
  _lsn UInt64,
  _ts  DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (series_id, id);

CREATE MATERIALIZED VIEW analytics.series_mv
TO analytics.series
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.series_id') AS series_id,
  JSON_VALUE(payload, '$.payload.ticker') AS ticker,
  JSON_VALUE(payload, '$.payload.slug') AS slug,
  JSON_VALUE(payload, '$.payload.title') AS title,
  JSON_VALUE(payload, '$.payload.series_type') AS series_type,
  JSON_VALUE(payload, '$.payload.recurrence') AS recurrence,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.active')) AS active,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.closed')) AS closed,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.published_at')) AS published_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.updated_at')) AS updated_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.start_date')) AS start_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.created_at')) AS created_at,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.series_kafka
WHERE payload != '';



DROP VIEW IF EXISTS analytics.order_book_snapshots_mv;
DROP TABLE IF EXISTS analytics.order_book_snapshots_kafka;
DROP TABLE IF EXISTS analytics.order_book_snapshots;

CREATE TABLE analytics.order_book_snapshots_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.order_book_snapshots',
  kafka_group_name = 'ch_order_book_snapshots_v2', -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.order_book_snapshots
(
  id Int64,
  token_id String,
  top_price Nullable(Float64),
  top_size Nullable(Float64),
  book String,  -- Debezium sends this JSON as a string; keep as-is or parse later
  side String,
  snapshot_timestamp DateTime64(3),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (token_id, id);

CREATE MATERIALIZED VIEW analytics.order_book_snapshots_mv
TO analytics.order_book_snapshots
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.token_id') AS token_id,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.top_price')) AS top_price,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.top_size')) AS top_size,
  JSON_VALUE(payload, '$.payload.book') AS book,
  JSON_VALUE(payload, '$.payload.side') AS side,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.snapshot_timestamp')) AS snapshot_timestamp,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.order_book_snapshots_kafka
WHERE payload != '';



DROP VIEW IF EXISTS analytics.order_book_updates_mv;
DROP TABLE IF EXISTS analytics.order_book_updates_kafka;
DROP TABLE IF EXISTS analytics.order_book_updates;

CREATE TABLE analytics.order_book_updates_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.order_book_updates',
  kafka_group_name = 'ch_order_book_updates_v2',  -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.order_book_updates
(
  id Int64,
  token_id String,
  price Float64,
  size Float64,
  side String,
  update_timestamp DateTime64(3),
  send_timestamp Nullable(DateTime64(3)),
  arrival_timestamp Nullable(DateTime64(3)),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (token_id, id);

CREATE MATERIALIZED VIEW analytics.order_book_updates_mv
TO analytics.order_book_updates
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.token_id') AS token_id,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.price')) AS price,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.size')) AS size,
  JSON_VALUE(payload, '$.payload.side') AS side,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.update_timestamp')) AS update_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.send_timestamp')) AS send_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.arrival_timestamp')) AS arrival_timestamp,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.order_book_updates_kafka
WHERE payload != '';


DROP VIEW IF EXISTS analytics.order_book_trades_mv;
DROP TABLE IF EXISTS analytics.order_book_trades_kafka;
DROP TABLE IF EXISTS analytics.order_book_trades;

CREATE TABLE analytics.order_book_trades_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.order_book_trades',
  kafka_group_name = 'ch_order_book_trades_v1',
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.order_book_trades
(
  id Int64,
  market_id String,
  token_id String,
  price Float64,
  size Float64,
  fee_rate_bps Nullable(Int32),
  side String,
  transaction_hash String,
  trade_timestamp DateTime64(3),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (market_id, token_id, trade_timestamp, id);

CREATE MATERIALIZED VIEW analytics.order_book_trades_mv
TO analytics.order_book_trades
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.market_id') AS market_id,
  JSON_VALUE(payload, '$.payload.token_id') AS token_id,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.price')) AS price,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.size')) AS size,
  toInt32OrNull(JSON_VALUE(payload, '$.payload.fee_rate_bps')) AS fee_rate_bps,
  JSON_VALUE(payload, '$.payload.side') AS side,
  JSON_VALUE(payload, '$.payload.transaction_hash') AS transaction_hash,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.trade_timestamp')) AS trade_timestamp,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.order_book_trades_kafka
WHERE payload != '';


DROP VIEW IF EXISTS analytics.events_mv;
DROP TABLE IF EXISTS analytics.events_kafka;
DROP TABLE IF EXISTS analytics.events;

CREATE TABLE analytics.events_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.events',
  kafka_group_name = 'ch_events_v2',   -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.events
(
  id Int64,
  event_id String,
  series_id Nullable(String),
  parent_event_id Nullable(String),
  ticker Nullable(String),
  slug Nullable(String),
  title Nullable(String),
  description Nullable(String),
  resolution_source Nullable(String),
  category Nullable(String),
  subcategory Nullable(String),
  active Nullable(UInt8),
  closed Nullable(UInt8),
  archived Nullable(UInt8),
  new Nullable(UInt8),
  featured Nullable(UInt8),
  restricted Nullable(UInt8),
  cyom Nullable(UInt8),
  enable_order_book Nullable(UInt8),
  neg_risk Nullable(UInt8),
  enable_neg_risk Nullable(UInt8),
  neg_risk_augmented Nullable(UInt8),
  automatically_active Nullable(UInt8),
  automatically_resolved Nullable(UInt8),
  creation_date Nullable(DateTime64(3)),
  create_at Nullable(DateTime64(3)),
  updated_at Nullable(DateTime64(3)),
  start_date Nullable(DateTime64(3)),
  start_time Nullable(DateTime64(3)),
  end_date Nullable(DateTime64(3)),
  closed_time Nullable(DateTime64(3)),
  finished_timestamp Nullable(DateTime64(3)),
  volume Nullable(Float64),
  open_interest Nullable(Float64),
  liquidity Nullable(Float64),
  volume_24hr Nullable(Float64),
  volume_1wk Nullable(Float64),
  volume_1mo Nullable(Float64),
  liquidity_amm Nullable(Float64),
  liquidity_clob Nullable(Float64),
  comment_count Nullable(Int32),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (event_id, id);

CREATE MATERIALIZED VIEW analytics.events_mv
TO analytics.events
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.event_id') AS event_id,
  JSON_VALUE(payload, '$.payload.series_id') AS series_id,
  JSON_VALUE(payload, '$.payload.parent_event_id') AS parent_event_id,
  JSON_VALUE(payload, '$.payload.ticker') AS ticker,
  JSON_VALUE(payload, '$.payload.slug') AS slug,
  JSON_VALUE(payload, '$.payload.title') AS title,
  JSON_VALUE(payload, '$.payload.description') AS description,
  JSON_VALUE(payload, '$.payload.resolution_source') AS resolution_source,
  JSON_VALUE(payload, '$.payload.category') AS category,
  JSON_VALUE(payload, '$.payload.subcategory') AS subcategory,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.active')) AS active,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.closed')) AS closed,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.archived')) AS archived,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.new')) AS new,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.featured')) AS featured,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.restricted')) AS restricted,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.cyom')) AS cyom,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.enable_order_book')) AS enable_order_book,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.neg_risk')) AS neg_risk,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.enable_neg_risk')) AS enable_neg_risk,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.neg_risk_augmented')) AS neg_risk_augmented,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.automatically_active')) AS automatically_active,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.automatically_resolved')) AS automatically_resolved,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.creation_date')) AS creation_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.create_at')) AS create_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.updated_at')) AS updated_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.start_date')) AS start_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.start_time')) AS start_time,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.end_date')) AS end_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.closed_time')) AS closed_time,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.finished_timestamp')) AS finished_timestamp,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume')) AS volume,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.open_interest')) AS open_interest,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.liquidity')) AS liquidity,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_24hr')) AS volume_24hr,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_1wk')) AS volume_1wk,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_1mo')) AS volume_1mo,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.liquidity_amm')) AS liquidity_amm,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.liquidity_clob')) AS liquidity_clob,
  toInt32OrNull(JSON_VALUE(payload, '$.payload.comment_count')) AS comment_count,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.events_kafka
WHERE payload != '';



DROP VIEW IF EXISTS analytics.markets_mv;
DROP TABLE IF EXISTS analytics.markets_kafka;
DROP TABLE IF EXISTS analytics.markets;

CREATE TABLE analytics.markets_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.markets',
  kafka_group_name = 'ch_markets_v2',  -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.markets
(
  id Int64,
  market_id String,
  event_id Nullable(String),
  condition_id Nullable(String),
  slug Nullable(String),
  resolution_source Nullable(String),
  game_id Nullable(String),
  sports_market_type Nullable(String),
  question Nullable(String),
  description Nullable(String),
  category Nullable(String),
  subcategory Nullable(String),
  market_type Nullable(String),
  market_maker_address Nullable(String),
  outcomes Array(String),
  clob_token_ids Array(String),
  active Nullable(UInt8),
  closed Nullable(UInt8),
  fpmm_live Nullable(UInt8),
  ready Nullable(UInt8),
  funded Nullable(UInt8),
  approved Nullable(UInt8),
  neg_risk Nullable(UInt8),
  neg_risk_other Nullable(UInt8),
  accepting_orders Nullable(UInt8),
  holding_rewards_enabled Nullable(UInt8),
  enable_order_book Nullable(UInt8),
  comments_enabled Nullable(UInt8),
  uma_resolution_status Nullable(String),
  rewards_min_size Nullable(Float64),
  rewards_max_spread Nullable(Float64),
  clob_rewards Nullable(Float64),
  seconds_delay Nullable(Float64),
  lower_bound Nullable(Float64),
  upper_bound Nullable(Float64),
  order_price_min_tick_size Nullable(Float64),
  order_min_size Nullable(Float64),
  maker_base_fee Nullable(Float64),
  taker_base_fee Nullable(Float64),
  spread Nullable(Float64),
  last_trade_price Nullable(Float64),
  best_bid Nullable(Float64),
  best_ask Nullable(Float64),
  fee Nullable(Float64),
  start_date Nullable(DateTime64(3)),
  end_date Nullable(DateTime64(3)),
  created_at Nullable(DateTime64(3)),
  updated_at Nullable(DateTime64(3)),
  closed_time Nullable(DateTime64(3)),
  game_start_time Nullable(DateTime64(3)),
  event_start_time Nullable(DateTime64(3)),
  accepting_orders_timestamp Nullable(DateTime64(3)),
  liquidity Nullable(Float64),
  liquidity_num Nullable(Float64),
  volume Nullable(Float64),
  volume_num Nullable(Float64),
  volume_24h Nullable(Float64),
  volume_1wk Nullable(Float64),
  volume_1mo Nullable(Float64),
  volume_1yr Nullable(Float64),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (market_id, id);

CREATE MATERIALIZED VIEW analytics.markets_mv
TO analytics.markets
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.market_id') AS market_id,
  JSON_VALUE(payload, '$.payload.event_id') AS event_id,
  JSON_VALUE(payload, '$.payload.condition_id') AS condition_id,
  JSON_VALUE(payload, '$.payload.slug') AS slug,
  JSON_VALUE(payload, '$.payload.resolution_source') AS resolution_source,
  JSON_VALUE(payload, '$.payload.game_id') AS game_id,
  JSON_VALUE(payload, '$.payload.sports_market_type') AS sports_market_type,
  JSON_VALUE(payload, '$.payload.question') AS question,
  JSON_VALUE(payload, '$.payload.description') AS description,
  JSON_VALUE(payload, '$.payload.category') AS category,
  JSON_VALUE(payload, '$.payload.subcategory') AS subcategory,
  JSON_VALUE(payload, '$.payload.market_type') AS market_type,
  JSON_VALUE(payload, '$.payload.market_maker_address') AS market_maker_address,
  JSONExtract(payload, 'payload.outcomes', 'Array(String)') AS outcomes,
  JSONExtract(payload, 'payload.clob_token_ids', 'Array(String)') AS clob_token_ids,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.active')) AS active,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.closed')) AS closed,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.fpmm_live')) AS fpmm_live,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.ready')) AS ready,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.funded')) AS funded,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.approved')) AS approved,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.neg_risk')) AS neg_risk,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.neg_risk_other')) AS neg_risk_other,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.accepting_orders')) AS accepting_orders,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.holding_rewards_enabled')) AS holding_rewards_enabled,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.enable_order_book')) AS enable_order_book,
  toUInt8OrNull(JSON_VALUE(payload, '$.payload.comments_enabled')) AS comments_enabled,
  JSON_VALUE(payload, '$.payload.uma_resolution_status') AS uma_resolution_status,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.rewards_min_size')) AS rewards_min_size,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.rewards_max_spread')) AS rewards_max_spread,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.clob_rewards')) AS clob_rewards,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.seconds_delay')) AS seconds_delay,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.lower_bound')) AS lower_bound,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.upper_bound')) AS upper_bound,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.order_price_min_tick_size')) AS order_price_min_tick_size,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.order_min_size')) AS order_min_size,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.maker_base_fee')) AS maker_base_fee,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.taker_base_fee')) AS taker_base_fee,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.spread')) AS spread,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.last_trade_price')) AS last_trade_price,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.best_bid')) AS best_bid,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.best_ask')) AS best_ask,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.fee')) AS fee,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.start_date')) AS start_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.end_date')) AS end_date,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.created_at')) AS created_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.updated_at')) AS updated_at,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.closed_time')) AS closed_time,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.game_start_time')) AS game_start_time,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.event_start_time')) AS event_start_time,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.accepting_orders_timestamp')) AS accepting_orders_timestamp,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.liquidity')) AS liquidity,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.liquidity_num')) AS liquidity_num,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume')) AS volume,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_num')) AS volume_num,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_24h')) AS volume_24h,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_1wk')) AS volume_1wk,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_1mo')) AS volume_1mo,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.volume_1yr')) AS volume_1yr,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.markets_kafka
WHERE payload != '';


DROP VIEW IF EXISTS analytics.tokens_mv;
DROP TABLE IF EXISTS analytics.tokens_kafka;
DROP TABLE IF EXISTS analytics.tokens;

CREATE TABLE analytics.tokens_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.tokens',
  kafka_group_name = 'ch_tokens_v2',  -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.tokens
(
  id Int32,
  token_id Nullable(String),
  market_id String,
  outcome Nullable(String),

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (market_id, id);

CREATE MATERIALIZED VIEW analytics.tokens_mv
TO analytics.tokens
AS
SELECT
  toInt32OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  JSON_VALUE(payload, '$.payload.token_id') AS token_id,
  JSON_VALUE(payload, '$.payload.market_id') AS market_id,
  JSON_VALUE(payload, '$.payload.outcome') AS outcome,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.tokens_kafka
WHERE payload != '';

DROP VIEW IF EXISTS analytics.chainlink_prices_mv;
DROP TABLE IF EXISTS analytics.chainlink_prices_kafka;
DROP TABLE IF EXISTS analytics.chainlink_prices;

CREATE TABLE analytics.chainlink_prices_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.chainlink_prices',
  kafka_group_name = 'ch_chainlink_prices_v1', -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.chainlink_prices
(
  id Int64,
  ingested_at DateTime64(3),
  source String,
  symbol String,
  value Float64,
  full_accuracy_value String,
  update_timestamp DateTime64(3),
  send_timestamp Nullable(DateTime64(3)),
  arrival_timestamp Nullable(DateTime64(3)),
  raw_payload String,

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (symbol, update_timestamp, id);

CREATE MATERIALIZED VIEW analytics.chainlink_prices_mv
TO analytics.chainlink_prices
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.ingested_at')) AS ingested_at,
  JSON_VALUE(payload, '$.payload.source') AS source,
  JSON_VALUE(payload, '$.payload.symbol') AS symbol,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.value')) AS value,
  JSON_VALUE(payload, '$.payload.full_accuracy_value') AS full_accuracy_value,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.update_timestamp')) AS update_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.send_timestamp')) AS send_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.arrival_timestamp')) AS arrival_timestamp,
  JSON_VALUE(payload, '$.payload.raw_payload') AS raw_payload,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.chainlink_prices_kafka
WHERE payload != '';




DROP TABLE IF EXISTS analytics.binance_prices_kafka;
DROP VIEW IF EXISTS analytics.binance_prices_mv;
DROP TABLE IF EXISTS analytics.binance_prices;

CREATE TABLE analytics.binance_prices_kafka
(
  payload String
)
ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'postgres.public.binance_prices',
  kafka_group_name = 'ch_binance_prices_v1', -- new group to re-read from start
  kafka_format = 'JSONAsString',
  kafka_handle_error_mode = 'stream';

CREATE TABLE analytics.binance_prices
(
  id Int64,
  ingested_at DateTime64(3),
  source String,
  symbol String,
  value Float64,
  full_accuracy_value String,
  update_timestamp DateTime64(3),
  send_timestamp Nullable(DateTime64(3)),
  arrival_timestamp Nullable(DateTime64(3)),
  raw_payload String,

  _op String,
  _lsn UInt64,
  _ts DateTime64(3)
)
ENGINE = ReplacingMergeTree(_lsn)
ORDER BY (symbol, update_timestamp, id);

CREATE MATERIALIZED VIEW analytics.binance_prices_mv
TO analytics.binance_prices
AS
SELECT
  toInt64OrNull(JSON_VALUE(payload, '$.payload.id')) AS id,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.ingested_at')) AS ingested_at,
  JSON_VALUE(payload, '$.payload.source') AS source,
  JSON_VALUE(payload, '$.payload.symbol') AS symbol,
  toFloat64OrNull(JSON_VALUE(payload, '$.payload.value')) AS value,
  JSON_VALUE(payload, '$.payload.full_accuracy_value') AS full_accuracy_value,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.update_timestamp')) AS update_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.send_timestamp')) AS send_timestamp,
  parseDateTime64BestEffortOrNull(JSON_VALUE(payload, '$.payload.arrival_timestamp')) AS arrival_timestamp,
  JSON_VALUE(payload, '$.payload.raw_payload') AS raw_payload,
  coalesce(JSON_VALUE(payload, '$.__op'), JSON_VALUE(payload, '$.payload.__op'), '') AS _op,
  coalesce(
    toUInt64OrNull(JSON_VALUE(payload, '$.__lsn')),
    toUInt64OrNull(JSON_VALUE(payload, '$.payload.__lsn')),
    toUInt64(0)
  ) AS _lsn,
  coalesce(
    fromUnixTimestamp64Milli(
      coalesce(
        toInt64OrNull(JSON_VALUE(payload, '$.__ts_ms')),
        toInt64OrNull(JSON_VALUE(payload, '$.payload.__ts_ms'))
      )
    ),
    toDateTime64(0, 3)
  ) AS _ts
FROM analytics.binance_prices_kafka
WHERE payload != '';


DROP VIEW IF EXISTS analytics.v_btc_updown_15m_tokens;
DROP VIEW IF EXISTS analytics.v_btc_updown_15m_token_catalog;
DROP VIEW IF EXISTS analytics.v_orderbook_tokens;
DROP VIEW IF EXISTS analytics.orderbook_tokens_from_trades_mv;
DROP VIEW IF EXISTS analytics.orderbook_tokens_from_updates_mv;
DROP VIEW IF EXISTS analytics.orderbook_tokens_from_snapshots_mv;
DROP TABLE IF EXISTS analytics.orderbook_tokens;
DROP VIEW IF EXISTS analytics.btc_updown_15m_book_update_events_mv;
DROP VIEW IF EXISTS analytics.btc_updown_15m_book_snapshot_events_mv;
DROP TABLE IF EXISTS analytics.btc_updown_15m_book_events;

CREATE TABLE analytics.orderbook_tokens
(
  asset_id String,
  observed_at DateTime64(3)
)
ENGINE = ReplacingMergeTree(observed_at)
ORDER BY asset_id;

CREATE MATERIALIZED VIEW analytics.orderbook_tokens_from_snapshots_mv
TO analytics.orderbook_tokens
AS
SELECT
  token_id AS asset_id,
  snapshot_timestamp AS observed_at
FROM analytics.order_book_snapshots
WHERE _op != 'd'
  AND token_id != '';

CREATE MATERIALIZED VIEW analytics.orderbook_tokens_from_updates_mv
TO analytics.orderbook_tokens
AS
SELECT
  token_id AS asset_id,
  update_timestamp AS observed_at
FROM analytics.order_book_updates
WHERE _op != 'd'
  AND token_id != '';

CREATE MATERIALIZED VIEW analytics.orderbook_tokens_from_trades_mv
TO analytics.orderbook_tokens
AS
SELECT
  token_id AS asset_id,
  trade_timestamp AS observed_at
FROM analytics.order_book_trades
WHERE _op != 'd'
  AND token_id != '';

CREATE VIEW analytics.v_orderbook_tokens AS
SELECT
  asset_id
FROM analytics.orderbook_tokens
GROUP BY asset_id;

CREATE VIEW analytics.v_btc_updown_15m_token_catalog AS
SELECT
  assumeNotNull(m.slug) AS slug,
  t.market_id AS market,
  assumeNotNull(t.token_id) AS asset_id,
  coalesce(m.question, assumeNotNull(m.slug)) AS market_name,
  t.outcome AS token_name,
  fromUnixTimestamp64Milli(toInt64(extract(assumeNotNull(m.slug), '([0-9]+)$')) * 1000) AS market_start_ts,
  fromUnixTimestamp64Milli((toInt64(extract(assumeNotNull(m.slug), '([0-9]+)$')) + 900) * 1000) AS market_end_ts
FROM
(
  SELECT *
  FROM analytics.tokens FINAL
) AS t
INNER JOIN
(
  SELECT *
  FROM analytics.markets FINAL
) AS m
  ON t.market_id = m.market_id
WHERE t._op != 'd'
  AND m._op != 'd'
  AND isNotNull(t.token_id)
  AND isNotNull(m.slug)
  AND match(assumeNotNull(m.slug), '^btc-updown-15m-[0-9]+$');

CREATE VIEW analytics.v_btc_updown_15m_tokens AS
SELECT
  catalog.slug AS slug,
  catalog.market AS market,
  catalog.asset_id AS asset_id,
  catalog.market_name AS market_name,
  catalog.token_name AS token_name,
  catalog.market_start_ts AS market_start_ts,
  catalog.market_end_ts AS market_end_ts
FROM analytics.v_btc_updown_15m_token_catalog AS catalog
INNER JOIN analytics.v_orderbook_tokens AS ob
  ON catalog.asset_id = ob.asset_id;

CREATE TABLE analytics.btc_updown_15m_book_events
(
  slug String,
  market String,
  asset_id String,
  event_timestamp DateTime64(3),
  event_priority UInt8,
  event_order UInt64,
  snapshot_bids Array(Tuple(Float64, Float64)),
  snapshot_asks Array(Tuple(Float64, Float64)),
  update_side String,
  update_price Float64,
  update_size Float64
)
ENGINE = MergeTree
ORDER BY (asset_id, event_timestamp, event_priority, event_order);

CREATE MATERIALIZED VIEW analytics.btc_updown_15m_book_snapshot_events_mv
TO analytics.btc_updown_15m_book_events
AS
SELECT
  tm.slug AS slug,
  tm.market AS market,
  s.token_id AS asset_id,
  s.snapshot_timestamp AS event_timestamp,
  toUInt8(0) AS event_priority,
  toUInt64(max(s.id)) AS event_order,
  arrayMap(
    level -> (toFloat64(level.1), toFloat64(level.2)),
    arrayFilter(
      level -> level.1 > 0 AND level.2 > 0,
      arrayMap(
        level_json -> (
          toFloat64OrZero(JSONExtractString(level_json, 'price')),
          toFloat64OrZero(JSONExtractString(level_json, 'size'))
        ),
        JSONExtractArrayRaw(
          if(countIf(s.side = 'bid') > 0, anyIf(s.book, s.side = 'bid'), '[]')
        )
      )
    )
  ) AS snapshot_bids,
  arrayMap(
    level -> (toFloat64(level.1), toFloat64(level.2)),
    arrayFilter(
      level -> level.1 > 0 AND level.2 > 0,
      arrayMap(
        level_json -> (
          toFloat64OrZero(JSONExtractString(level_json, 'price')),
          toFloat64OrZero(JSONExtractString(level_json, 'size'))
        ),
        JSONExtractArrayRaw(
          if(countIf(s.side = 'ask') > 0, anyIf(s.book, s.side = 'ask'), '[]')
        )
      )
    )
  ) AS snapshot_asks,
  '' AS update_side,
  toFloat64(0) AS update_price,
  toFloat64(0) AS update_size
FROM analytics.order_book_snapshots AS s
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON s.token_id = tm.asset_id
WHERE s._op != 'd'
  AND s.snapshot_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND s.snapshot_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE
GROUP BY
  tm.slug,
  tm.market,
  s.token_id,
  s.snapshot_timestamp;

CREATE MATERIALIZED VIEW analytics.btc_updown_15m_book_update_events_mv
TO analytics.btc_updown_15m_book_events
AS
SELECT
  tm.slug AS slug,
  tm.market AS market,
  u.token_id AS asset_id,
  u.update_timestamp AS event_timestamp,
  toUInt8(1) AS event_priority,
  toUInt64(u.id) AS event_order,
  CAST([], 'Array(Tuple(Float64, Float64))') AS snapshot_bids,
  CAST([], 'Array(Tuple(Float64, Float64))') AS snapshot_asks,
  lowerUTF8(u.side) AS update_side,
  toFloat64(u.price) AS update_price,
  toFloat64(u.size) AS update_size
FROM analytics.order_book_updates AS u
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON u.token_id = tm.asset_id
WHERE u._op != 'd'
  AND u.update_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND u.update_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE;


DROP VIEW IF EXISTS analytics.v_btc_second_featured;

CREATE VIEW analytics.v_btc_second_featured AS
WITH
  btc_second_base AS
  (
    SELECT
      toStartOfSecond(update_timestamp) AS chainlink_second,
      argMax(value, tuple(coalesce(send_timestamp, update_timestamp), id)) AS btc_value,
      argMax(coalesce(send_timestamp, update_timestamp), tuple(coalesce(send_timestamp, update_timestamp), id)) AS btc_receive_timestamp
    FROM analytics.chainlink_prices FINAL
    WHERE _op != 'd'
      AND lowerUTF8(arrayElement(splitByChar('/', symbol), 1)) = 'btc'
    GROUP BY chainlink_second
  ),
  (1.0 - 1.0 / 900.0) AS decay_lambda,
  31540000.0 AS seconds_in_year
SELECT
  tupleElement(point, 1) AS chainlink_second,
  tupleElement(point, 2) AS btc_value,
  tupleElement(point, 3) AS btc_receive_timestamp,
  tupleElement(point, 4) AS btc_rv
FROM
(
  SELECT arrayJoin(
    arrayFold(
      (acc, point) -> (
        sqrt(
          greatest(
            (1.0 - decay_lambda) * pow(
              if(acc.2 <= 0, 0.0, log(point.2 / acc.2)),
              2
            ) * seconds_in_year
            + decay_lambda * pow(acc.1, 2),
            0.0
          )
        ),
        point.2,
        arrayPushBack(
          acc.3,
          (
            point.1,
            point.2,
            point.3,
            sqrt(
              greatest(
                (1.0 - decay_lambda) * pow(
                  if(acc.2 <= 0, 0.0, log(point.2 / acc.2)),
                  2
                ) * seconds_in_year
                + decay_lambda * pow(acc.1, 2),
                0.0
              )
            )
          )
        )
      ),
      series_points,
      (
        toFloat64(0),
        toFloat64(0),
        CAST([], 'Array(Tuple(DateTime64(3), Float64, DateTime64(3), Float64))')
      )
    ).3
  ) AS point
  FROM
  (
    WITH
      (SELECT min(chainlink_second) FROM btc_second_base) AS min_ts,
      (SELECT max(chainlink_second) FROM btc_second_base) AS max_ts
    SELECT arraySort(x -> x.1, groupArray((chainlink_second, btc_value, btc_receive_timestamp))) AS series_points
    FROM
    (
      SELECT
        toUInt8(1) AS asof_key,
        dense.chainlink_second AS chainlink_second,
        base.btc_value AS btc_value,
        base.btc_receive_timestamp AS btc_receive_timestamp
      FROM
      (
        SELECT
          toUInt8(1) AS asof_key,
          arrayJoin(
            arrayMap(
              second -> fromUnixTimestamp64Milli(toInt64(second) * 1000),
              range(
                toUInt32(coalesce(toInt64(toUnixTimestamp(min_ts)), 0)),
                toUInt32(coalesce(toInt64(toUnixTimestamp(max_ts)), -1) + 1)
              )
            )
          ) AS chainlink_second
      ) AS dense
      ASOF LEFT JOIN
      (
        SELECT
          toUInt8(1) AS asof_key,
          chainlink_second,
          btc_value,
          btc_receive_timestamp
        FROM btc_second_base
        ORDER BY asof_key, chainlink_second
      ) AS base
      ON dense.asof_key = base.asof_key
     AND dense.chainlink_second >= base.chainlink_second
      WHERE base.btc_value > 0
    )
  )
);


DROP VIEW IF EXISTS analytics.v_btc_updown_15m_token_chainlink_meta;

CREATE VIEW analytics.v_btc_updown_15m_token_chainlink_meta AS
SELECT
  meta.slug,
  meta.market,
  meta.asset_id,
  meta.market_name,
  meta.token_name,
  strike_ref.btc_value AS strike_price,
  resolve_ref.btc_value AS resolve_price,
  if(
    isNull(meta.token_name) OR isNull(strike_ref.btc_value) OR isNull(resolve_ref.btc_value),
    'undetermined',
    if(
      lowerUTF8(meta.token_name) = 'up',
      if(resolve_ref.btc_value > strike_ref.btc_value, 'yes', 'no'),
      if(
        lowerUTF8(meta.token_name) = 'down',
        if(resolve_ref.btc_value < strike_ref.btc_value, 'yes', 'no'),
        'undetermined'
      )
    )
  ) AS result_logic
FROM
(
  SELECT
    toUInt8(1) AS asof_key,
    slug,
    market,
    asset_id,
    market_name,
    token_name,
    market_start_ts,
    market_end_ts
  FROM analytics.v_btc_updown_15m_tokens
  ORDER BY market_start_ts, asset_id
) AS meta
ASOF LEFT JOIN
(
  SELECT
    toUInt8(1) AS asof_key,
    chainlink_second,
    btc_value
  FROM analytics.v_btc_second_featured
  ORDER BY asof_key, chainlink_second
) AS strike_ref
ON meta.asof_key = strike_ref.asof_key
AND meta.market_start_ts >= strike_ref.chainlink_second
ASOF LEFT JOIN
(
  SELECT
    toUInt8(1) AS asof_key,
    chainlink_second,
    btc_value
  FROM analytics.v_btc_second_featured
  ORDER BY asof_key, chainlink_second
) AS resolve_ref
ON meta.asof_key = resolve_ref.asof_key
AND meta.market_end_ts >= resolve_ref.chainlink_second;


DROP VIEW IF EXISTS analytics.v_btc_updown_15m_trade_1s;
DROP VIEW IF EXISTS analytics.mv_btc_updown_15m_trade_1s;
DROP TABLE IF EXISTS analytics.btc_updown_15m_trade_1s;

CREATE TABLE analytics.btc_updown_15m_trade_1s
(
  slug String,
  market String,
  asset_id String,
  timestamp DateTime64(3),
  buy_trade_nominal_value Float64,
  buy_trade_size Float64,
  buy_trade_count UInt64,
  sell_trade_nominal_value Float64,
  sell_trade_size Float64,
  sell_trade_count UInt64
)
ENGINE = SummingMergeTree
ORDER BY (slug, market, asset_id, timestamp);

CREATE MATERIALIZED VIEW analytics.mv_btc_updown_15m_trade_1s
TO analytics.btc_updown_15m_trade_1s
AS
SELECT
  tm.slug AS slug,
  tm.market AS market,
  t.token_id AS asset_id,
  toStartOfSecond(t.trade_timestamp) AS timestamp,
  sumIf(t.price * t.size, upperUTF8(t.side) = 'BUY') AS buy_trade_nominal_value,
  sumIf(t.size, upperUTF8(t.side) = 'BUY') AS buy_trade_size,
  countIf(upperUTF8(t.side) = 'BUY') AS buy_trade_count,
  sumIf(t.price * t.size, upperUTF8(t.side) = 'SELL') AS sell_trade_nominal_value,
  sumIf(t.size, upperUTF8(t.side) = 'SELL') AS sell_trade_size,
  countIf(upperUTF8(t.side) = 'SELL') AS sell_trade_count
FROM analytics.order_book_trades AS t
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON t.token_id = tm.asset_id
WHERE t._op != 'd'
  AND t.trade_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND t.trade_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE
GROUP BY
  tm.slug,
  tm.market,
  t.token_id,
  timestamp;

CREATE VIEW analytics.v_btc_updown_15m_trade_1s AS
SELECT
  slug,
  market,
  asset_id,
  timestamp,
  if(
    buy_trade_size > 0,
    round(buy_trade_nominal_value / buy_trade_size, 4),
    CAST(NULL, 'Nullable(Float64)')
  ) AS buy_trade_vwap,
  buy_trade_size,
  buy_trade_count,
  buy_trade_nominal_value,
  if(
    sell_trade_size > 0,
    round(sell_trade_nominal_value / sell_trade_size, 4),
    CAST(NULL, 'Nullable(Float64)')
  ) AS sell_trade_vwap,
  sell_trade_size,
  sell_trade_count,
  sell_trade_nominal_value
FROM analytics.btc_updown_15m_trade_1s;


DROP VIEW IF EXISTS analytics.v_15m_btc_updown_book_1s;
DROP VIEW IF EXISTS analytics.mv_btc_updown_15m_book_1s;
DROP TABLE IF EXISTS analytics.btc_updown_15m_book_1s;

CREATE TABLE analytics.btc_updown_15m_book_1s
(
  slug String,
  market String,
  asset_id String,
  timestamp DateTime64(3),
  `bid_L1_price` Nullable(Float64),
  `bid_L1_size` Nullable(Float64),
  `bid_L2_price` Nullable(Float64),
  `bid_L2_size` Nullable(Float64),
  `bid_L3_price` Nullable(Float64),
  `bid_L3_size` Nullable(Float64),
  `bid_L4_price` Nullable(Float64),
  `bid_L4_size` Nullable(Float64),
  `bid_L5_price` Nullable(Float64),
  `bid_L5_size` Nullable(Float64),
  `ask_L1_price` Nullable(Float64),
  `ask_L1_size` Nullable(Float64),
  `ask_L2_price` Nullable(Float64),
  `ask_L2_size` Nullable(Float64),
  `ask_L3_price` Nullable(Float64),
  `ask_L3_size` Nullable(Float64),
  `ask_L4_price` Nullable(Float64),
  `ask_L4_size` Nullable(Float64),
  `ask_L5_price` Nullable(Float64),
  `ask_L5_size` Nullable(Float64)
)
ENGINE = MergeTree
ORDER BY (slug, market, asset_id, timestamp);

SET allow_experimental_refreshable_materialized_view = 1;

CREATE MATERIALIZED VIEW analytics.mv_btc_updown_15m_book_1s
REFRESH EVERY 1 MINUTE TO analytics.btc_updown_15m_book_1s
AS
WITH
  all_events AS
  (
    SELECT
      slug,
      market,
      asset_id,
      event_timestamp,
      event_priority,
      event_order,
      snapshot_bids,
      snapshot_asks,
      update_side,
      update_price,
      update_size
    FROM analytics.btc_updown_15m_book_events
  ),
  folded_states AS
  (
    SELECT
      slug,
      market,
      asset_id,
      arrayJoin(
        arrayFold(
          (acc, ev) -> (
            if(
              ev.2 = 0,
              ev.4,
              if(
                acc.4 = 0,
                acc.1,
                if(
                  ev.6 = 'bid',
                  if(
                    ev.8 <= 0,
                    arrayFilter(level -> level.1 != ev.7, acc.1),
                    arrayConcat(
                      arrayFilter(level -> level.1 != ev.7, acc.1),
                      [(ev.7, ev.8)]
                    )
                  ),
                  acc.1
                )
              )
            ),
            if(
              ev.2 = 0,
              ev.5,
              if(
                acc.4 = 0,
                acc.2,
                if(
                  ev.6 = 'ask',
                  if(
                    ev.8 <= 0,
                    arrayFilter(level -> level.1 != ev.7, acc.2),
                    arrayConcat(
                      arrayFilter(level -> level.1 != ev.7, acc.2),
                      [(ev.7, ev.8)]
                    )
                  ),
                  acc.2
                )
              )
            ),
            if(
              ev.2 = 0 OR acc.4 = 1,
              if(
                isNull(acc.5) OR toStartOfSecond(ev.1) > acc.5,
                arrayPushBack(
                  acc.3,
                  (
                    toStartOfSecond(ev.1),
                    ev.1,
                    ev.2,
                    ev.3,
                    if(
                      ev.2 = 0,
                      ev.4,
                      if(
                        acc.4 = 0,
                        acc.1,
                        if(
                          ev.6 = 'bid',
                          if(
                            ev.8 <= 0,
                            arrayFilter(level -> level.1 != ev.7, acc.1),
                            arrayConcat(
                              arrayFilter(level -> level.1 != ev.7, acc.1),
                              [(ev.7, ev.8)]
                            )
                          ),
                          acc.1
                        )
                      )
                    ),
                    if(
                      ev.2 = 0,
                      ev.5,
                      if(
                        acc.4 = 0,
                        acc.2,
                        if(
                          ev.6 = 'ask',
                          if(
                            ev.8 <= 0,
                            arrayFilter(level -> level.1 != ev.7, acc.2),
                            arrayConcat(
                              arrayFilter(level -> level.1 != ev.7, acc.2),
                              [(ev.7, ev.8)]
                            )
                          ),
                          acc.2
                        )
                      )
                    )
                  )
                ),
                arrayConcat(
                  arrayPopBack(acc.3),
                  [(
                    toStartOfSecond(ev.1),
                    ev.1,
                    ev.2,
                    ev.3,
                    if(
                      ev.2 = 0,
                      ev.4,
                      if(
                        acc.4 = 0,
                        acc.1,
                        if(
                          ev.6 = 'bid',
                          if(
                            ev.8 <= 0,
                            arrayFilter(level -> level.1 != ev.7, acc.1),
                            arrayConcat(
                              arrayFilter(level -> level.1 != ev.7, acc.1),
                              [(ev.7, ev.8)]
                            )
                          ),
                          acc.1
                        )
                      )
                    ),
                    if(
                      ev.2 = 0,
                      ev.5,
                      if(
                        acc.4 = 0,
                        acc.2,
                        if(
                          ev.6 = 'ask',
                          if(
                            ev.8 <= 0,
                            arrayFilter(level -> level.1 != ev.7, acc.2),
                            arrayConcat(
                              arrayFilter(level -> level.1 != ev.7, acc.2),
                              [(ev.7, ev.8)]
                            )
                          ),
                          acc.2
                        )
                      )
                    )
                  )]
                )
              ),
              acc.3
            ),
            if(ev.2 = 0, toUInt8(1), acc.4),
            if(
              ev.2 = 0 OR acc.4 = 1,
              toStartOfSecond(ev.1),
              acc.5
            )
          ),
          sorted_events,
          (
            CAST([], 'Array(Tuple(Float64, Float64))'),
            CAST([], 'Array(Tuple(Float64, Float64))'),
            CAST([], 'Array(Tuple(DateTime64(3), DateTime64(3), UInt8, UInt64, Array(Tuple(Float64, Float64)), Array(Tuple(Float64, Float64))))'),
            toUInt8(0),
            CAST(NULL, 'Nullable(DateTime64(3))')
          )
        ).3
      ) AS state_row
    FROM
    (
      SELECT
        slug,
        market,
        asset_id,
        arraySort(
          ev -> (ev.1, ev.2, ev.3),
          groupArray(
            (
              event_timestamp,
              event_priority,
              event_order,
              snapshot_bids,
              snapshot_asks,
              update_side,
              update_price,
              update_size
            )
          )
        ) AS sorted_events
      FROM all_events
      GROUP BY
        slug,
        market,
        asset_id
    )
  )
SELECT
  slug,
  market,
  asset_id,
  timestamp,
  if(length(sorted_bids) >= 1, sorted_bids[1].1, CAST(NULL, 'Nullable(Float64)')) AS `bid_L1_price`,
  if(length(sorted_bids) >= 1, sorted_bids[1].2, CAST(NULL, 'Nullable(Float64)')) AS `bid_L1_size`,
  if(length(sorted_bids) >= 2, sorted_bids[2].1, CAST(NULL, 'Nullable(Float64)')) AS `bid_L2_price`,
  if(length(sorted_bids) >= 2, sorted_bids[2].2, CAST(NULL, 'Nullable(Float64)')) AS `bid_L2_size`,
  if(length(sorted_bids) >= 3, sorted_bids[3].1, CAST(NULL, 'Nullable(Float64)')) AS `bid_L3_price`,
  if(length(sorted_bids) >= 3, sorted_bids[3].2, CAST(NULL, 'Nullable(Float64)')) AS `bid_L3_size`,
  if(length(sorted_bids) >= 4, sorted_bids[4].1, CAST(NULL, 'Nullable(Float64)')) AS `bid_L4_price`,
  if(length(sorted_bids) >= 4, sorted_bids[4].2, CAST(NULL, 'Nullable(Float64)')) AS `bid_L4_size`,
  if(length(sorted_bids) >= 5, sorted_bids[5].1, CAST(NULL, 'Nullable(Float64)')) AS `bid_L5_price`,
  if(length(sorted_bids) >= 5, sorted_bids[5].2, CAST(NULL, 'Nullable(Float64)')) AS `bid_L5_size`,
  if(length(sorted_asks) >= 1, sorted_asks[1].1, CAST(NULL, 'Nullable(Float64)')) AS `ask_L1_price`,
  if(length(sorted_asks) >= 1, sorted_asks[1].2, CAST(NULL, 'Nullable(Float64)')) AS `ask_L1_size`,
  if(length(sorted_asks) >= 2, sorted_asks[2].1, CAST(NULL, 'Nullable(Float64)')) AS `ask_L2_price`,
  if(length(sorted_asks) >= 2, sorted_asks[2].2, CAST(NULL, 'Nullable(Float64)')) AS `ask_L2_size`,
  if(length(sorted_asks) >= 3, sorted_asks[3].1, CAST(NULL, 'Nullable(Float64)')) AS `ask_L3_price`,
  if(length(sorted_asks) >= 3, sorted_asks[3].2, CAST(NULL, 'Nullable(Float64)')) AS `ask_L3_size`,
  if(length(sorted_asks) >= 4, sorted_asks[4].1, CAST(NULL, 'Nullable(Float64)')) AS `ask_L4_price`,
  if(length(sorted_asks) >= 4, sorted_asks[4].2, CAST(NULL, 'Nullable(Float64)')) AS `ask_L4_size`,
  if(length(sorted_asks) >= 5, sorted_asks[5].1, CAST(NULL, 'Nullable(Float64)')) AS `ask_L5_price`,
  if(length(sorted_asks) >= 5, sorted_asks[5].2, CAST(NULL, 'Nullable(Float64)')) AS `ask_L5_size`
FROM
(
  SELECT
    slug,
    market,
    asset_id,
    tupleElement(state_row, 1) AS timestamp,
    arraySlice(arrayReverseSort(level -> level.1, tupleElement(state_row, 5)), 1, 5) AS sorted_bids,
    arraySlice(arraySort(level -> level.1, tupleElement(state_row, 6)), 1, 5) AS sorted_asks
  FROM folded_states
);

CREATE VIEW analytics.v_15m_btc_updown_book_1s AS
SELECT
  slug,
  market,
  asset_id,
  timestamp,
  `bid_L1_price`,
  `bid_L1_size`,
  `bid_L2_price`,
  `bid_L2_size`,
  `bid_L3_price`,
  `bid_L3_size`,
  `bid_L4_price`,
  `bid_L4_size`,
  `bid_L5_price`,
  `bid_L5_size`,
  `ask_L1_price`,
  `ask_L1_size`,
  `ask_L2_price`,
  `ask_L2_size`,
  `ask_L3_price`,
  `ask_L3_size`,
  `ask_L4_price`,
  `ask_L4_size`,
  `ask_L5_price`,
  `ask_L5_size`
FROM analytics.btc_updown_15m_book_1s;


DROP VIEW IF EXISTS analytics.mv_15m_btc_updown_order_book;
DROP TABLE IF EXISTS analytics.`15m_btc_updown_order_book`;

CREATE TABLE analytics.`15m_btc_updown_order_book`
(
  slug String,
  market String,
  asset_id String,
  timestamp DateTime64(3),
  buy_trade_vwap Nullable(Float64),
  buy_trade_size Float64,
  buy_trade_count UInt64,
  buy_trade_nominal_value Float64,
  sell_trade_vwap Nullable(Float64),
  sell_trade_size Float64,
  sell_trade_count UInt64,
  sell_trade_nominal_value Float64,
  `bid_L1_price` Nullable(Float64),
  `bid_L1_size` Nullable(Float64),
  `bid_L2_price` Nullable(Float64),
  `bid_L2_size` Nullable(Float64),
  `bid_L3_price` Nullable(Float64),
  `bid_L3_size` Nullable(Float64),
  `bid_L4_price` Nullable(Float64),
  `bid_L4_size` Nullable(Float64),
  `bid_L5_price` Nullable(Float64),
  `bid_L5_size` Nullable(Float64),
  `ask_L1_price` Nullable(Float64),
  `ask_L1_size` Nullable(Float64),
  `ask_L2_price` Nullable(Float64),
  `ask_L2_size` Nullable(Float64),
  `ask_L3_price` Nullable(Float64),
  `ask_L3_size` Nullable(Float64),
  `ask_L4_price` Nullable(Float64),
  `ask_L4_size` Nullable(Float64),
  `ask_L5_price` Nullable(Float64),
  `ask_L5_size` Nullable(Float64),
  btc_value Nullable(Float64),
  btc_receive_timestamp Nullable(DateTime64(3)),
  btc_rv Nullable(Float64),
  market_name Nullable(String),
  token_name Nullable(String),
  strike_price Nullable(Float64),
  resolve_price Nullable(Float64),
  result_logic String,
  btc_price_minus_strike Nullable(Float64),
  l1_passive_mid_price Nullable(Float64),
  best_price_spread Nullable(Float64),
  orderbook_imbalance Nullable(Float64)
)
ENGINE = MergeTree
ORDER BY (slug, market, asset_id, timestamp);

SET allow_experimental_refreshable_materialized_view = 1;

CREATE MATERIALIZED VIEW analytics.mv_15m_btc_updown_order_book
REFRESH EVERY 1 MINUTE TO analytics.`15m_btc_updown_order_book`
AS
WITH
  exp(-0.5) AS weight_l2,
  exp(-1.0) AS weight_l3,
  exp(-1.5) AS weight_l4,
  exp(-2.0) AS weight_l5
SELECT
  book.slug AS slug,
  book.market AS market,
  book.asset_id AS asset_id,
  book.timestamp AS timestamp,
  trades.buy_trade_vwap AS buy_trade_vwap,
  coalesce(trades.buy_trade_size, 0.0) AS buy_trade_size,
  coalesce(trades.buy_trade_count, toUInt64(0)) AS buy_trade_count,
  coalesce(trades.buy_trade_nominal_value, 0.0) AS buy_trade_nominal_value,
  trades.sell_trade_vwap AS sell_trade_vwap,
  coalesce(trades.sell_trade_size, 0.0) AS sell_trade_size,
  coalesce(trades.sell_trade_count, toUInt64(0)) AS sell_trade_count,
  coalesce(trades.sell_trade_nominal_value, 0.0) AS sell_trade_nominal_value,
  book.`bid_L1_price` AS `bid_L1_price`,
  book.`bid_L1_size` AS `bid_L1_size`,
  book.`bid_L2_price` AS `bid_L2_price`,
  book.`bid_L2_size` AS `bid_L2_size`,
  book.`bid_L3_price` AS `bid_L3_price`,
  book.`bid_L3_size` AS `bid_L3_size`,
  book.`bid_L4_price` AS `bid_L4_price`,
  book.`bid_L4_size` AS `bid_L4_size`,
  book.`bid_L5_price` AS `bid_L5_price`,
  book.`bid_L5_size` AS `bid_L5_size`,
  book.`ask_L1_price` AS `ask_L1_price`,
  book.`ask_L1_size` AS `ask_L1_size`,
  book.`ask_L2_price` AS `ask_L2_price`,
  book.`ask_L2_size` AS `ask_L2_size`,
  book.`ask_L3_price` AS `ask_L3_price`,
  book.`ask_L3_size` AS `ask_L3_size`,
  book.`ask_L4_price` AS `ask_L4_price`,
  book.`ask_L4_size` AS `ask_L4_size`,
  book.`ask_L5_price` AS `ask_L5_price`,
  book.`ask_L5_size` AS `ask_L5_size`,
  btc_now.btc_value AS btc_value,
  btc_now.btc_receive_timestamp AS btc_receive_timestamp,
  btc_now.btc_rv AS btc_rv,
  meta.market_name AS market_name,
  meta.token_name AS token_name,
  meta.strike_price AS strike_price,
  meta.resolve_price AS resolve_price,
  meta.result_logic AS result_logic,
  if(
    isNull(btc_now.btc_value) OR isNull(meta.strike_price) OR btc_now.btc_value <= 0 OR meta.strike_price <= 0,
    CAST(NULL, 'Nullable(Float64)'),
    round(btc_now.btc_value - meta.strike_price, 4)
  ) AS btc_price_minus_strike,
  if(
    isNull(book.`bid_L1_price`) OR isNull(book.`ask_L1_price`) OR isNull(book.`bid_L1_size`) OR isNull(book.`ask_L1_size`)
    OR (book.`bid_L1_size` + book.`ask_L1_size`) <= 0,
    CAST(NULL, 'Nullable(Float64)'),
    round(
      (
        book.`ask_L1_price` * book.`bid_L1_size`
        + book.`bid_L1_price` * book.`ask_L1_size`
      ) / (book.`bid_L1_size` + book.`ask_L1_size`),
      4
    )
  ) AS l1_passive_mid_price,
  if(
    isNull(book.`ask_L1_price`) OR isNull(book.`bid_L1_price`),
    CAST(NULL, 'Nullable(Float64)'),
    round(book.`ask_L1_price` - book.`bid_L1_price`, 4)
  ) AS best_price_spread,
  if(
    (
      coalesce(book.`bid_L1_size`, 0.0)
      + weight_l2 * coalesce(book.`bid_L2_size`, 0.0)
      + weight_l3 * coalesce(book.`bid_L3_size`, 0.0)
      + weight_l4 * coalesce(book.`bid_L4_size`, 0.0)
      + weight_l5 * coalesce(book.`bid_L5_size`, 0.0)
      + coalesce(book.`ask_L1_size`, 0.0)
      + weight_l2 * coalesce(book.`ask_L2_size`, 0.0)
      + weight_l3 * coalesce(book.`ask_L3_size`, 0.0)
      + weight_l4 * coalesce(book.`ask_L4_size`, 0.0)
      + weight_l5 * coalesce(book.`ask_L5_size`, 0.0)
    ) <= 0,
    CAST(NULL, 'Nullable(Float64)'),
    round(
      (
        (
          coalesce(book.`bid_L1_size`, 0.0)
          + weight_l2 * coalesce(book.`bid_L2_size`, 0.0)
          + weight_l3 * coalesce(book.`bid_L3_size`, 0.0)
          + weight_l4 * coalesce(book.`bid_L4_size`, 0.0)
          + weight_l5 * coalesce(book.`bid_L5_size`, 0.0)
        )
        - (
          coalesce(book.`ask_L1_size`, 0.0)
          + weight_l2 * coalesce(book.`ask_L2_size`, 0.0)
          + weight_l3 * coalesce(book.`ask_L3_size`, 0.0)
          + weight_l4 * coalesce(book.`ask_L4_size`, 0.0)
          + weight_l5 * coalesce(book.`ask_L5_size`, 0.0)
        )
      ) / (
        (
          coalesce(book.`bid_L1_size`, 0.0)
          + weight_l2 * coalesce(book.`bid_L2_size`, 0.0)
          + weight_l3 * coalesce(book.`bid_L3_size`, 0.0)
          + weight_l4 * coalesce(book.`bid_L4_size`, 0.0)
          + weight_l5 * coalesce(book.`bid_L5_size`, 0.0)
        )
        + (
          coalesce(book.`ask_L1_size`, 0.0)
          + weight_l2 * coalesce(book.`ask_L2_size`, 0.0)
          + weight_l3 * coalesce(book.`ask_L3_size`, 0.0)
          + weight_l4 * coalesce(book.`ask_L4_size`, 0.0)
          + weight_l5 * coalesce(book.`ask_L5_size`, 0.0)
        )
      ),
      4
    )
  ) AS orderbook_imbalance
FROM
(
  SELECT
    toUInt8(1) AS asof_key,
    slug,
    market,
    asset_id,
    timestamp,
    `bid_L1_price`,
    `bid_L1_size`,
    `bid_L2_price`,
    `bid_L2_size`,
    `bid_L3_price`,
    `bid_L3_size`,
    `bid_L4_price`,
    `bid_L4_size`,
    `bid_L5_price`,
    `bid_L5_size`,
    `ask_L1_price`,
    `ask_L1_size`,
    `ask_L2_price`,
    `ask_L2_size`,
    `ask_L3_price`,
    `ask_L3_size`,
    `ask_L4_price`,
    `ask_L4_size`,
    `ask_L5_price`,
    `ask_L5_size`
  FROM analytics.btc_updown_15m_book_1s
  ORDER BY timestamp, slug, asset_id
) AS book
ASOF LEFT JOIN
(
  SELECT
    toUInt8(1) AS asof_key,
    chainlink_second,
    btc_value,
    btc_receive_timestamp,
    btc_rv
  FROM analytics.v_btc_second_featured
  ORDER BY asof_key, chainlink_second
) AS btc_now
ON book.asof_key = btc_now.asof_key
AND book.timestamp >= btc_now.chainlink_second
LEFT JOIN analytics.v_btc_updown_15m_trade_1s AS trades
  ON book.slug = trades.slug
 AND book.market = trades.market
 AND book.asset_id = trades.asset_id
 AND book.timestamp = trades.timestamp
LEFT JOIN analytics.v_btc_updown_15m_token_chainlink_meta AS meta
  ON book.slug = meta.slug
 AND book.market = meta.market
 AND book.asset_id = meta.asset_id
;


-- One-time bootstrap for a fresh ClickHouse init. This seeds the staged BTC 15m
-- tables from any raw order book history already present before recurring refreshes run.
SYSTEM STOP VIEW analytics.mv_btc_updown_15m_book_1s;
SYSTEM STOP VIEW analytics.mv_15m_btc_updown_order_book;

INSERT INTO analytics.orderbook_tokens
SELECT
  token_id AS asset_id,
  snapshot_timestamp AS observed_at
FROM analytics.order_book_snapshots
WHERE _op != 'd'
  AND token_id != '';

INSERT INTO analytics.orderbook_tokens
SELECT
  token_id AS asset_id,
  update_timestamp AS observed_at
FROM analytics.order_book_updates
WHERE _op != 'd'
  AND token_id != '';

INSERT INTO analytics.orderbook_tokens
SELECT
  token_id AS asset_id,
  trade_timestamp AS observed_at
FROM analytics.order_book_trades
WHERE _op != 'd'
  AND token_id != '';

INSERT INTO analytics.btc_updown_15m_book_events
SELECT
  tm.slug AS slug,
  tm.market AS market,
  s.token_id AS asset_id,
  s.snapshot_timestamp AS event_timestamp,
  toUInt8(0) AS event_priority,
  toUInt64(max(s.id)) AS event_order,
  arrayMap(
    level -> (toFloat64(level.1), toFloat64(level.2)),
    arrayFilter(
      level -> level.1 > 0 AND level.2 > 0,
      arrayMap(
        level_json -> (
          toFloat64OrZero(JSONExtractString(level_json, 'price')),
          toFloat64OrZero(JSONExtractString(level_json, 'size'))
        ),
        JSONExtractArrayRaw(
          if(countIf(s.side = 'bid') > 0, anyIf(s.book, s.side = 'bid'), '[]')
        )
      )
    )
  ) AS snapshot_bids,
  arrayMap(
    level -> (toFloat64(level.1), toFloat64(level.2)),
    arrayFilter(
      level -> level.1 > 0 AND level.2 > 0,
      arrayMap(
        level_json -> (
          toFloat64OrZero(JSONExtractString(level_json, 'price')),
          toFloat64OrZero(JSONExtractString(level_json, 'size'))
        ),
        JSONExtractArrayRaw(
          if(countIf(s.side = 'ask') > 0, anyIf(s.book, s.side = 'ask'), '[]')
        )
      )
    )
  ) AS snapshot_asks,
  '' AS update_side,
  toFloat64(0) AS update_price,
  toFloat64(0) AS update_size
FROM analytics.order_book_snapshots AS s
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON s.token_id = tm.asset_id
WHERE s._op != 'd'
  AND s.snapshot_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND s.snapshot_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE
GROUP BY
  tm.slug,
  tm.market,
  s.token_id,
  s.snapshot_timestamp;

INSERT INTO analytics.btc_updown_15m_book_events
SELECT
  tm.slug AS slug,
  tm.market AS market,
  u.token_id AS asset_id,
  u.update_timestamp AS event_timestamp,
  toUInt8(1) AS event_priority,
  toUInt64(u.id) AS event_order,
  CAST([], 'Array(Tuple(Float64, Float64))') AS snapshot_bids,
  CAST([], 'Array(Tuple(Float64, Float64))') AS snapshot_asks,
  lowerUTF8(u.side) AS update_side,
  toFloat64(u.price) AS update_price,
  toFloat64(u.size) AS update_size
FROM analytics.order_book_updates AS u
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON u.token_id = tm.asset_id
WHERE u._op != 'd'
  AND u.update_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND u.update_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE;

INSERT INTO analytics.btc_updown_15m_trade_1s
SELECT
  tm.slug AS slug,
  tm.market AS market,
  t.token_id AS asset_id,
  toStartOfSecond(t.trade_timestamp) AS timestamp,
  sumIf(t.price * t.size, upperUTF8(t.side) = 'BUY') AS buy_trade_nominal_value,
  sumIf(t.size, upperUTF8(t.side) = 'BUY') AS buy_trade_size,
  countIf(upperUTF8(t.side) = 'BUY') AS buy_trade_count,
  sumIf(t.price * t.size, upperUTF8(t.side) = 'SELL') AS sell_trade_nominal_value,
  sumIf(t.size, upperUTF8(t.side) = 'SELL') AS sell_trade_size,
  countIf(upperUTF8(t.side) = 'SELL') AS sell_trade_count
FROM analytics.order_book_trades AS t
INNER JOIN analytics.v_btc_updown_15m_token_catalog AS tm
  ON t.token_id = tm.asset_id
WHERE t._op != 'd'
  AND t.trade_timestamp >= tm.market_start_ts - INTERVAL 30 MINUTE
  AND t.trade_timestamp < tm.market_end_ts + INTERVAL 5 MINUTE
GROUP BY
  tm.slug,
  tm.market,
  t.token_id,
  timestamp;

SYSTEM REFRESH VIEW analytics.mv_btc_updown_15m_book_1s;
SYSTEM REFRESH VIEW analytics.mv_15m_btc_updown_order_book;
SYSTEM START VIEW analytics.mv_btc_updown_15m_book_1s;
SYSTEM START VIEW analytics.mv_15m_btc_updown_order_book;
