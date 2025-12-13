const AvisDePaiement = require('../models/AvisDePaiement');

class AvisDePaiementController {
  /**
   * Créer un nouvel avis de paiement
   */
  static async create(req, res) {
    console.log('📥 === DÉBUT - Création avis de paiement ===');
    console.log('📥 Méthode:', req.method);
    console.log('📥 URL:', req.originalUrl);
    console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📥 Content-Type:', req.get('Content-Type'));
    
    try {
      let avisData = req.body;
      
      console.log('📥 Corps de la requête brut:', JSON.stringify(avisData, null, 2));
      console.log('📥 Type de données reçues:', typeof avisData);
      console.log('📥 Clés présentes:', Object.keys(avisData));
      
      // Normaliser les données pour s'assurer qu'elles correspondent aux colonnes de la table
      avisData = {
        // Champs correspondant aux colonnes de la table
        iddescente: avisData.iddescente,
        idft: avisData.idft,
        num_ap: avisData.num_ap,
        date_ap: avisData.date_ap,
        superficie_remblai: avisData.superficie_remblai,
        zone_geo: avisData.zone_geo,
        pu: avisData.pu,
        destination: avisData.destination,
        montant: avisData.montant,
        montant_lettre: avisData.montant_lettre,
        fin_premier_paiement: avisData.fin_premier_paiement,
        contact: avisData.contact,
        
        // Champs optionnels qui pourraient être envoyés (seront ignorés si non dans le modèle)
        // Ne pas inclure les champs de calcul temporaires
      };
      
      console.log('📥 Données normalisées:', JSON.stringify(avisData, null, 2));
      
      // Validation des données requises
      const requiredFields = ['idft', 'iddescente', 'num_ap', 'date_ap', 'superficie_remblai', 'montant', 'montant_lettre'];
      const missingFields = requiredFields.filter(field => {
        const value = avisData[field];
        return value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '');
      });
      
      if (missingFields.length > 0) {
        console.log('❌ Champs manquants:', missingFields);
        console.log('❌ Données reçues:', {
          idft: avisData.idft,
          iddescente: avisData.iddescente,
          num_ap: avisData.num_ap,
          date_ap: avisData.date_ap,
          superficie_remblai: avisData.superficie_remblai,
          montant: avisData.montant,
          montant_lettre: avisData.montant_lettre
        });
        
        return res.status(400).json({
          success: false,
          message: 'Des champs obligatoires sont manquants',
          missing_fields: missingFields,
          required_fields: requiredFields,
          received_data: {
            idft: avisData.idft,
            iddescente: avisData.iddescente,
            num_ap: avisData.num_ap,
            date_ap: avisData.date_ap,
            superficie_remblai: avisData.superficie_remblai,
            montant: avisData.montant,
            montant_lettre: avisData.montant_lettre
          }
        });
      }

      // Validation des types de données
      const numericFields = ['idft', 'iddescente', 'superficie_remblai', 'montant'];
      const invalidNumericFields = numericFields.filter(field => {
        const value = avisData[field];
        return value !== null && value !== undefined && isNaN(Number(value));
      });
      
      if (invalidNumericFields.length > 0) {
        console.log('❌ Champs numériques invalides:', invalidNumericFields);
        return res.status(400).json({
          success: false,
          message: 'Des champs numériques sont invalides',
          invalid_fields: invalidNumericFields
        });
      }
      
      // Conversion des champs numériques
      avisData.idft = parseInt(avisData.idft, 10);
      avisData.iddescente = parseInt(avisData.iddescente, 10);
      avisData.superficie_remblai = parseFloat(avisData.superficie_remblai);
      avisData.montant = parseFloat(avisData.montant);
      
      // Validation des valeurs
      if (avisData.idft <= 0 || avisData.iddescente <= 0) {
        return res.status(400).json({
          success: false,
          message: 'idft et iddescente doivent être des nombres positifs',
          idft: avisData.idft,
          iddescente: avisData.iddescente
        });
      }
      
      if (avisData.superficie_remblai <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La superficie doit être un nombre positif',
          superficie_remblai: avisData.superficie_remblai
        });
      }
      
      if (avisData.montant <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Le montant doit être un nombre positif',
          montant: avisData.montant
        });
      }

      console.log('✅ Données valides, appel de createWithTransaction...');
      console.log('📤 Données finales envoyées au modèle:', JSON.stringify(avisData, null, 2));
      
      const result = await AvisDePaiement.createWithTransaction(avisData);
      
      console.log('📤 Résultat de createWithTransaction:', {
        success: result.success,
        message: result.message,
        has_data: !!result.data,
        error: result.error ? result.error.message : 'aucune'
      });
      
      if (result.success) {
        console.log('✅ Avis créé avec succès! ID:', result.data?.id);
        console.log('✅ Référence AP:', result.data?.num_ap);
        
        // Retourner l'avis créé avec les données formatées
        res.status(201).json({
          success: true,
          message: 'Avis de paiement créé avec succès',
          data: result.data,
          details: {
            reference: result.data.num_ap,
            montant: result.data.montant,
            date: result.data.date_ap
          }
        });
      } else {
        console.log('❌ Échec de création:', result.message);
        res.status(400).json({
          success: false,
          message: result.message || 'Échec de la création de l\'avis de paiement',
          error: result.error || 'Erreur inconnue'
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur inattendue dans create avis de paiement:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // Gestion des erreurs de base de données spécifiques
      let errorMessage = 'Erreur lors de la création de l\'avis de paiement';
      let statusCode = 500;
      
      if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = 'Un avis de paiement avec cette référence existe déjà';
        statusCode = 409;
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        errorMessage = 'Le FT ou la descente référencé(e) n\'existe pas';
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      console.log('📥 === FIN - Création avis de paiement ===\n');
    }
  }

  /**
   * Récupérer tous les avis de paiement avec filtres optionnels
   */
  static async getAll(req, res) {
    console.log('📋 GET /api/avis-de-paiement');
    console.log('📋 Query params:', req.query);
    
    try {
      const filters = req.query;
      
      // Validation des filtres numériques
      const numericFilters = ['idft', 'iddescente', 'montant_min', 'montant_max'];
      numericFilters.forEach(filter => {
        if (filters[filter] && !isNaN(filters[filter])) {
          filters[filter] = Number(filters[filter]);
        }
      });
      
      console.log('📋 Filtres appliqués:', filters);
      
      const avisList = await AvisDePaiement.findAll(filters);
      
      console.log('✅ Nombre d\'avis trouvés:', avisList.length);
      
      // Formater les données pour le front-end
      const formattedList = avisList.map(avis => ({
        id: avis.id,
        iddescente: avis.iddescente,
        idft: avis.idft,
        num_ap: avis.num_ap,
        date_ap: avis.date_ap,
        superficie_remblai: avis.superficie_remblai,
        zone_geo: avis.zone_geo,
        pu: avis.pu,
        destination: avis.destination,
        montant: avis.montant,
        montant_lettre: avis.montant_lettre,
        fin_premier_paiement: avis.fin_premier_paiement,
        contact: avis.contact,
        created_at: avis.created_at,
        updated_at: avis.updated_at
      }));
      
      res.json({
        success: true,
        data: formattedList,
        count: formattedList.length,
        metadata: {
          total: formattedList.length,
          montant_total: formattedList.reduce((sum, avis) => sum + (avis.montant || 0), 0)
        }
      });
    } catch (error) {
      console.error('❌ Erreur dans getAll avis de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des avis de paiement',
        error: error.message
      });
    }
  }

  /**
   * Récupérer un avis de paiement par ID avec relations
   */
  static async getById(req, res) {
    console.log('🔍 GET /api/avis-de-paiement/:id');
    console.log('🔍 ID demandé:', req.params.id);
    
    try {
      const { id } = req.params;
      console.log('🔍 Recherche avis ID:', id);
      
      // Recherche avec les données liées (FT et Descente)
      const avis = await AvisDePaiement.findByIdWithRelations(id);
      
      if (!avis) {
        console.log('❌ Avis non trouvé pour ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Avis de paiement non trouvé'
        });
      }
      
      console.log('✅ Avis trouvé:', avis.id, '-', avis.num_ap);
      
      // Formater la réponse
      const formattedAvis = {
        id: avis.id,
        iddescente: avis.iddescente,
        idft: avis.idft,
        num_ap: avis.num_ap,
        date_ap: avis.date_ap,
        superficie_remblai: avis.superficie_remblai,
        zone_geo: avis.zone_geo,
        pu: avis.pu,
        destination: avis.destination,
        montant: avis.montant,
        montant_lettre: avis.montant_lettre,
        fin_premier_paiement: avis.fin_premier_paiement,
        contact: avis.contact,
        created_at: avis.created_at,
        updated_at: avis.updated_at,
        // Inclure les données liées si disponibles
        ft: avis.ft,
        descente: avis.descente
      };
      
      res.json({
        success: true,
        data: formattedAvis
      });
    } catch (error) {
      console.error('❌ Erreur dans getById avis de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'avis de paiement',
        error: error.message
      });
    }
  }

  /**
   * Mettre à jour un avis de paiement
   */
  static async update(req, res) {
    console.log('🔄 PUT /api/avis-de-paiement/:id');
    console.log('🔄 ID à mettre à jour:', req.params.id);
    console.log('🔄 Données de mise à jour:', req.body);
    
    try {
      const { id } = req.params;
      let updateData = req.body;
      
      console.log('🔄 Mise à jour avis ID:', id);
      console.log('🔄 Données brutes:', updateData);
      
      // Filtrer les données pour n'inclure que les champs de la table
      const allowedFields = [
        'num_ap', 'date_ap', 'superficie_remblai', 'zone_geo', 'pu', 
        'destination', 'montant', 'montant_lettre', 'fin_premier_paiement', 'contact'
      ];
      
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });
      
      console.log('🔄 Données filtrées:', filteredData);
      
      // Validation des données numériques
      if (filteredData.superficie_remblai !== undefined) {
        const superficie = parseFloat(filteredData.superficie_remblai);
        if (isNaN(superficie) || superficie <= 0) {
          return res.status(400).json({
            success: false,
            message: 'La superficie doit être un nombre positif',
            superficie_remblai: filteredData.superficie_remblai
          });
        }
        filteredData.superficie_remblai = superficie;
      }
      
      if (filteredData.montant !== undefined) {
        const montant = parseFloat(filteredData.montant);
        if (isNaN(montant) || montant <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Le montant doit être un nombre positif',
            montant: filteredData.montant
          });
        }
        filteredData.montant = montant;
      }
      
      const updatedAvis = await AvisDePaiement.update(id, filteredData);
      
      if (!updatedAvis) {
        console.log('❌ Avis non trouvé pour mise à jour ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Avis de paiement non trouvé'
        });
      }
      
      console.log('✅ Avis mis à jour:', updatedAvis.id, '-', updatedAvis.num_ap);
      
      res.json({
        success: true,
        message: 'Avis de paiement mis à jour avec succès',
        data: updatedAvis
      });
    } catch (error) {
      console.error('❌ Erreur dans update avis de paiement:', error);
      
      let errorMessage = 'Erreur lors de la mise à jour de l\'avis de paiement';
      let statusCode = 500;
      
      if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = 'Un avis de paiement avec cette référence existe déjà';
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
  }

  /**
   * Supprimer un avis de paiement
   */
  static async delete(req, res) {
    console.log('🗑️ DELETE /api/avis-de-paiement/:id');
    console.log('🗑️ ID à supprimer:', req.params.id);
    
    try {
      const { id } = req.params;
      console.log('🗑️ Suppression avis ID:', id);
      
      const deleted = await AvisDePaiement.delete(id);
      
      if (!deleted) {
        console.log('❌ Avis non trouvé pour suppression ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Avis de paiement non trouvé'
        });
      }
      
      console.log('✅ Avis supprimé ID:', id);
      
      res.json({
        success: true,
        message: 'Avis de paiement supprimé avec succès',
        deletedId: id
      });
    } catch (error) {
      console.error('❌ Erreur dans delete avis de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de l\'avis de paiement',
        error: error.message
      });
    }
  }

  /**
   * Récupérer les statistiques
   */
  static async getStats(req, res) {
    console.log('📊 GET /api/avis-de-paiement/stats');
    
    try {
      console.log('📊 Calcul des statistiques...');
      const stats = await AvisDePaiement.getStatistics();
      
      console.log('📊 Statistiques calculées:', stats);
      
      // Formater les statistiques pour le front-end
      const formattedStats = {
        total: stats.total || 0,
        total_montant: stats.total_montant || 0,
        by_month: stats.by_month || [],
        by_zone: stats.by_zone || [],
        by_destination: stats.by_destination || [],
        recent: stats.recent || []
      };
      
      res.json({
        success: true,
        data: formattedStats
      });
    } catch (error) {
      console.error('❌ Erreur dans getStats avis de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }

  /**
   * Rechercher des avis de paiement
   */
  static async search(req, res) {
    console.log('🔎 GET /api/avis-de-paiement/search');
    console.log('🔎 Terme de recherche:', req.query.q);
    console.log('🔎 Filtres additionnels:', req.query);
    
    try {
      const { q, ...filters } = req.query;
      
      if (!q && Object.keys(filters).length === 0) {
        console.log('❌ Terme de recherche ou filtres manquants');
        return res.status(400).json({
          success: false,
          message: 'Le terme de recherche ou des filtres sont requis'
        });
      }
      
      console.log('🔎 Recherche pour:', q);
      console.log('🔎 Filtres appliqués:', filters);
      
      const results = await AvisDePaiement.search(q, filters);
      
      console.log('🔎 Nombre de résultats:', results.length);
      
      // Formater les résultats
      const formattedResults = results.map(avis => ({
        id: avis.id,
        num_ap: avis.num_ap,
        date_ap: avis.date_ap,
        montant: avis.montant,
        montant_lettre: avis.montant_lettre,
        superficie_remblai: avis.superficie_remblai,
        zone_geo: avis.zone_geo,
        destination: avis.destination,
        contact: avis.contact,
        ft_reference: avis.ft_reference,
        descente_reference: avis.descente_reference
      }));
      
      res.json({
        success: true,
        data: formattedResults,
        count: formattedResults.length
      });
    } catch (error) {
      console.error('❌ Erreur dans search avis de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche',
        error: error.message
      });
    }
  }

  /**
   * Vérifier si un numéro AP existe déjà
   */
  static async checkNumAp(req, res) {
    console.log('🔍 GET /api/avis-de-paiement/check-num-ap/:num_ap');
    console.log('🔍 Numéro AP à vérifier:', req.params.num_ap);
    
    try {
      const { num_ap } = req.params;
      
      if (!num_ap) {
        return res.status(400).json({
          success: false,
          message: 'Le numéro AP est requis'
        });
      }
      
      const exists = await AvisDePaiement.findByNumAp(num_ap);
      
      res.json({
        success: true,
        exists: !!exists,
        data: exists || null
      });
    } catch (error) {
      console.error('❌ Erreur dans checkNumAp:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification du numéro AP',
        error: error.message
      });
    }
  }

  /**
   * Récupérer les avis par FT ID
   */
  static async getByFtId(req, res) {
    console.log('📋 GET /api/avis-de-paiement/ft/:idft');
    console.log('📋 FT ID:', req.params.idft);
    
    try {
      const { idft } = req.params;
      
      if (!idft || isNaN(idft)) {
        return res.status(400).json({
          success: false,
          message: 'Un ID FT valide est requis'
        });
      }
      
      const avisList = await AvisDePaiement.findByFtId(parseInt(idft, 10));
      
      console.log('✅ Nombre d\'avis trouvés pour FT ID', idft, ':', avisList.length);
      
      res.json({
        success: true,
        data: avisList,
        count: avisList.length
      });
    } catch (error) {
      console.error('❌ Erreur dans getByFtId:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des avis pour ce FT',
        error: error.message
      });
    }
  }

  /**
   * Récupérer les avis par Descente ID
   */
  static async getByDescenteId(req, res) {
    console.log('📋 GET /api/avis-de-paiement/descente/:iddescente');
    console.log('📋 Descente ID:', req.params.iddescente);
    
    try {
      const { iddescente } = req.params;
      
      if (!iddescente || isNaN(iddescente)) {
        return res.status(400).json({
          success: false,
          message: 'Un ID descente valide est requis'
        });
      }
      
      const avisList = await AvisDePaiement.findByDescenteId(parseInt(iddescente, 10));
      
      console.log('✅ Nombre d\'avis trouvés pour Descente ID', iddescente, ':', avisList.length);
      
      res.json({
        success: true,
        data: avisList,
        count: avisList.length
      });
    } catch (error) {
      console.error('❌ Erreur dans getByDescenteId:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des avis pour cette descente',
        error: error.message
      });
    }
  }
}

module.exports = AvisDePaiementController;