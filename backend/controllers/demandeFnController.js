const DemandeFn = require('../models/demandeFnModel');

const getAllDemandeFn = async (req, res) => {
  try {
    const demandes = await DemandeFn.getAll();

    const geoJsonReady = demandes.map(d => ({
      ...d,
      geom: d.geom ? JSON.parse(d.geom) : null
    }));

    res.json(geoJsonReady);
  } catch (err) {
    console.error("❌ Erreur serveur demande_fn:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = { getAllDemandeFn };
