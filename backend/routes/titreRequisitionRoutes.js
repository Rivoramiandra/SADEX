const express = require('express');
const { getAllTitreRequisition } = require('../controllers/titreRequisitionController');

const router = express.Router();

router.get('/', getAllTitreRequisition);

module.exports = router;
