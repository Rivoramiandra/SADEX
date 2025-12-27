const express = require('express');
const router = express.Router();
const rvController = require('../controllers/StatRendezVous.js');


router.get('/', rvController.getRendezVousStats);

router.get('/ft', rvController.getFtDashboardData);
router.get('/ft/mensuel', rvController.getFtMonthlySum);
router.get('/ft/recent', rvController.getRecentFt);

module.exports = router;