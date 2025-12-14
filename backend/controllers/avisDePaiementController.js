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
    
    // DEBUG: Vérifiez si le statut est présent dans les données
    console.log('🔍 DEBUG - Premier avis reçu:', {
      id: avisList[0]?.id,
      num_ap: avisList[0]?.num_ap,
      statut: avisList[0]?.statut,
      hasStatut: 'statut' in (avisList[0] || {}),
      allKeys: avisList[0] ? Object.keys(avisList[0]) : []
    });
    
    // Formater les données pour le front-end
    const formattedList = avisList.map(avis => {
      // Fallback si statut manquant
      const statut = avis.statut || 'En attente';
      
      return {
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
        statut: statut, // <-- AJOUTEZ CECI !
        created_at: avis.created_at,
        updated_at: avis.updated_at,
        // Incluez aussi les données jointes si elles existent
        reference_ft: avis.reference_ft,
        date_ft: avis.date_ft,
        nom_convoquee: avis.nom_convoquee,
        cin: avis.cin,
        nom_personne_r: avis.nom_personne_r,
        commune: avis.commune,
        fokontany: avis.fokontany
      };
    });
    
    // DEBUG: Vérifiez le résultat formaté
    console.log('🔍 DEBUG - Premier avis formaté:', {
      id: formattedList[0]?.id,
      statut: formattedList[0]?.statut
    });
    
    res.json({
      success: true,
      data: formattedList,
      count: formattedList.length,
      metadata: {
        total: formattedList.length,
        montant_total: formattedList.reduce((sum, avis) => sum + parseFloat(avis.montant || 0), 0)
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
 * Mettre à jour le statut d'un avis de paiement
 */
static async updateStatus(req, res) {
  console.log('🔄 PATCH /api/avis-de-paiement/:id');
  console.log('🔄 ID à mettre à jour:', req.params.id);
  console.log('🔄 Données de mise à jour:', req.body);
  
  try {
    const { id } = req.params;
    const { statut } = req.body;
    
    console.log('🔄 Mise à jour statut avis ID:', id);
    console.log('🔄 Nouveau statut:', statut);
    
    // Validation du statut
    const validStatuts = ['En attente', 'Payé', 'Annulé', 'En cours', 'Retard'];
    if (!statut || !validStatuts.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        validStatuts: validStatuts
      });
    }
    
    // Mettre à jour uniquement le statut
    const updateData = { statut };
    
    // Appeler la méthode update du modèle avec seulement le statut
    const updatedAvis = await AvisDePaiement.updateStatusOnly(id, updateData);
    
    if (!updatedAvis) {
      console.log('❌ Avis non trouvé pour mise à jour statut ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Avis de paiement non trouvé'
      });
    }
    
    console.log('✅ Statut avis mis à jour:', updatedAvis.id, '-', updatedAvis.num_ap, '- Nouveau statut:', updatedAvis.statut);
    
    res.json({
      success: true,
      message: 'Statut de l\'avis de paiement mis à jour avec succès',
      data: updatedAvis
    });
  } catch (error) {
    console.error('❌ Erreur dans updateStatus avis de paiement:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
}

/**
 * Envoyer une mise en demeure et mettre à jour la date de paiement
 */
static async sendMiseEnDemeure(req, res) {
  console.log('📧 POST /api/avis-de-paiement/:id/mise-en-demeure');
  console.log('📧 ID avis:', req.params.id);
  console.log('📧 Données de mise en demeure:', req.body);
  
  try {
    const { id } = req.params;
    const { nouvelle_date_paiement } = req.body;
    
    console.log('📧 Mise en demeure pour avis ID:', id);
    console.log('📧 Nouvelle date de paiement:', nouvelle_date_paiement);
    
    // Validation des données
    if (!nouvelle_date_paiement) {
      return res.status(400).json({
        success: false,
        message: 'La nouvelle date de paiement est requise'
      });
    }
    
    // Vérifier que la date est valide et dans le futur
    const nouvelleDate = new Date(nouvelle_date_paiement);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    
    if (isNaN(nouvelleDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Date de paiement invalide'
      });
    }
    
    // Réinitialiser les heures pour comparer seulement les dates
    const dateCompare = new Date(nouvelleDate);
    dateCompare.setHours(0, 0, 0, 0);
    
    if (dateCompare <= aujourdHui) {
      return res.status(400).json({
        success: false,
        message: 'La nouvelle date de paiement doit être dans le futur'
      });
    }
    
    // Récupérer l'avis
    const avis = await AvisDePaiement.findById(id);
    
    if (!avis) {
      console.log('❌ Avis non trouvé pour mise en demeure ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Avis de paiement non trouvé'
      });
    }
    
    // Vérifier que l'avis est en retard (logique côté serveur)
    const estEnRetard = await AvisDePaiement.checkIfEnRetard(id);
    
    if (!estEnRetard) {
      return res.status(400).json({
        success: false,
        message: 'La mise en demeure ne peut être envoyée que pour les avis en retard'
      });
    }
    
    // Envoyer la mise en demeure (simulation - à adapter selon votre système d'email)
    // Ici, nous allons juste logger l'action
    const miseEnDemeureData = {
      avis_id: id,
      num_ap: avis.num_ap,
      beneficiaire: avis.nom_convoquee || avis.nom_personne_r,
      montant: avis.montant,
      ancienne_date: avis.fin_premier_paiement,
      nouvelle_date: nouvelle_date_paiement,
      date_envoi: new Date().toISOString()
    };
    
    console.log('📧 Envoi mise en demeure:', miseEnDemeureData);
    
    // Mettre à jour l'avis avec la nouvelle date et changer le statut à "En attente"
    const updateData = {
      fin_premier_paiement: nouvelle_date_paiement,
      statut: 'En attente' // Changer le statut à "En attente"
    };
    
    const updatedAvis = await AvisDePaiement.update(id, updateData);
    
    if (!updatedAvis) {
      throw new Error('Échec de la mise à jour de l\'avis');
    }
    
    console.log('✅ Mise en demeure envoyée et avis mis à jour:', updatedAvis.id, '- Nouveau statut:', updatedAvis.statut);
    
    // Simuler l'envoi d'email (à implémenter avec votre système d'email)
    // await this.sendMiseEnDemeureEmail(avis, nouvelle_date_paiement);
    
    res.json({
      success: true,
      message: 'Mise en demeure envoyée avec succès et statut mis à jour en "En attente"',
      data: {
        avis: updatedAvis,
        mise_en_demeure: {
          envoyee_le: new Date().toISOString(),
          nouvelle_date_paiement: nouvelle_date_paiement,
          statut: 'En attente'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur dans sendMiseEnDemeure:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la mise en demeure',
      error: error.message
    });
  }
}

/**
 * Vérifier si un avis est en retard
 * @param {number} id - ID de l'avis
 * @returns {Promise<boolean>}
 */
static async checkIfEnRetard(id) {
  try {
    const avis = await AvisDePaiement.findById(id);
    
    if (!avis) {
      return false;
    }
    
    // Si l'avis est déjà payé ou annulé, il n'est pas en retard
    if (avis.statut === 'Payé' || avis.statut === 'Annulé') {
      return false;
    }
    
    // Si pas de date de premier paiement, on ne peut pas déterminer
    if (!avis.fin_premier_paiement) {
      return false;
    }
    
    // Vérifier si la date est dépassée
    const datePaiement = new Date(avis.fin_premier_paiement);
    const aujourdHui = new Date();
    
    // Réinitialiser les heures pour comparer seulement les dates
    datePaiement.setHours(0, 0, 0, 0);
    aujourdHui.setHours(0, 0, 0, 0);
    
    return datePaiement < aujourdHui;
  } catch (error) {
    console.error('❌ Erreur dans checkIfEnRetard:', error);
    throw error;
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

  // Dans la classe AvisDePaiementController, ajoutez :

/**
 * Récupérer les avis par statut
 */
static async getByStatut(req, res) {
  console.log('📊 GET /api/avis-de-paiement/statut/:statut');
  console.log('📊 Statut demandé:', req.params.statut);
  console.log('📊 Query params:', req.query);
  
  try {
    const { statut } = req.params;
    const filters = req.query;
    
    // Validation du statut
    const validStatuts = ['En attente', 'Payé', 'Annulé'];
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        validStatuts: validStatuts
      });
    }
    
    // Récupérer les avis par statut
    const avisList = await AvisDePaiement.findByStatut(statut, filters);
    
    console.log(`✅ Nombre d'avis avec statut "${statut}":`, avisList.length);
    
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
      statut: avis.statut,
      created_at: avis.created_at,
      updated_at: avis.updated_at,
      // Données liées
      ft: avis.ft,
      descente: avis.descente
    }));
    
    res.json({
      success: true,
      data: formattedList,
      count: formattedList.length,
      statut: statut,
      metadata: {
        montant_total: formattedList.reduce((sum, avis) => sum + (avis.montant || 0), 0),
        moyenne_montant: formattedList.length > 0 
          ? formattedList.reduce((sum, avis) => sum + (avis.montant || 0), 0) / formattedList.length 
          : 0
      }
    });
  } catch (error) {
    console.error('❌ Erreur dans getByStatut avis de paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des avis par statut',
      error: error.message
    });
  }
}

/**
 * Récupérer les compteurs par statut
 */
static async getStatutCounts(req, res) {
  console.log('📊 GET /api/avis-de-paiement/stats/statuts');
  
  try {
    console.log('📊 Calcul des compteurs par statut...');
    const statutCounts = await AvisDePaiement.getStatutCounts();
    
    console.log('📊 Compteurs par statut:', statutCounts);
    
    // Formater les résultats
    const formattedStats = statutCounts.map(item => ({
      statut: item.statut,
      count: parseInt(item.count),
      total_montant: parseFloat(item.total_montant) || 0
    }));
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('❌ Erreur dans getStatutCounts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des compteurs par statut',
      error: error.message
    });
  }
}
/**
 * Récupérer les avis par statut calculé
 */
static async getByStatutCalcule(req, res) {
  console.log('📊 GET /api/avis-de-paiement/statut-calcule/:statut');
  console.log('📊 Statut demandé:', req.params.statut);
  console.log('📊 Query params:', req.query);
  
  try {
    const { statut } = req.params;
    const filters = req.query;
    filters.statut_calcule = statut;
    
    // Validation du statut
    const validStatuts = ['En attente', 'Payé', 'En retard', 'Annulé', 'tous'];
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        validStatuts: validStatuts.filter(s => s !== 'tous')
      });
    }
    
    // Récupérer les avis par statut calculé
    const avisList = await AvisDePaiement.findAllWithCalculatedStatus(filters);
    
    console.log(`✅ Nombre d'avis avec statut calculé "${statut}":`, avisList.length);
    
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
      statut: avis.statut, // Statut original de la base
      statut_calcule: avis.statut_calcule, // Statut calculé
      created_at: avis.created_at,
      updated_at: avis.updated_at,
      // Données liées
      reference_ft: avis.reference_ft,
      date_ft: avis.date_ft,
      nom_convoquee: avis.nom_convoquee,
      cin: avis.cin,
      nom_personne_r: avis.nom_personne_r,
      commune: avis.commune,
      fokontany: avis.fokontany
    }));
    
    res.json({
      success: true,
      data: formattedList,
      count: formattedList.length,
      statut: statut,
      metadata: {
        montant_total: formattedList.reduce((sum, avis) => sum + (avis.montant || 0), 0),
        moyenne_montant: formattedList.length > 0 
          ? formattedList.reduce((sum, avis) => sum + (avis.montant || 0), 0) / formattedList.length 
          : 0
      }
    });
  } catch (error) {
    console.error('❌ Erreur dans getByStatutCalcule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des avis par statut',
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