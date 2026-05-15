const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/user/profile:
 *   get:
 *     tags: [User]
 *     summary: Get user profile and statistics
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile with stats }
 *       404: { description: User not found }
 */
router.get('/profile', authenticate, userController.getProfile);
router.get('/me', authenticate, userController.getMeSummary);

/**
 * @openapi
 * /v1/user/activities:
 *   get:
 *     tags: [User]
 *     summary: Get user activity timeline
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Array of activity records }
 */
router.get('/activities', authenticate, userController.getActivities);

/**
 * @openapi
 * /v1/user/update:
 *   put:
 *     tags: [User]
 *     summary: Update user profile info
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *     responses:
 *       200: { description: Updated user object }
 *       400: { description: No fields provided }
 */
router.put('/update', authenticate, userController.updateProfile);
router.put('/email', authenticate, userController.updateEmail);
router.put('/password', authenticate, userController.updatePassword);
router.put('/preferences', authenticate, userController.updatePreferences);
router.post('/api-keys', authenticate, userController.createApiKey);
router.delete('/api-keys/:id', authenticate, userController.revokeApiKey);
router.delete('/deactivate', authenticate, userController.deactivateAccount);

module.exports = router;
