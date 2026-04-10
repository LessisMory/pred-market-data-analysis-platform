const express = require('express');
const router = express.Router();
const marketsController = require('../controllers/marketsController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/orders/execute:
 *   post:
 *     tags: [Trading]
 *     summary: Submit an order to the matching engine
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [market_id, side, amount]
 *             properties:
 *               market_id: { type: string }
 *               side:      { type: string, enum: [buy, sell] }
 *               amount:    { type: number, minimum: 0.01 }
 *     responses:
 *       201: { description: Order placed }
 *       400: { description: Missing or invalid parameters }
 *       401: { description: Not authenticated }
 */
router.post('/execute', authenticate, marketsController.executeOrder);

module.exports = router;
