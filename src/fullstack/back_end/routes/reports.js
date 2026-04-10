const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /v1/reports/metrics:
 *   get:
 *     tags: [Reports]
 *     summary: Get platform-level summary metrics
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Array of daily metric rows }
 */
router.get('/metrics', authenticate, billingController.getMetrics);

/**
 * @openapi
 * /v1/reports/generate:
 *   post:
 *     tags: [Reports]
 *     summary: Trigger report generation from historical data
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [start_date, end_date]
 *             properties:
 *               start_date:  { type: string, format: date }
 *               end_date:    { type: string, format: date }
 *               report_type: { type: string, default: summary }
 *     responses:
 *       200: { description: Report data with download URL }
 *       400: { description: Missing date range }
 */
router.post('/generate', authenticate, billingController.generateReport);

module.exports = router;
