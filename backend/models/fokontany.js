const pool = require('../config/db'); // Connexion PostgreSQL

const Fokontany = {
  /**
   * Récupère tous les fokontany
   */
  getAll: async () => {
    try {
      const result = await pool.query(`
        SELECT 
          id_fkt,
          fkt,
          firaisana,
          distrika
        FROM fokontany
        ORDER BY id_fkt ASC
      `);
      return result.rows;
    } catch (err) {
      console.error("❌ Erreur getAll fokontany:", err);
      throw err;
    }
  },

  /**
   * Optionnel : Récupérer les fokontany par district
   */
  getByDistrika: async (distrika) => {
    try {
      const result = await pool.query(
        'SELECT * FROM fokontany WHERE distrika = $1 ORDER BY fkt ASC',
        [distrika]
      );
      return result.rows;
    } catch (err) {
      console.error(`❌ Erreur getByDistrika :`, err);
      throw err;
    }
  }
};

module.exports = Fokontany;