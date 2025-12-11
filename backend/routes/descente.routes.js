const express = require("express");
const router = express.Router();
const descenteController = require("../controllers/descente.controller");

router.post("/", descenteController.createDescente);
router.get("/", descenteController.getAllDescentes);
router.get("/:id", descenteController.getDescenteById);
router.put("/:id", descenteController.updateDescente);
router.delete("/:id", descenteController.deleteDescente);

module.exports = router;
