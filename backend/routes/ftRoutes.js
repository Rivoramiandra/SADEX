// routes/ftRoutes.js
const express = require('express');
const router = express.Router();
const ftController = require('../controllers/ftController');

//
// ROUTES SANS ID (toujours avant /:id)
// --------------------------------------------------

// Liste FT + filtres
router.get('/', ftController.getAllFT);

// Statistiques FT
router.get('/statistics', ftController.getStatistics);

// Générer référence FT
router.get('/generate/reference', ftController.generateReference);

// Création FT normal
router.post('/', ftController.createFT);

// Création FT simple
router.post('/simple', ftController.createSimpleFT);

// Préparer les données initiales
router.post('/prepare', ftController.prepareFTData);

// Calcul statut dossier
router.post('/calculate-statut', ftController.calculateDossierStatut);

//
// ROUTES AVEC ID (toujours après)
// --------------------------------------------------

// Récupérer FT par ID
router.get('/:id', ftController.getFTById);

// FT avec descente
router.get('/:id/with-descente', ftController.getFTWithDescente);

// Mise à jour statut FT
router.put('/:id/statut', ftController.updateStatut);
router.put('/:id', ftController.updateFT);
// Suppression FT
router.delete('/:id', ftController.deleteFT);

module.exports = router;
