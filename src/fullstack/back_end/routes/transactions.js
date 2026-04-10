const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/transactions:
 *   get:
 *     tags: [Billing]
 *     summary: Get current user's billing and payment history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Array of payment records }
 */
router.get('/', authenticate, billingController.getTransactions);

module.exports = router;
