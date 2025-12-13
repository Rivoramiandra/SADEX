// routes/avisDePaiementRoutes.js
const express = require('express');
const router = express.Router();
const AvisDePaiementController = require('../controllers/avisDePaiementController');

// Routes pour les avis de paiement
router.post('/', AvisDePaiementController.create);
router.get('/', AvisDePaiementController.getAll);
router.get('/stats', AvisDePaiementController.getStats);
router.get('/search', AvisDePaiementController.search);
router.get('/:id', AvisDePaiementController.getById);
router.put('/:id', AvisDePaiementController.update);
router.delete('/:id', AvisDePaiementController.delete);

module.exports = router;