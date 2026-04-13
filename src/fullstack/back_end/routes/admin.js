const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');

/**
 * @openapi
 * /v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get monitorable user records for the admin dashboard
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by name, email, or phone
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: User list for admin monitoring }
 *       401: { description: Not authenticated }
 *       403: { description: Admin access required }
 */
router.get('/users', authenticate, requireAdmin, adminController.listUsers);
router.post('/users', authenticate, requireAdmin, adminController.createUser);
router.get('/transactions', authenticate, requireAdmin, adminController.listTransactions);
router.get('/platform', authenticate, requireAdmin, adminController.getPlatformOverview);
router.patch('/users/:id/status', authenticate, requireAdmin, adminController.updateUserStatus);
router.patch('/users/:id/role', authenticate, requireAdmin, adminController.updateUserRole);
router.delete('/users/:id', authenticate, requireAdmin, adminController.deleteUser);
router.post('/users/:id/reset-password', authenticate, requireAdmin, adminController.resetUserPassword);

module.exports = router;
