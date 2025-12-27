const pool = require("../config/db.js");

module.exports = {
  // 1. Stats pour les Rendez-vous
  getRendezVousStats: async () => {
    const queryMensuel = `
      SELECT TO_CHAR(date_rendez_vous, 'Mon') AS periode,
             EXTRACT(MONTH FROM date_rendez_vous) AS periode_num,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE statut = 'En attente') AS en_attente,
             COUNT(*) FILTER (WHERE statut = 'En cours') AS en_cours,
             COUNT(*) FILTER (WHERE statut = 'Non-comparution') AS non_comparution
      FROM "rendezvousft"
      WHERE date_rendez_vous >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2 ORDER BY 2;`;

    const queryHebdo = `
      SELECT 'Semaine ' || TO_CHAR(date_rendez_vous, 'IW') AS periode,
             TO_CHAR(date_rendez_vous, 'IW') AS periode_num,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE statut = 'En attente') AS en_attente,
             COUNT(*) FILTER (WHERE statut = 'En cours') AS en_cours,
             COUNT(*) FILTER (WHERE statut = 'Non-comparution') AS non_comparution
      FROM "rendezvousft"
      WHERE date_rendez_vous >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY 1, 2 ORDER BY 2;`;

    const [mensuelRes, hebdoRes] = await Promise.all([
      pool.query(queryMensuel),
      pool.query(queryHebdo)
    ]);
    return { mensuel: mensuelRes.rows, hebdomadaire: hebdoRes.rows };
  },

  // 2. Stats pour les Dossiers (Semaine Actuelle)
  // --- VÉRIFIEZ BIEN CETTE FONCTION ---
  getFtCurrentWeekStats: async () => {
    const query = `
      SELECT 'Semaine ' || TO_CHAR(date_ft, 'IW') AS periode,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE statut_dossier = 'Complet') AS complet,
             COUNT(*) FILTER (WHERE statut_dossier = 'Incomplet') AS incomplet
      FROM ft
      WHERE EXTRACT(YEAR FROM date_ft) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND TO_CHAR(date_ft, 'IW') = TO_CHAR(CURRENT_DATE, 'IW')
      GROUP BY 1;`;
    const res = await pool.query(query);
    return res.rows[0] || { periode: 'Cette semaine', total: 0, complet: 0, incomplet: 0 };
  },

  // 3. Stats pour les Dossiers (Évolution Mensuelle)
  // --- VÉRIFIEZ BIEN CETTE FONCTION ---
  getFtStatusStats: async () => {
    const query = `
      SELECT TO_CHAR(date_ft, 'Mon') AS periode,
             EXTRACT(MONTH FROM date_ft) AS periode_num,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE statut_dossier = 'Complet') AS complet,
             COUNT(*) FILTER (WHERE statut_dossier = 'Incomplet') AS incomplet
      FROM ft
      WHERE date_ft >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2 ORDER BY 2;`;
    const res = await pool.query(query);
    return res.rows;
  },
  getFtTotalByMonth: async () => {
    const query = `
      SELECT 
        TO_CHAR(date_ft, 'Mon') AS periode,
        COUNT(*) AS total
      FROM ft
      WHERE date_ft >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, EXTRACT(MONTH FROM date_ft)
      ORDER BY EXTRACT(MONTH FROM date_ft) ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
},
getLatestFt: async () => {
    const query = `
        SELECT 
        reference_ft,
        statut_dossier,
        TO_CHAR(date_ft, 'DD/MM/YYYY HH24:MI') AS date_affichage
      FROM ft 
      ORDER BY date_ft DESC 
      LIMIT 5;
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (error) {
      console.error("❌ Erreur SQL getLatestFt:", error);
      throw error;
    }
  }
};