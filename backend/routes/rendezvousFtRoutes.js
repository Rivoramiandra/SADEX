// routes/rendezvousFtRoutes.js
const express = require('express');
const router = express.Router();
const rendezvousFtController = require('../controllers/rendezvousFtController');

// Routes principales
router.get('/', rendezvousFtController.getAllRendezvous);
router.get('/stats', rendezvousFtController.getRendezvousStats);
router.get('/today', rendezvousFtController.getTodayRendezvous);
router.get('/upcoming', rendezvousFtController.getUpcomingRendezvous);
router.post('/', rendezvousFtController.createRendezvous);

// ROUTES SPÉCIFIQUES DOIVENT ÊTRE AVANT LES ROUTES PARAMÉTRÉES
router.get('/check-status', rendezvousFtController.checkAndUpdateStatus); // Déplacé ici
router.get('/check-overdue', rendezvousFtController.checkOverdueRendezvous); // Déplacé ici
router.get('/detailed-stats', rendezvousFtController.getDetailedStats); // Déplacé ici
router.get('/descente/:idDescente', rendezvousFtController.getRendezvousByDescenteId);

// Routes avec ID (paramétrées) - DOIVENT ÊTRE APRÈS LES ROUTES SPÉCIFIQUES
router.get('/:id', rendezvousFtController.getRendezvousById);
router.put('/:id', rendezvousFtController.updateRendezvous);
router.delete('/:id', rendezvousFtController.deleteRendezvous);

// Routes spécifiques pour un ID
router.get('/:id/full', rendezvousFtController.getFullRendezvousData);
router.get('/:id/check', rendezvousFtController.checkSingleRendezvousStatus);
router.patch('/:id/statut', rendezvousFtController.updateRendezvousStatut);
router.patch('/:id/mandat', rendezvousFtController.updateRdvForMandat);

// Routes de gestion du vérificateur automatique
router.post('/checker/restart', rendezvousFtController.restartChecker);
router.post('/checker/stop', rendezvousFtController.stopChecker);
router.get('/checker/status', rendezvousFtController.getCheckerStatus);

module.exports = router;