// controllers/paiementController.js - Version finale
const Paiement = require('../models/Paiement');
const AvisDePaiement = require('../models/AvisDePaiement');
const db = require('../config/db');

class PaiementController {
  // Créer un nouveau paiement
  static async create(req, res) {
    try {
      const { avis_id } = req.params;
      const {
        date_paiement,
        methode_paiement,
        montant,
        reference_paiement,
        montant_reste,
        montant_total,
        montant_tranche,
        nombre_tranche,
        numero_tranche,
        notes,
        contact,
        statut: statutPaiement,
        type_paiement
      } = req.body;

      console.log('📥 Création de paiement pour avis:', avis_id);
      console.log('📋 Données reçues:', req.body);

      // Récupérer l'avis pour obtenir les IDs nécessaires
      const avis = await AvisDePaiement.findById(avis_id);
      
      if (!avis) {
        return res.status(404).json({
          success: false,
          message: 'Avis de paiement non trouvé'
        });
      }

      console.log('✅ Avis trouvé:', {
        id: avis.id,
        num_ap: avis.num_ap,
        iddescente: avis.iddescente,
        idft: avis.idft,
        montant: avis.montant
      });

      // Préparer les données du paiement
      const paiementData = {
        idavis: parseInt(avis_id),
        iddescente: parseInt(avis.iddescente),
        idft: parseInt(avis.idft),
        montant: parseFloat(montant),
        date_paiement: date_paiement || new Date().toISOString().split('T')[0],
        mode_paiement: methode_paiement,
        reference: reference_paiement,
        type_paiement: type_paiement || 'tranche',
        montant_reste: parseFloat(montant_reste),
        nombre_tranche: parseInt(nombre_tranche) || 1,
        numero_tranche: parseInt(numero_tranche) || 1,
        contact: contact || avis.contact || null,
        statut: statutPaiement || 'Partiellement payé'
      };

      console.log('📋 Données paiement préparées:', paiementData);

      // Créer le paiement
      const paiementId = await Paiement.create(paiementData);
      console.log('✅ Paiement créé avec ID:', paiementId);

      // Déterminer le nouveau statut de l'avis
      let nouveauStatutAvis = 'En attente';
      
      if (parseFloat(montant_reste) === 0) {
        nouveauStatutAvis = 'Payé';
      } else if (parseFloat(montant) > 0) {
        nouveauStatutAvis = 'Partiellement payé';
      }

      console.log('🔄 Nouveau statut avis:', nouveauStatutAvis);

      // Mettre à jour le statut de l'avis dans la table avisdepaiement
      // Votre table a une colonne "statut", pas "statut_paiement"
      const updateData = {
        statut: nouveauStatutAvis
        // Note: Votre table n'a pas ces colonnes, donc on ne les inclut pas:
        // methode_paiement: methode_paiement,
        // reference_paiement: reference_paiement,
        // date_paiement: date_paiement
      };

      console.log('🔄 Données de mise à jour avis:', updateData);

      // Mettre à jour l'avis
      const avisMisAJour = await AvisDePaiement.update(avis_id, updateData);
      
      if (!avisMisAJour) {
        console.warn('⚠️ Avis non trouvé pour mise à jour, mais paiement créé');
      } else {
        console.log('✅ Avis mis à jour:', avisMisAJour);
      }

      // Envoyer une notification via PostgreSQL NOTIFY
      const notificationPayload = JSON.stringify({
        idpaiement: paiementId,
        idavis: avis_id,
        montant: parseFloat(montant),
        date_paiement: date_paiement,
        mode_paiement: methode_paiement,
        reference: reference_paiement,
        statut_avis: nouveauStatutAvis
      });

      await db.query('SELECT pg_notify($1, $2)', ['new_paiement', notificationPayload]);

      // Récupérer le paiement créé pour la réponse
      const paiementCree = await Paiement.findById(paiementId);

      res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès',
        data: {
          paiement: paiementCree,
          avis: {
            id: avis_id,
            statut: nouveauStatutAvis
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du paiement',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

// controllers/paiementController.js - Modifiez la méthode getAll
static async getAll(req, res) {
  try {
    console.log('📋 GET /api/paiements - Récupération de tous les paiements');
    
    const { offset, limit, ...filters } = req.query;
    
    // Convertir les paramètres de pagination
    const pagination = {};
    if (limit) pagination.limit = parseInt(limit, 10);
    if (offset) pagination.offset = parseInt(offset, 10);
    
    // Appliquer les filtres
    if (filters.date_from) {
      filters.date_from = new Date(filters.date_from).toISOString().split('T')[0];
    }
    if (filters.date_to) {
      filters.date_to = new Date(filters.date_to).toISOString().split('T')[0];
    }
    
    // Récupérer les paiements avec la méthode findAll du modèle
    const paiements = await Paiement.findAll({ ...filters, ...pagination });
    
    console.log(`✅ ${paiements.length} paiements récupérés`);
    
    // Récupérer le total sans pagination pour les métadonnées
    const totalPaiements = await Paiement.findAll(filters);
    
    res.json({
      success: true,
      data: paiements,
      count: paiements.length,
      total: totalPaiements.length,
      metadata: {
        page: offset && limit ? Math.floor(offset / limit) + 1 : 1,
        pageSize: limit || paiements.length,
        totalPages: limit ? Math.ceil(totalPaiements.length / limit) : 1
      }
    });
  } catch (error) {
    console.error('❌ Erreur dans PaiementController.getAll:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements',
      error: error.message
    });
  }
}
  // Récupérer les paiements d'un avis
  static async getByAvisId(req, res) {
    try {
      const { idavis } = req.params;

      const paiements = await Paiement.findByAvisId(idavis);
      const totalPaye = await Paiement.getTotalByAvis(idavis);

      res.json({
        success: true,
        data: {
          paiements,
          total_paye: totalPaye
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des paiements',
        error: error.message
      });
    }
  }

  // Récupérer l'historique des paiements d'un FT
  static async getHistoriqueByFt(req, res) {
    try {
      const { idft } = req.params;

      const historique = await Paiement.getHistoriqueByFt(idft);

      res.json({
        success: true,
        data: historique
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique',
        error: error.message
      });
    }
  }

  // Supprimer un paiement
  static async delete(req, res) {
    try {
      const { idpaiement } = req.params;

      const deleted = await Paiement.delete(idpaiement);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Paiement non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Paiement supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du paiement',
        error: error.message
      });
    }
  }

  // Mettre à jour un paiement
  static async update(req, res) {
    try {
      const { idpaiement } = req.params;
      const updates = req.body;

      const updated = await Paiement.update(idpaiement, updates);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Paiement non trouvé ou aucune modification'
        });
      }

      res.json({
        success: true,
        message: 'Paiement mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du paiement',
        error: error.message
      });
    }
  }

  // Récupérer un paiement par son ID
  static async getById(req, res) {
    try {
      const { idpaiement } = req.params;

      const paiement = await Paiement.findById(idpaiement);

      if (!paiement) {
        return res.status(404).json({
          success: false,
          message: 'Paiement non trouvé'
        });
      }

      res.json({
        success: true,
        data: paiement
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du paiement',
        error: error.message
      });
    }
  }

  // Récupérer les statistiques des paiements
  static async getStats(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const statsQuery = await db.query(`
        SELECT 
          COUNT(*) as total_paiements,
          SUM(montant) as total_montant,
          COUNT(CASE WHEN date_paiement = $1 THEN 1 END) as paiements_aujourdhui,
          SUM(CASE WHEN date_paiement = $1 THEN montant ELSE 0 END) as montant_aujourdhui,
          COUNT(CASE WHEN statut = 'Payé' THEN 1 END) as paiements_complets,
          COUNT(CASE WHEN statut = 'Partiellement payé' THEN 1 END) as paiements_partiels,
          COUNT(CASE WHEN mode_paiement = 'Espèce' THEN 1 END) as espece,
          COUNT(CASE WHEN mode_paiement = 'Virement' THEN 1 END) as virement,
          COUNT(CASE WHEN mode_paiement = 'Mobile Money' THEN 1 END) as mobile_money,
          COUNT(CASE WHEN mode_paiement = 'Carte bancaire' THEN 1 END) as carte_bancaire
        FROM paiement
      `, [today]);

      res.json({
        success: true,
        data: statsQuery.rows[0]
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }
}

module.exports = PaiementController;