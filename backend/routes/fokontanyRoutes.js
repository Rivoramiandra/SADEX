const express = require('express');
const router = express.Router();
const fokontanyController = require('../controllers/fokontanyController');

/**
 * @route   GET /api/fokontany
 * @desc    Rechercher un fokontany par coordonnées
 * @access  Public
 * @query   {x} - Coordonnée X Lambert
 * @query   {y} - Coordonnée Y Lambert
 * @example GET /api/fokontany?x=517431&y=797309
 */
router.get('/', fokontanyController.getFokontanyByCoordinates);

module.exports = router;