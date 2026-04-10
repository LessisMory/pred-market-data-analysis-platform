const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/wallet/overview:
 *   get:
 *     tags: [Wallet]
 *     summary: Get wallet performance metrics (total P&L, trades, volume)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Wallet overview with 4 core KPIs }
 *       401: { description: Not authenticated }
 */
router.get('/overview', authenticate, walletController.getOverview);

/**
 * @openapi
 * /v1/wallet/history:
 *   get:
 *     tags: [Wallet]
 *     summary: Get historical wallet data for chart rendering
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: market
 *         schema: { type: string }
 *         description: Filter by market slug
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200: { description: Array of historical events }
 */
router.get('/history', authenticate, walletController.getHistory);

module.exports = router;
