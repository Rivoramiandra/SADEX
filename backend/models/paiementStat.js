const db = require('../config/db'); 

const PaiementStat = {
    /**
     * Évolution hebdomadaire : Nombre et Somme
     */
    getWeeklyStats: async () => {
        const query = `
            SELECT 
                DATE_TRUNC('week', date_paiement)::date AS periode,
                COUNT(*)::int AS total_count,
                SUM(montant) AS total_somme
            FROM paiement
            GROUP BY 1 
            ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * Évolution mensuelle : Nombre et Somme
     */
    getMonthlyStats: async () => {
        const query = `
            SELECT 
                DATE_TRUNC('month', date_paiement)::date AS periode,
                COUNT(*)::int AS total_count,
                SUM(montant) AS total_somme
            FROM paiement
            GROUP BY 1 
            ORDER BY 1 DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    },
    getStatsByStatus: async (period = 'month') => {
        const validPeriods = ['week', 'month'];
        const selectedPeriod = validPeriods.includes(period) ? period : 'month';

        const query = `
            SELECT 
                DATE_TRUNC($1, date_paiement)::date AS periode,
                statut,
                COUNT(*)::int AS total_count,
                SUM(montant) AS total_somme
            FROM paiement
            GROUP BY 1, 2 
            ORDER BY 1 DESC, 2 ASC;
        `;
        
        const { rows } = await db.query(query, [selectedPeriod]);
        return rows;
    },
    getGlobalSummary: async () => {
        const query = `
            SELECT 
                COUNT(*)::int AS nb_paiements,
                COALESCE(SUM(montant), 0) AS total_facture,
                COALESCE(SUM(montant) FILTER (WHERE statut = 'Payé'), 0) AS total_encaisse,
                COALESCE(SUM(montant) FILTER (WHERE statut != 'Payé'), 0) AS total_du
            FROM paiement;
        `;
        const { rows } = await db.query(query);
        return rows[0]; 
    }
    
};

module.exports = PaiementStat;