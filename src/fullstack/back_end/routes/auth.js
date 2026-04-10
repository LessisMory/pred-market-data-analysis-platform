const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

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
 *       201: { description: User created }
 *       400: { description: Missing required fields }
 *       409: { description: Email already registered }
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Verify credentials and trigger 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Credentials valid — call /send-sms next }
 *       400: { description: Missing email or password }
 *       401: { description: Invalid credentials }
 *       403: { description: Account disabled }
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /v1/auth/send-sms:
 *   post:
 *     tags: [Auth]
 *     summary: Send 6-digit SMS verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: integer }
 *               phone:   { type: string }
 *     responses:
 *       200: { description: Code sent }
 *       400: { description: Missing user_id }
 */
router.post('/send-sms', authController.sendSms);

/**
 * @openapi
 * /v1/auth/verify-mfa:
 *   post:
 *     tags: [Auth]
 *     summary: Verify SMS code and receive JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, code]
 *             properties:
 *               user_id: { type: integer }
 *               code:    { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: JWT token + user info returned }
 *       401: { description: Invalid or expired code }
 */
router.post('/verify-mfa', authController.verifyMfa);

/**
 * @openapi
 * /v1/auth/phone/send-code:
 *   post:
 *     tags: [Auth]
 *     summary: Phone login — send SMS code (auto-creates user)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string }
 *     responses:
 *       200: { description: Code sent }
 */
router.post('/phone/send-code', authController.phoneSendCode);

/**
 * @openapi
 * /v1/auth/phone/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Phone login — verify SMS code and receive JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, code]
 *             properties:
 *               user_id: { type: integer }
 *               code:    { type: string }
 *     responses:
 *       200: { description: JWT + user info }
 *       401: { description: Invalid code }
 */
router.post('/phone/verify', authController.phoneVerify);

/**
 * @openapi
 * /v1/auth/oauth/{provider}:
 *   get:
 *     tags: [Auth]
 *     summary: Get OAuth authorization URL
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [google, github] }
 *     responses:
 *       200: { description: OAuth URL returned }
 *       400: { description: Unsupported provider }
 */
router.get('/oauth/:provider', authController.getOAuthUrl);
router.get('/oauth/:provider/callback', authController.oauthCallback);

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
