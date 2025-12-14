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
    // Ajoutez ces nouvelles routes :
// routes/avisDePaiementRoutes.js
router.post('/:id/mise-en-demeure', AvisDePaiementController.sendMiseEnDemeure);

    // Route pour les compteurs par statut
    router.get('/stats/statuts', AvisDePaiementController.getStatutCounts);
// routes/avisDePaiementRoutes.js
router.get('/statut-calcule/:statut', AvisDePaiementController.getByStatutCalcule);
    // Route pour récupérer les avis par statut
    router.get('/statut/:statut', AvisDePaiementController.getByStatut);
    router.put('/:id', AvisDePaiementController.update);
    router.delete('/:id', AvisDePaiementController.delete);

    module.exports = router;