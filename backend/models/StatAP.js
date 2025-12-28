const db = require('../config/db'); // Votre configuration de connexion à Postgres

const StatAP = {
    /**
     * 1. Stats globales AP par semaine (Nombre et Somme)
     */
    getWeeklyStats: async () => {
        const query = `
            SELECT 
                date_trunc('week', date_ap)::date AS periode,
                COUNT(*)::int AS total_count,
                SUM(montant) AS total_somme
            FROM avisdepaiement
            GROUP BY 1 ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * 2. Stats globales AP par mois (Nombre et Somme)
     */
    getMonthlyStats: async () => {
        const query = `
            SELECT 
                date_trunc('month', date_ap)::date AS periode,
                COUNT(*)::int AS total_count,
                SUM(montant) AS total_somme
            FROM avisdepaiement
            GROUP BY 1 ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * 3. Stats FT par STATUT et par SEMAINE
     */
    getFtStatusWeekly: async () => {
        const query = `
            SELECT 
                date_trunc('week', date_ft)::date AS periode,
                statut,
                COUNT(*)::int AS nb_ap
            FROM ft
            GROUP BY 1, 2
            ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * 4. Stats FT par STATUT et par MOIS
     */
    getFtStatusMonthly: async () => {
        const query = `
            SELECT 
                date_trunc('month', date_ft)::date AS periode,
                statut,
                COUNT(*)::int AS nb_ap
            FROM ft
            GROUP BY 1, 2
            ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * 5. Stats AP par Zone Géographique (Mensuel)
     */
    getStatsByZone: async () => {
        const query = `
            SELECT 
                date_trunc('month', date_ap)::date AS mois,
                zone_geo,
                COUNT(*)::int AS nombre_ap
            FROM avisdepaiement
            GROUP BY 1, 2 ORDER BY 1 DESC;`;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * 6. Stats AP par Destination (Mensuel)
     */
    getStatsByDestination: async () => {
        const query = `
            SELECT 
                date_trunc('month', date_ap)::date AS mois,
                destination,
                COUNT(*)::int AS nombre_ap
            FROM avisdepaiement
            GROUP BY 1, 2 ORDER BY 1 DESC;`;
        const { rows } = await db.query(query);
        return rows;
    }
};

module.exports = StatAP;