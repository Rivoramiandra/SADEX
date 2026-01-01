const express = require('express');
const router = express.Router();

// Import des contrôleurs
const paiementStatController = require('../controllers/paiementStatController');
const paiementController = require('../controllers/paiementController');

// --- ÉTAPE 1 : Routes fixes (Priorité Haute) ---
// Express doit vérifier ces chemins en premier.
router.get('/stats', paiementStatController.getStats);
router.get('/statut', paiementStatController.getStatsStatus);
router.get('/summary', paiementStatController.getGlobalSummary);


module.exports = router;