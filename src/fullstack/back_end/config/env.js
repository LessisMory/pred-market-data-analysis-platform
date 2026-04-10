require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

function required(name, fallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return fallback;
}

const config = {
  nodeEnv: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT || '3000', 10),

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ob_analyzer',
    user: process.env.DB_USER || 'postgres',
    password: required('DB_PASSWORD', 'postgres'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
};

module.exports = config;
