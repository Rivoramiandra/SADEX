const express = require('express');
const { getShapefile } = require('../controllers/ShapefileController');

const router = express.Router();

router.get('/limites', getShapefile);

module.exports = router;
