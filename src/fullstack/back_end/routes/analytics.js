const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/prices/chainlink', analyticsController.getChainlinkPrices);
router.get('/prices/binance', analyticsController.getBinancePrices);
router.get('/markets', analyticsController.getMarkets);
router.get('/trades', analyticsController.getTrades);
router.get('/events', analyticsController.getEvents);
router.get('/series', analyticsController.getSeries);
router.get('/data', analyticsController.getData);

module.exports = router;
