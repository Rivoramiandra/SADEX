const express = require("express");
const router = express.Router();
const descenteController = require("../controllers/descente.controller");

router.post("/", descenteController.createDescente);
router.get("/carte/descentes", descenteController.getAllDescentesForMap);

router.get("/", descenteController.getAllDescentes);
// Dans vos routes (probablement routes/descente.routes.js)

router.get("/:id", descenteController.getDescenteById);
router.put("/:id", descenteController.updateDescente);
router.delete("/:id", descenteController.deleteDescente);

module.exports = router;
