// controllers/ftController.js
const Ft = require('../models/Ft');

// Fonction utilitaire pour valider les IDs
function validateId(id) {
  if (id === undefined || id === null || id === '') {
    return { valid: false, error: 'ID est requis' };
  }
  
  // Convertir en nombre
  const numId = Number(id);
  
  if (isNaN(numId)) {
    return { valid: false, error: 'ID doit être un nombre valide' };
  }
  
  if (numId <= 0) {
    return { valid: false, error: 'ID doit être un nombre positif' };
  }
  
  if (!Number.isInteger(numId)) {
    return { valid: false, error: 'ID doit être un nombre entier' };
  }
  
  return { valid: true, id: numId };
}

const ftController = {
  /**
   * Créer un nouveau FT avec gestion du statut de dossier
   */
  async createFT(req, res) {
    try {
      const ftData = req.body;

      // Validation des champs obligatoires
      if (!ftData.date_ft || !ftData.iddescente) {
        return res.status(400).json({
          success: false,
          message: 'Les champs date_ft et iddescente sont obligatoires'
        });
      }

      // Validation du délai si dossier incomplet
      if (ftData.statut_dossier === 'Incomplet' && (!ftData.delai_complement || ftData.delai_complement === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Pour un dossier incomplet, veuillez spécifier un délai de complément'
        });
      }

      // Vérifier si un FT existe déjà pour ce rendez-vous
      if (ftData.idrendezvous) {
        const ftExists = await Ft.existsForRendezvous(ftData.idrendezvous);
        if (ftExists) {
          return res.status(400).json({
            success: false,
            message: 'Un FT existe déjà pour ce rendez-vous'
          });
        }
      }

      // Générer une référence si non fournie
      if (!ftData.reference_ft) {
        ftData.reference_ft = await Ft.generateReference();
      }

      // Définir le statut par défaut
      ftData.statut = ftData.statut || 'Etabli';

      // Créer le FT avec transaction
      const result = await Ft.createWithTransaction(ftData);

      if (result.success) {
        return res.status(201).json({
          success: true,
          message: 'Procès-verbal créé avec succès',
          data: result.data,
          statut_dossier: result.statut_dossier
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error?.message
        });
      }

    } catch (error) {
      console.error('Erreur dans createFT:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la création du FT',
        error: error.message
      });
    }
  },

  /**
   * Créer un FT (version simple)
   */
  async createSimpleFT(req, res) {
    try {
      const ftData = req.body;

      // Validation minimale
      if (!ftData.date_ft) {
        return res.status(400).json({
          success: false,
          message: 'La date du FT est obligatoire'
        });
      }

      // Validation du délai si dossier incomplet
      if (ftData.statut_dossier === 'Incomplet' && (!ftData.delai_complement || ftData.delai_complement === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Pour un dossier incomplet, veuillez spécifier un délai de complément'
        });
      }

      // Générer une référence si non fournie
      if (!ftData.reference_ft) {
        ftData.reference_ft = await Ft.generateReference();
      }

      // Créer le FT
      const createdFt = await Ft.create(ftData);

      return res.status(201).json({
        success: true,
        message: 'FT créé avec succès',
        data: createdFt,
        statut_dossier: createdFt.statut_dossier
      });

    } catch (error) {
      console.error('Erreur dans createSimpleFT:', error);
      
      // Gestion des erreurs spécifiques
      let statusCode = 500;
      let errorMessage = 'Erreur serveur';

      if (error.code === '23505') { // Violation de contrainte unique
        statusCode = 400;
        errorMessage = 'Une référence FT identique existe déjà';
      } else if (error.code === '23503') { // Violation de clé étrangère
        statusCode = 400;
        if (error.constraint && error.constraint.includes('descente')) {
          errorMessage = 'La descente spécifiée n\'existe pas';
        } else if (error.constraint && error.constraint.includes('rendezvous')) {
          errorMessage = 'Le rendez-vous spécifié n\'existe pas';
        }
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
  },

  /**
   * Récupérer un FT par ID
   */
  async getFTById(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`📥 getFTById appelé avec id: ${id}`);
      
      // Validation de l'ID
      const validation = validateId(id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const ftId = validation.id;
      console.log(`🔍 Recherche du FT avec ID validé: ${ftId}`);

      const ft = await Ft.findById(ftId);

      if (!ft) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${ftId} non trouvé`
        });
      }

      return res.status(200).json({
        success: true,
        data: ft
      });

    } catch (error) {
      console.error('❌ Erreur dans getFTById:', error);
      
      // Gestion des erreurs spécifiques
      if (error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Format d\'ID invalide',
          error: 'Invalid ID format'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération du FT',
        error: error.message
      });
    }
  },

  /**
   * Récupérer un FT complet avec données de la descente
   */
  async getFTWithDescente(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`📥 getFTWithDescente appelé avec id: ${id}`);
      
      // Validation de l'ID
      const validation = validateId(id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const ftId = validation.id;

      const ft = await Ft.findWithDescente(ftId);

      if (!ft) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${ftId} non trouvé`
        });
      }

      return res.status(200).json({
        success: true,
        data: ft
      });

    } catch (error) {
      console.error('❌ Erreur dans getFTWithDescente:', error);
      
      if (error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Format d\'ID invalide'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des données',
        error: error.message
      });
    }
  },

  /**
   * Générer une référence FT
   */
  async generateReference(req, res) {
    try {
      console.log('📥 generateReference appelé');
      const reference = await Ft.generateReference();

      return res.status(200).json({
        success: true,
        reference: reference
      });

    } catch (error) {
      console.error('❌ Erreur dans generateReference:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de référence',
        error: error.message
      });
    }
  },

  /**
   * Préparer les données FT depuis le frontend React
   */
  async prepareFTData(req, res) {
    try {
      console.log('📥 prepareFTData appelé');
      const frontendData = req.body;

      // Exemple de transformation des données du frontend
      const ftData = {
        reference_ft: frontendData.reference_ft,
        date_ft: frontendData.date_ft,
        heure_ft: frontendData.heure_ft,
        type_convoquee: frontendData.type_convoquee,
        nom_convoquee: frontendData.nom_convoquee,
        cin: frontendData.cin,
        adresse: frontendData.adresse,
        contact: frontendData.contact,
        titre_terrain: frontendData.titre_terrain,
        nom_propriete: frontendData.nom_propriete,
        nom_proprietaire: frontendData.nom_proprietaire,
        superficie_remblai: frontendData.superficie_remblai,
        dossiers_fournis: frontendData.dossiers_fournis || [],
        conclusion: frontendData.conclusion || '',
        delai_complement: frontendData.delai_complement || 0,
        statut: 'Etabli',
        statut_dossier: frontendData.statut_dossier || null,
        iddescente: frontendData.iddescente,
        idrendezvous: frontendData.idrendezvous
      };

      return res.status(200).json({
        success: true,
        data: ftData,
        message: 'Données préparées pour insertion'
      });

    } catch (error) {
      console.error('❌ Erreur dans prepareFTData:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la préparation des données',
        error: error.message
      });
    }
  },

  /**
   * Récupérer tous les FT avec filtres
   */
  async getAllFT(req, res) {
    try {
      console.log('📥 getAllFT appelé avec query:', req.query);
      
      const filters = {
        statut: req.query.statut,
        statut_dossier: req.query.statut_dossier,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        iddescente: req.query.iddescente ? parseInt(req.query.iddescente) : null,
        idrendezvous: req.query.idrendezvous ? parseInt(req.query.idrendezvous) : null,
        limit: req.query.limit ? parseInt(req.query.limit) : null,
        offset: req.query.offset ? parseInt(req.query.offset) : null
      };

      console.log('🔍 Filtres appliqués:', filters);

      const fts = await Ft.findAll(filters);

      console.log(`✅ ${fts.length} FT récupérés`);

      return res.status(200).json({
        success: true,
        data: fts,
        count: fts.length,
        total: fts.length,
        offset: filters.offset || 0,
        limit: filters.limit || 10
      });

    } catch (error) {
      console.error('❌ Erreur dans getAllFT:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des FT',
        error: error.message
      });
    }
  },

  /**
   * Mettre à jour le statut d'un FT
   */
  async updateStatut(req, res) {
    try {
      const { id } = req.params;
      const { statut, statut_dossier } = req.body;
      
      console.log(`📥 updateStatut appelé avec id: ${id}`);
      
      // Validation de l'ID
      const validation = validateId(id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const ftId = validation.id;

      if (!statut && !statut_dossier) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez spécifier un statut à mettre à jour'
        });
      }

      const updatedFt = await Ft.updateStatut(ftId, statut, statut_dossier);

      if (!updatedFt) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${ftId} non trouvé`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Statut mis à jour avec succès',
        data: updatedFt
      });

    } catch (error) {
      console.error('❌ Erreur dans updateStatut:', error);
      
      if (error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Format d\'ID invalide'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour du statut',
        error: error.message
      });
    }
  },

  /**
   * Obtenir les statistiques des FT
   */
  async getStatistics(req, res) {
    try {
      console.log('📥 getStatistics appelé');
      const stats = await Ft.countByStatut();

      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Erreur dans getStatistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des statistiques',
        error: error.message
      });
    }
  },

  /**
   * Calculer le statut d'un dossier
   */
  async calculateDossierStatut(req, res) {
    try {
      console.log('📥 calculateDossierStatut appelé');
      const { dossiers_fournis, dossier_a_fournir } = req.body;

      const statut = Ft.calculateStatutDossier(
        dossiers_fournis || [],
        dossier_a_fournir || ''
      );

      return res.status(200).json({
        success: true,
        statut_dossier: statut
      });

    } catch (error) {
      console.error('❌ Erreur dans calculateDossierStatut:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du statut',
        error: error.message
      });
    }
  },

  /**
   * Supprimer un FT
   */
  async deleteFT(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`📥 deleteFT appelé avec id: ${id}`);
      
      // Validation de l'ID
      const validation = validateId(id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const ftId = validation.id;

      // Vérifier si le FT existe
      const ft = await Ft.findById(ftId);
      if (!ft) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${ftId} non trouvé`
        });
      }

      // Logique de suppression (à adapter selon votre base de données)
      const result = await Ft.delete(ftId);

      if (result) {
        return res.status(200).json({
          success: true,
          message: 'FT supprimé avec succès',
          data: ft
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression du FT'
        });
      }

    } catch (error) {
      console.error('❌ Erreur dans deleteFT:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la suppression du FT',
        error: error.message
      });
    }
  },

  /**
   * Mettre à jour un FT (pour la validation des dossiers)
   */
  async updateFT(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log(`📥 updateFT appelé avec id: ${id}`, updateData);
      
      // Validation de l'ID
      const validation = validateId(id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const ftId = validation.id;
      
      // Validation des données de mise à jour
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune donnée à mettre à jour'
        });
      }
      
      // Vérifier si le FT existe
      const ftExists = await Ft.findById(ftId);
      if (!ftExists) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${ftId} non trouvé`
        });
      }
      
      // Mettre à jour le FT
      const updatedFt = await Ft.update(ftId, updateData);
      
      if (!updatedFt) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour du FT'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'FT mis à jour avec succès',
        data: updatedFt
      });
      
    } catch (error) {
      console.error('❌ Erreur dans updateFT:', error);
      
      if (error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Format d\'ID invalide'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour du FT',
        error: error.message
      });
    }
  },

  /**
   * Valider les dossiers d'un FT
   */
  async validateDossiers(req, res) {
    try {
      const { id } = req.params;
      const { 
        dossiersCoches, 
        currentDossiersFournis, 
      //  updatedDossiersFournis,
        nouveauStatutDossier,
        ftId // Ajouté pour correspondre à votre logique frontend
      } = req.body;
      
      console.log(`📥 validateDossiers appelé avec id: ${id}`);
      console.log('📋 Données reçues:', {
        dossiersCoches,
        currentDossiersFournis,
        // updatedDossiersFournis,
        nouveauStatutDossier,
        ftId
      });
      
      // Utiliser l'ID de la route ou du body
      const actualFtId = id || ftId;
      
      // Validation de l'ID
      const validation = validateId(actualFtId);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      
      const validatedFtId = validation.id;
      
      // Vérifier si le FT existe
      const ftExists = await Ft.findById(validatedFtId);
      if (!ftExists) {
        return res.status(404).json({
          success: false,
          message: `FT avec ID ${validatedFtId} non trouvé`
        });
      }
      
      // Calculer les dossiers mis à jour
      const updatedDossiersFournis = [
        ...(currentDossiersFournis || []),
        ...(dossiersCoches || [])
      ];
      
      // Validation des données
      if (!updatedDossiersFournis || !Array.isArray(updatedDossiersFournis)) {
        return res.status(400).json({
          success: false,
          message: 'La liste des dossiers fournis mise à jour est requise'
        });
      }
      
      // Préparer les données de mise à jour
      const updateData = {
        dossiers_fournis: updatedDossiersFournis,
        statut_dossier: nouveauStatutDossier || 'Complet',
        updated_at: new Date()
      };
      
      // Mettre à jour le FT
      const updatedFt = await Ft.update(validatedFtId, updateData);
      
      if (!updatedFt) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la validation des dossiers'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Dossiers validés avec succès',
        data: updatedFt,
        validationData: {
          dossiersCoches,
          currentDossiersFournis,
          updatedDossiersFournis,
          nouveauStatutDossier
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur dans validateDossiers:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la validation des dossiers',
        error: error.message
      });
    }
  }
};

module.exports = ftController;