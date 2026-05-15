const express = require('express');
const router = express.Router();
const marketsController = require('../controllers/marketsController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/markets/active:
 *   get:
 *     tags: [Markets]
 *     summary: Get active Polymarket contracts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of active market contracts }
 *       502: { description: Failed to fetch from upstream }
 */
router.get('/active', authenticate, marketsController.getActiveMarkets);
router.get('/contracts', authenticate, marketsController.getContracts);
router.get('/terminal', authenticate, marketsController.getTerminalMarketData);

module.exports = router;
