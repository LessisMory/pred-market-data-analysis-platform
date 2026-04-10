-- Daily Platform Metrics
CREATE TABLE IF NOT EXISTS platform_metrics (
    metric_date      DATE PRIMARY KEY,
    total_users      INT,
    active_users     INT,
    new_users        INT,
    revenue          NUMERIC(14,2),
    churn_rate       DOUBLE PRECISION,
    conversion_rate  DOUBLE PRECISION
);
