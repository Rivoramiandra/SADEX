const Fokontany = require('../models/Fokontany');

const fokontanyController = {
    /**
     * GET /api/fokontany?x=517431&y=797309
     */
    getFokontanyByCoordinates: async (req, res) => {
        try {
            const { x, y } = req.query;
            
            if (!x || !y) {
                return res.status(400).json({
                    success: false,
                    message: 'Les paramètres x et y sont requis'
                });
            }
            
            const xNumber = parseFloat(x);
            const yNumber = parseFloat(y);
            
            if (isNaN(xNumber) || isNaN(yNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Les coordonnées doivent être des nombres'
                });
            }
            
            const fokontany = await Fokontany.findByCoordinates(xNumber, yNumber);
            
            if (fokontany) {
                return res.json({
                    success: true,
                    message: 'Fokontany trouvé',
                    data: fokontany
                });
            } else {
                return res.json({
                    success: false,
                    message: 'Aucun fokontany trouvé',
                    data: null
                });
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    }
};

module.exports = fokontanyController;