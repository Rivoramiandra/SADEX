const Fokontany = require('../models/Fokontany');

const fokontanyController = {
  // Récupérer tous les fokontany
  getAllFokontany: async (req, res) => {
    try {
      const data = await Fokontany.getAll();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ 
        message: "Erreur lors de la récupération des fokontany",
        error: error.message 
      });
    }
  }
};

module.exports = fokontanyController;