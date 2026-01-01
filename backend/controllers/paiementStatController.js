const PaiementStat = require('../models/paiementStat');

const getStats = async (req, res) => {
    try {
        const { type } = req.query; // 'weekly' ou 'monthly'
        let data;

        if (type === 'weekly') {
            data = await PaiementStat.getWeeklyStats();
        } else {
            data = await PaiementStat.getMonthlyStats();
        }

        res.status(200).json({
            success: true,
            results: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la récupération des statistiques de paiement" 
        });
    }
};
const getStatsStatus = async (req, res) => {
    try {
        const { period } = req.query; // 'week' ou 'month'
        const data = await PaiementStat.getStatsByStatus(period);

        res.status(200).json({
            success: true,
            period: period || 'month',
            results: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getGlobalSummary = async (req, res) => {
    try {
        const data = await PaiementStat.getGlobalSummary();
        res.status(200).json({
            success: true,
            results: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors du calcul du résumé des paiements" 
        });
    }
};

module.exports = { getStats,getStatsStatus,getGlobalSummary };