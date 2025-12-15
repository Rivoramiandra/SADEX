const pool = require('../config/db'); // Connexion PostgreSQL

const DemandeFn = {
  getAll: async () => {
    try {
      const result = await pool.query(`
        SELECT 
          gid,
          shape_leng,
          n_fn_fg,
          demandeur,
          sur_plan,
          localite,
          fokontany,
          situation,
          aire_cal,
          ST_AsGeoJSON(geom) AS geom
        FROM demandefn
        ORDER BY gid DESC
      `);
      return result.rows;
    } catch (err) {
      console.error("❌ Erreur getAll demande_fn:", err);
      throw err;
    }
  },
};

module.exports = DemandeFn;
