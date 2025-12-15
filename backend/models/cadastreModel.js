// models/cadastreModel.js
import pool from '../config/db.js';

const Cadastre = {
  getAll: async () => {
    try {
      const result = await pool.query(`
        SELECT id, nom_sectio, section, parcelle, did, nom_plan, surface, ST_AsGeoJSON(geom) as geom
        FROM cadastre
      `);
      return result.rows;
    } catch (err) {
      console.error("Erreur SQL cadastre:", err);
      throw err;
    }
  },
};

export default Cadastre;
