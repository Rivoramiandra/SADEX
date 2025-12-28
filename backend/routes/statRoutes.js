const express = require('express');
const router = express.Router();
const statApController = require('../controllers/statApController');

// 1. Stats globales (Table: avisdepaiement)
router.get('/stats/ap', statApController.getApStats);

// 2. Stats par Statut (Table: ft) - C'est cette fonction qui remplace l'ancienne
router.get('/stats/ap/statut', statApController.getFtStats); 

// 3. Stats par Zone
router.get('/stats/ap/zone', statApController.getStatsByZone);

// 4. Stats par Destination
router.get('/stats/ap/destination', statApController.getStatsByDestination);

// 5. Doublon utile si vous préférez cette URL pour FT
router.get('/stats/ft/statut', statApController.getFtStats);

module.exports = router;