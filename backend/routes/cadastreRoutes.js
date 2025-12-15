const express = require('express');
const { getAllCadastre } = require('../controllers/cadastreController');

const router = express.Router();

router.get('/', getAllCadastre);

module.exports = router;
