const pool = require('../config/db'); // Connexion PostgreSQL

const TitreRequisition = {
  getAll: async () => {
    try {
      const result = await pool.query(`
        SELECT 
          gid,
          titre,
          properiete,
          sur_plan,
          titre_r,
          partie,
          feuille,
          parcelle,
          aire_calcu,
          tolerance,
          ST_AsGeoJSON(geom) AS geom
        FROM titrerequisition
      `);
      return result.rows;
    } catch (err) {
      console.error("❌ Erreur getAll TitreRequisition:", err);
      throw err;
    }
  },
};

module.exports = TitreRequisition;
