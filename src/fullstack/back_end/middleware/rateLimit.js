const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// No-op middleware for test runs (avoids tripping limits across suites)
const passthrough = (_req, _res, next) => next();

// Strict limiter for sensitive auth endpoints (login, MFA, SMS)
const authLimiter = isTest
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,                  // 10 attempts per window per IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many attempts. Please try again later.' },
    });

// General API limiter for authenticated routes
const apiLimiter = isTest
  ? passthrough
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,                // 100 requests per minute per IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Rate limit exceeded.' },
    });

module.exports = { authLimiter, apiLimiter };
