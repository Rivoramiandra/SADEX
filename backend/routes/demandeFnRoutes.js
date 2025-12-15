const express = require('express');
const { getAllDemandeFn } = require('../controllers/demandeFnController');

const router = express.Router();

router.get('/', getAllDemandeFn);

module.exports = router;
