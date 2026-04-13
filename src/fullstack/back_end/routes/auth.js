const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.get('/config', authController.getClientConfig);
router.post('/session', authController.exchangeFirebaseSession);

/**
 * @openapi
 * /v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               name:     { type: string }
 *     responses:
 *       201: { description: User created and signed in }
 *       400: { description: Missing required fields }
 *       409: { description: Email already registered }
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Verify user credentials or sign in as admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email:    { type: string, format: email }
 *               username: { type: string, description: Configured admin username }
 *               password: { type: string }
 *     responses:
 *       200: { description: JWT token + user info returned }
 *       400: { description: Missing required credentials }
 *       401: { description: Invalid credentials }
 *       403: { description: Account disabled }
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user info (requires JWT)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User info }
 *       401: { description: Not authenticated }
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @openapi
 * /v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and clear sessions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, authController.logout);

module.exports = router;
