const express = require('express');
const statsController = require('../controllers/StatDescente.js');

const router = express.Router();


router.get('/monthly', statsController.getMonthlyStats);
router.get('/infractions', statsController.getInfractionStats);
router.get('/zones', statsController.getZoneStats);
router.get('/districts', statsController.getDistrictStats);

module.exports = router;