const rvModel = require('../models/StatRendezVous.js');

const rvController = {

    /**
     * Statistiques globales des Rendez-vous (Table: rendezvousft)
     */
    getRendezVousStats: async (req, res) => {
        try {
            const stats = await rvModel.getRendezVousStats();

            if (!stats.mensuel.length && !stats.hebdomadaire.length) {
                return res.status(200).json({
                    success: true,
                    message: "Aucun rendez-vous enregistré pour le moment",
                    data: { mensuel: [], hebdomadaire: [] }
                });
            }

            res.status(200).json({
                success: true,
                message: "Statistiques de rendez-vous récupérées avec succès",
                data: stats
            });

        } catch (error) {
            console.error("❌ Erreur dans StatRendezVous Controller:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors du calcul des statistiques de rendez-vous",
                error: error.message
            });
        }
    },

    /**
     * Statistiques des Dossiers (Table: ft)
     */
    getFtDashboardData: async (req, res) => {
        try {
            // Utilisation de rvModel car tout est regroupé dedans
            const [hebdoData, mensuelData] = await Promise.all([
                rvModel.getFtCurrentWeekStats(),
                rvModel.getFtStatusStats()
            ]);

            res.status(200).json({
                success: true,
                message: "Statistiques FT récupérées avec succès",
                data: {
                    actuel: hebdoData,
                    evolution: mensuelData
                }
            });

        } catch (error) {
            console.error("❌ Erreur dans StatFt Controller:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de l'extraction des données FT",
                error: error.message
            });
        }
    },
    getFtMonthlySum: async (req, res) => {
        try {
            const data = await rvModel.getFtTotalByMonth();

            if (!data || data.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "Aucune donnée trouvée pour l'année en cours",
                    data: []
                });
            }

            res.status(200).json({
                success: true,
                message: "Somme mensuelle FT récupérée avec succès",
                data: data
            });

        } catch (error) {
            console.error("❌ Erreur dans getFtMonthlySum:", error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération de la somme mensuelle",
                error: error.message
            });
        }
    },
    getRecentFt: async (req, res) => {
        try {
            const latest = await rvModel.getLatestFt();
            res.status(200).json({
                success: true,
                data: latest
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = rvController;