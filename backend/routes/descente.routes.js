const express = require("express");
const router = express.Router();
const descenteController = require("../controllers/descente.controller");

// Routes principales
router.post("/", descenteController.createDescente);
router.get("/", descenteController.getAllDescentes);
router.get("/carte/descentes", descenteController.getAllDescentesForMap);

// Routes avec ID
router.get("/:id", descenteController.getDescenteById);
router.put("/:id", descenteController.updateDescente);
router.delete("/:id", descenteController.deleteDescente);

// NOUVELLES ROUTES POUR LES POLYGONES
router.get("/:id/polygon", descenteController.getDescentePolygon);
router.put("/:id/polygon", descenteController.updateDescentePolygon);
router.get("/:id/surface", descenteController.calculateDescenteSurface);

// NOUVELLES ROUTES DE RECHERCHE ET FILTRAGE
router.get("/paginated", descenteController.getDescentesPaginated);
router.get("/wgs84", descenteController.getDescentesWGS84);
router.get("/stats", descenteController.getDescentesStats);
router.get("/search", descenteController.searchDescentes);
router.get("/district/:district", descenteController.getDescentesByDistrict);
router.get("/commune/:commune", descenteController.getDescentesByCommune);
router.get("/date/:date", descenteController.getDescentesByDate);

module.exports = router;