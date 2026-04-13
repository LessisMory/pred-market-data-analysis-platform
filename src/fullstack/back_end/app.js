const config = require('./config/env'); // Loads dotenv — must be first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { authLimiter, apiLimiter } = require('./middleware/rateLimit');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const marketsRoutes = require('./routes/markets');
const walletRoutes = require('./routes/wallet');
const billingRoutes = require('./routes/billing');
const transactionsRoutes = require('./routes/transactions');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const upstreamConfig = require('./config/upstream');
const authenticate = require('./middleware/authenticate');
const { initWebSocket } = require('./ws/stream');

const app = express();
const server = http.createServer(app);
const PORT = config.port;

// ─── Security middleware ───
// The prototype frontend (served separately by nginx) loads React, ReactDOM,
// Babel, and fonts from CDNs. In local development, skip Helmet entirely so
// CSP does not block those assets.
if (config.isProd) {
  app.use(helmet());
}
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g., curl, server-to-server) with no Origin header
      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));

// General rate limit for all API routes
app.use('/v1', apiLimiter);

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// Analytics data endpoints (prices, markets, trades, etc.)
app.use('/api/analytics', authenticate, analyticsRoutes);

// Auth — strict rate limiter on sensitive endpoints
app.use('/v1/auth/login', authLimiter);
app.use('/v1/auth', authRoutes);

// Markets
app.use('/v1/markets', marketsRoutes);

// Wallet & Performance
app.use('/v1/wallet', walletRoutes);

// Billing & Transactions
app.use('/v1/billing', billingRoutes);
app.use('/v1/transactions', transactionsRoutes);

// User Profile
app.use('/v1/user', userRoutes);
app.use('/v1/admin', adminRoutes);

// WebSocket stream
initWebSocket(server);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'analytics-backend',
    upstreams: {
      gamma: upstreamConfig.gamma.baseUrl,
      dataService: upstreamConfig.dataService.baseUrl,
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  const response = {
    error: err.message || 'Internal Server Error',
  };

  if (err.service) {
    response.service = err.service;
  }

  if (err.details !== undefined && process.env.NODE_ENV !== 'production') {
    response.details = err.details;
  }

  return res.status(status).json(response);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/stream`);
  });
}

module.exports = { app, server };
