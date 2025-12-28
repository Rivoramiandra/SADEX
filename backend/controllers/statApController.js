const StatAP = require('../models/StatAP.js');

const statApController = {
    /**
     * Stats globales des Avis de Paiement (Table: avisdepaiement)
     * URL: GET /api/stats/ap
     */
    getApStats: async (req, res) => {
        try {
            const [statsHebdo, statsMensuel] = await Promise.all([
                StatAP.getWeeklyStats(),
                StatAP.getMonthlyStats()
            ]);

            res.status(200).json({
                success: true,
                message: "Statistiques AP récupérées",
                data: {
                    hebdomadaire: statsHebdo,
                    mensuel: statsMensuel
                }
            });
        } catch (error) {
            console.error("Erreur getApStats:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Stats FT par Statut (Table: ft)
     * URL: GET /api/stats/ft/statut
     */
    getFtStats: async (req, res) => {
        try {
            const [ftHebdo, ftMensuel] = await Promise.all([
                StatAP.getFtStatusWeekly(),
                StatAP.getFtStatusMonthly()
            ]);

            res.status(200).json({
                success: true,
                message: "Statistiques FT par statut récupérées",
                data: {
                    hebdomadaire: ftHebdo,
                    mensuel: ftMensuel
                }
            });
        } catch (error) {
            console.error("Erreur getFtStats:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Stats par Zone Géo
     * URL: GET /api/stats/ap/zone
     */
    getStatsByZone: async (req, res) => {
        try {
            const data = await StatAP.getStatsByZone();
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Stats par Destination
     * URL: GET /api/stats/ap/destination
     */
    getStatsByDestination: async (req, res) => {
        try {
            const data = await StatAP.getStatsByDestination();
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = statApController;