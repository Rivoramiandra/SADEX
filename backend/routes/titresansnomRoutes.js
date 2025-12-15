const express = require("express");
const { fetchTitresSansNom } = require("../controllers/titresansnomController");

const router = express.Router();

router.get("/", fetchTitresSansNom);

module.exports = router;
