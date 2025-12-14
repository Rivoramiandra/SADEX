// routes/paiementRoutes.js
const express = require('express');
const router = express.Router();
const PaiementController = require('../controllers/paiementController');

// IMPORTANT: Les routes spécifiques doivent venir AVANT les routes paramétrées
// Récupérer tous les paiements (avec pagination)
router.get('/paiements', PaiementController.getAll);
// Récupérer les statistiques des paiements
router.get('/paiements/stats', PaiementController.getStats);

// Récupérer un paiement par son ID
router.get('/paiements/:idpaiement', PaiementController.getById);

// Récupérer les paiements d'un avis
router.get('/avis-de-paiement/:idavis/paiements', PaiementController.getByAvisId);

// Récupérer l'historique des paiements d'un FT
router.get('/ft/:idft/paiements', PaiementController.getHistoriqueByFt);

// Créer un nouveau paiement pour un avis
router.post('/avis-de-paiement/:avis_id/paiement', PaiementController.create);

// Mettre à jour un paiement
router.put('/paiements/:idpaiement', PaiementController.update);

// Supprimer un paiement
router.delete('/paiements/:idpaiement', PaiementController.delete);

module.exports = router;