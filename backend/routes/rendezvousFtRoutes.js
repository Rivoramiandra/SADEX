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

// Routes avec ID
// router.get('/:id', rendezvousFtController.getRendezvousById);
router.put('/:id', rendezvousFtController.updateRendezvous);
router.delete('/:id', rendezvousFtController.deleteRendezvous);

// Routes spécifiques
router.get('/descente/:idDescente', rendezvousFtController.getRendezvousByDescenteId);
router.patch('/:id/statut', rendezvousFtController.updateRendezvousStatut);

// Nouvelles routes pour la vérification automatique
router.get('/check-status', rendezvousFtController.checkAndUpdateStatus);
router.get('/:id/check', rendezvousFtController.checkSingleRendezvousStatus);
router.get('/check-overdue', rendezvousFtController.checkOverdueRendezvous);

// Routes de gestion du vérificateur automatique
router.post('/checker/restart', rendezvousFtController.restartChecker);
router.post('/checker/stop', rendezvousFtController.stopChecker);
router.get('/checker/status', rendezvousFtController.getCheckerStatus);

module.exports = router;