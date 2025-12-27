const dashboardModel = require('../models/StatDescente.js');

const statsController = {

    /**
     * Stats mensuelles (Total descentes, PV PAT, PV FIFAFI)
     * URL: GET /api/stats/monthly
     */
    getMonthlyStats: async (req, res) => {
        try {
            const data = await dashboardModel.getMonthlyStats();
            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error("Erreur Controller getMonthlyStats:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des stats mensuelles"
            });
        }
    },

    /**
     * Stats par type d'infraction (Remblai, Construction, Cellage)
     * URL: GET /api/stats/infractions
     */
    getInfractionStats: async (req, res) => {
        try {
            const data = await dashboardModel.getInfractionStats();
            res.status(200).json({
                success: true,
                count: data.length,
                data: data
            });
        } catch (error) {
            console.error("Erreur Controller getInfractionStats:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des statistiques d'infractions"
            });
        }
    },
    getZoneStats: async (req, res) => {
        try {
            const stats = await dashboardModel.getZoneStats();

            // Vérification si des données existent
            if (!stats.mensuel || stats.mensuel.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "Aucune donnée trouvée pour l'année en cours",
                    data: { mensuel: [], global: {} }
                });
            }

            res.status(200).json({
                success: true,
                message: "Statistiques récupérées avec succès",
                data: stats
            });
        } catch (error) {
            console.error("❌ Erreur dans statsController.getZoneStats:", error);
            res.status(500).json({
                success: false,
                message: "Une erreur est survenue lors de la récupération des zones",
                error: error.message
            });
        }
    },
    getDistrictStats: async (req, res) => {
        try {
            const data = await dashboardModel.getDistrictStats();
            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error("Erreur Controller getDistrictStats:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des stats par district"
            });
        }
    },
    
};

module.exports = statsController;