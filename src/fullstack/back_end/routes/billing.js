const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/billing/subscribe:
 *   post:
 *     tags: [Billing]
 *     summary: Subscribe to a plan (Stripe/PayPal)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:         { type: string, enum: [free, premium, institutional] }
 *               payment_type: { type: string, enum: [card, paypal], default: card }
 *     responses:
 *       200: { description: Subscription activated }
 *       400: { description: Invalid plan }
 */
router.post('/subscribe', authenticate, billingController.subscribe);

module.exports = router;
