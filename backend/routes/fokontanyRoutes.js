const express = require('express');
const router = express.Router();
const fokontanyController = require('../controllers/fokontanyController');

// Vérifiez que fokontanyController.getAllFokontany existe bien
router.get('/', fokontanyController.getAllFokontany);

// ✅ ESSENTIEL : Doit être router (pas {router} ou fokontanyRoutes)
module.exports = router;