const { getAllTitresSansNom } = require("../models/titresansnomModel");

const fetchTitresSansNom = async (req, res) => {
  try {
    const features = await getAllTitresSansNom();

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    res.json(geojson);
  } catch (err) {
    console.error("❌ Erreur controller titresansnom:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = { fetchTitresSansNom };
