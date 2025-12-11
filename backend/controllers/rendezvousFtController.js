// controllers/rendezvousFtController.js
const RendezvousFt = require('../models/RendezvousFt');
const db = require('../config/db');

// Variable pour suivre l'état de la vérification
let checkInterval = null;
let isChecking = false;

// Fonction pour vérifier et mettre à jour automatiquement les statuts
const checkAndUpdateRendezvousStatus = async () => {
  // Éviter les exécutions concurrentes
  if (isChecking) {
    console.log('⏸️ Vérification déjà en cours, skip...');
    return 0;
  }

  try {
    isChecking = true;
    console.log('🔄 Début de la vérification automatique des statuts...');
    
    let updatedCount = 0;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    // 1. Récupérer tous les rendez-vous "En attente" dont la date est passée
    const pendingResult = await db.query(`
      SELECT id, date_rendez_vous, heure_rendez_vous 
      FROM rendezvousft 
      WHERE LOWER(statut) = 'en attente'
      ORDER BY date_rendez_vous, heure_rendez_vous
    `);

    const updates = [];

    // Pour chaque rendez-vous "En attente" à vérifier
    for (const rdv of pendingResult.rows) {
      const rdvDate = rdv.date_rendez_vous ? rdv.date_rendez_vous.toISOString().split('T')[0] : null;
      const rdvTime = rdv.heure_rendez_vous ? rdv.heure_rendez_vous.substring(0, 5) : '00:00';
      
      if (!rdvDate) continue;
      
      // Si la date est aujourd'hui et que l'heure est passée, ou si la date est antérieure
      if (rdvDate < today || (rdvDate === today && rdvTime <= currentTime)) {
        updates.push({ 
          id: rdv.id, 
          newStatus: 'En cours',
          reason: `Date/heure dépassée (${rdvDate} ${rdvTime})`,
          type: 'pending_to_ongoing'
        });
      }
    }

    // 2. Récupérer tous les rendez-vous "En cours" qui datent de plus de 3 jours
    const ongoingResult = await db.query(`
      SELECT id, date_rendez_vous, updated_at
      FROM rendezvousft 
      WHERE LOWER(statut) = 'en cours'
      ORDER BY date_rendez_vous
    `);

    // Pour chaque rendez-vous "En cours" à vérifier
    for (const rdv of ongoingResult.rows) {
      const rdvDate = rdv.date_rendez_vous ? new Date(rdv.date_rendez_vous) : null;
      
      if (!rdvDate) continue;
      
      // Calculer la différence en jours entre aujourd'hui et la date du rendez-vous
      const diffTime = now - rdvDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Si plus de 3 jours se sont écoulés depuis la date du rendez-vous
      if (diffDays > 3) {
        updates.push({ 
          id: rdv.id, 
          newStatus: 'Non-comparution',
          reason: `Plus de 3 jours écoulés depuis le rendez-vous (${diffDays} jours)`,
          type: 'ongoing_to_non_comparution',
          daysElapsed: diffDays
        });
      }
    }

    // 3. Vérifier par rapport à la date de dernière mise à jour (alternative)
    const ongoingUpdatedResult = await db.query(`
      SELECT id, date_rendez_vous, updated_at
      FROM rendezvousft 
      WHERE LOWER(statut) = 'en cours' AND updated_at IS NOT NULL
      ORDER BY updated_at
    `);

    for (const rdv of ongoingUpdatedResult.rows) {
      const updatedAt = rdv.updated_at ? new Date(rdv.updated_at) : null;
      
      if (!updatedAt) continue;
      
      // Calculer la différence en jours entre aujourd'hui et la dernière mise à jour
      const diffTime = now - updatedAt;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Si le statut n'a pas été modifié depuis plus de 3 jours
      if (diffDays >= 3) {
        // Vérifier si ce rendez-vous n'a pas déjà été ajouté à la liste
        const existingUpdate = updates.find(u => u.id === rdv.id);
        if (!existingUpdate) {
          updates.push({ 
            id: rdv.id, 
            newStatus: 'Non-comparution',
            reason: `Statut inchangé depuis ${diffDays} jours`,
            type: 'stale_to_non_comparution',
            daysElapsed: diffDays
          });
        }
      }
    }

    // Exécuter toutes les mises à jour en une seule transaction
    if (updates.length > 0) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const update of updates) {
          await client.query(
            'UPDATE rendezvousft SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [update.newStatus, update.id]
          );
          
          const action = update.type === 'pending_to_ongoing' ? 'En attente → En cours' :
                        update.type === 'ongoing_to_non_comparution' ? 'En cours → Non-comparution' :
                        'En cours → Non-comparution (stalé)';
          
          console.log(`↪️ RDV-${update.id} mis à jour: ${action} (${update.reason})`);
          updatedCount++;
        }
        
        await client.query('COMMIT');
        console.log(`✅ ${updatedCount} rendez-vous mis à jour automatiquement`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      console.log('ℹ️ Aucun rendez-vous à mettre à jour');
    }

    return updatedCount;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification automatique des statuts:', error);
    throw error;
  } finally {
    isChecking = false;
  }
};

// Initialiser le système de vérification
const initStatusChecker = () => {
  // Nettoyer l'intervalle existant s'il y en a un
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  // Définir l'intervalle de vérification (30 minutes)
  checkInterval = setInterval(async () => {
    try {
      await checkAndUpdateRendezvousStatus();
    } catch (error) {
      console.error('❌ Erreur dans l\'intervalle de vérification:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Déclencher la première vérification après 10 secondes
  setTimeout(async () => {
    console.log('🚀 Initialisation de la vérification automatique des statuts...');
    try {
      await checkAndUpdateRendezvousStatus();
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }, 10000);

  console.log('✅ Système de vérification automatique initialisé');
};

// Démarrer le système au chargement du module
initStatusChecker();

// Fonction pour arrêter la vérification (utile pour les tests)
const stopStatusChecker = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('⏹️ Vérification automatique arrêtée');
  }
};

// Fonction pour redémarrer la vérification
const restartStatusChecker = () => {
  stopStatusChecker();
  initStatusChecker();
};

// Fonction spécifique pour vérifier les rendez-vous "En cours" > 3 jours
const checkOverdueOngoingRendezvous = async () => {
  try {
    console.log('📅 Vérification des rendez-vous "En cours" depuis plus de 3 jours...');
    
    const result = await db.query(`
      SELECT id, date_rendez_vous, heure_rendez_vous, updated_at
      FROM rendezvousft 
      WHERE LOWER(statut) = 'en cours'
      ORDER BY date_rendez_vous
    `);

    const now = new Date();
    const overdueRendezvous = [];

    for (const rdv of result.rows) {
      const rdvDate = rdv.date_rendez_vous ? new Date(rdv.date_rendez_vous) : null;
      
      if (!rdvDate) continue;
      
      // Calculer la différence en jours
      const diffTime = now - rdvDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 3) {
        overdueRendezvous.push({
          id: rdv.id,
          date_rendez_vous: rdvDate.toISOString().split('T')[0],
          heure_rendez_vous: rdv.heure_rendez_vous,
          daysElapsed: diffDays,
          updated_at: rdv.updated_at
        });
      }
    }

    if (overdueRendezvous.length > 0) {
      console.log(`⚠️ ${overdueRendezvous.length} rendez-vous "En cours" depuis plus de 3 jours:`);
      overdueRendezvous.forEach(rdv => {
        console.log(`   RDV-${rdv.id}: ${rdv.daysElapsed} jours depuis le ${rdv.date_rendez_vous}`);
      });
    }

    return {
      count: overdueRendezvous.length,
      rendezvous: overdueRendezvous
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des rendez-vous en retard:', error);
    throw error;
  }
};

// @desc    Get all rendezvous
// @route   GET /api/rendezvousft
// @access  Public
exports.getAllRendezvous = async (req, res) => {
  try {
    console.log('Tentative de récupération de tous les rendez-vous...');
    const rendezvous = await RendezvousFt.findAll();
    console.log(`✅ ${rendezvous.length} rendez-vous récupérés`);
    
    // Formater les dates pour l'affichage
    const formattedRendezvous = rendezvous.map(rdv => ({
      ...rdv,
      date_descente: rdv.date_descente ? new Date(rdv.date_descente).toISOString().split('T')[0] : null,
      date_rendez_vous: rdv.date_rendez_vous ? new Date(rdv.date_rendez_vous).toISOString().split('T')[0] : null,
      heure_descente: rdv.heure_descente ? rdv.heure_descente.substring(0, 5) : null,
      heure_rendez_vous: rdv.heure_rendez_vous ? rdv.heure_rendez_vous.substring(0, 5) : null,
      created_at: rdv.created_at ? new Date(rdv.created_at).toLocaleString('fr-FR') : null,
      updated_at: rdv.updated_at ? new Date(rdv.updated_at).toLocaleString('fr-FR') : null
    }));

    res.status(200).json(formattedRendezvous);
  } catch (error) {
    console.error('❌ Error getting rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Get single rendezvous
// @route   GET /api/rendezvousft/:id
// @access  Public
exports.getRendezvousById = async (req, res) => {
  try {
    console.log(`Tentative de récupération du rendez-vous ID: ${req.params.id}`);
    const rendezvous = await RendezvousFt.findById(req.params.id);
    
    if (!rendezvous) {
      console.log(`❌ Rendez-vous ${req.params.id} non trouvé`);
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    console.log(`✅ Rendez-vous ${req.params.id} récupéré`);
    
    // Formater les dates
    const formattedRendezvous = {
      ...rendezvous,
      date_descente: rendezvous.date_descente ? new Date(rendezvous.date_descente).toISOString().split('T')[0] : null,
      date_rendez_vous: rendezvous.date_rendez_vous ? new Date(rendezvous.date_rendez_vous).toISOString().split('T')[0] : null,
      heure_descente: rendezvous.heure_descente ? rendezvous.heure_descente.substring(0, 5) : null,
      heure_rendez_vous: rendezvous.heure_rendez_vous ? rendezvous.heure_rendez_vous.substring(0, 5) : null
    };

    res.status(200).json(formattedRendezvous);
  } catch (error) {
    console.error('❌ Error getting rendezvous by ID:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Get rendezvous by descente id
// @route   GET /api/rendezvousft/descente/:idDescente
// @access  Public
exports.getRendezvousByDescenteId = async (req, res) => {
  try {
    const rendezvous = await RendezvousFt.findByDescenteId(req.params.idDescente);
    res.status(200).json(rendezvous);
  } catch (error) {
    console.error('Error getting rendezvous by descente:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Create new rendezvous
// @route   POST /api/rendezvousft
// @access  Public
exports.createRendezvous = async (req, res) => {
  try {
    console.log('Tentative de création d\'un nouveau rendez-vous:', req.body);
    
    // Validation des données requises
    const requiredFields = ['iddescente', 'date_rendez_vous', 'heure_rendez_vous'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log(`❌ Champ requis manquant: ${field}`);
        return res.status(400).json({ error: `Le champ ${field} est requis` });
      }
    }

    // Vérifier si la date est dans le passé
    const rdvDate = new Date(req.body.date_rendez_vous);
    const now = new Date();
    
    // Comparer les dates sans l'heure
    const rdvDateOnly = new Date(rdvDate.getFullYear(), rdvDate.getMonth(), rdvDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Déterminer le statut initial
    let initialStatus = req.body.statut || 'En attente';
    
    // Si la date est dans le passé, définir le statut comme "En cours"
    if (rdvDateOnly < nowDateOnly) {
      initialStatus = 'En cours';
      console.log('⚠️ Date passée détectée, statut automatiquement défini à "En cours"');
    } else if (rdvDateOnly.getTime() === nowDateOnly.getTime()) {
      // Si c'est aujourd'hui, vérifier l'heure
      const rdvTime = req.body.heure_rendez_vous;
      const currentTime = now.toTimeString().substring(0, 5);
      
      if (rdvTime && rdvTime <= currentTime) {
        initialStatus = 'En cours';
        console.log('⚠️ Heure passée détectée aujourd\'hui, statut automatiquement défini à "En cours"');
      }
    }

    // Ajouter le statut déterminé
    const rendezvousData = {
      ...req.body,
      statut: initialStatus
    };

    const newRendezvous = await RendezvousFt.create(rendezvousData);
    console.log('✅ Rendez-vous créé:', newRendezvous);
    
    res.status(201).json({
      success: true,
      message: 'Rendez-vous créé avec succès',
      data: newRendezvous
    });
  } catch (error) {
    console.error('❌ Error creating rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Update rendezvous
// @route   PUT /api/rendezvousft/:id
// @access  Public
exports.updateRendezvous = async (req, res) => {
  try {
    console.log(`Tentative de mise à jour du rendez-vous ID: ${req.params.id}`, req.body);
    const updatedRendezvous = await RendezvousFt.update(req.params.id, req.body);
    
    if (!updatedRendezvous) {
      console.log(`❌ Rendez-vous ${req.params.id} non trouvé pour mise à jour`);
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    console.log('✅ Rendez-vous mis à jour:', updatedRendezvous);

    res.status(200).json({
      success: true,
      message: 'Rendez-vous mis à jour avec succès',
      data: updatedRendezvous
    });
  } catch (error) {
    console.error('❌ Error updating rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Update rendezvous status
// @route   PATCH /api/rendezvousft/:id/statut
// @access  Public
exports.updateRendezvousStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    
    if (!statut) {
      return res.status(400).json({ error: 'Le statut est requis' });
    }

    // Mettre à jour la liste des statuts autorisés
    const allowedStatus = ['en attente', 'en cours', 'non-comparution', 'fini'];
    
    // Vérifier si le statut est valide (insensible à la casse)
    const normalizedStatut = statut.toLowerCase();
    const isValidStatus = allowedStatus.some(status => 
      status.toLowerCase() === normalizedStatut
    );
    
    if (!isValidStatus) {
      return res.status(400).json({ 
        error: 'Statut invalide', 
        allowedStatus: allowedStatus.map(s => s.charAt(0).toUpperCase() + s.slice(1))
      });
    }

    const updatedRendezvous = await RendezvousFt.updateStatut(req.params.id, statut);
    
    if (!updatedRendezvous) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    res.status(200).json({
      success: true,
      message: `Statut mis à jour: ${statut}`,
      data: updatedRendezvous
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut',
      details: error.message 
    });
  }
};

// @desc    Delete rendezvous
// @route   DELETE /api/rendezvousft/:id
// @access  Public
exports.deleteRendezvous = async (req, res) => {
  try {
    console.log(`Tentative de suppression du rendez-vous ID: ${req.params.id}`);
    const deletedRendezvous = await RendezvousFt.delete(req.params.id);
    
    if (!deletedRendezvous) {
      console.log(`❌ Rendez-vous ${req.params.id} non trouvé pour suppression`);
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    console.log('✅ Rendez-vous supprimé:', deletedRendezvous);

    res.status(200).json({
      success: true,
      message: 'Rendez-vous supprimé avec succès',
      data: deletedRendezvous
    });
  } catch (error) {
    console.error('❌ Error deleting rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Get today's rendezvous
// @route   GET /api/rendezvousft/today
// @access  Public
exports.getTodayRendezvous = async (req, res) => {
  try {
    const todayRendezvous = await RendezvousFt.getTodayRendezvous();
    
    // Formater les heures
    const formattedRendezvous = todayRendezvous.map(rdv => ({
      ...rdv,
      heure_rendez_vous: rdv.heure_rendez_vous ? rdv.heure_rendez_vous.substring(0, 5) : null
    }));

    res.status(200).json(formattedRendezvous);
  } catch (error) {
    console.error('Error getting today\'s rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des rendez-vous du jour',
      details: error.message 
    });
  }
};

// @desc    Get upcoming rendezvous
// @route   GET /api/rendezvousft/upcoming
// @access  Public
exports.getUpcomingRendezvous = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const upcomingRendezvous = await RendezvousFt.getUpcomingRendezvous(days);
    
    res.status(200).json(upcomingRendezvous);
  } catch (error) {
    console.error('Error getting upcoming rendezvous:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des prochains rendez-vous',
      details: error.message 
    });
  }
};

// @desc    Get rendezvous statistics
// @route   GET /api/rendezvousft/stats
// @access  Public
exports.getRendezvousStats = async (req, res) => {
  try {
    const stats = await RendezvousFt.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message 
    });
  }
};

// @desc    Déclencher manuellement la vérification des statuts
// @route   GET /api/rendezvousft/check-status
// @access  Public
exports.checkAndUpdateStatus = async (req, res) => {
  try {
    console.log('🔄 Vérification manuelle des statuts demandée...');
    const updatedCount = await checkAndUpdateRendezvousStatus();
    
    res.status(200).json({
      success: true,
      message: `Vérification terminée. ${updatedCount} rendez-vous mis à jour.`,
      updatedCount,
      timestamp: new Date().toISOString(),
      details: 'Les rendez-vous "En cours" depuis plus de 3 jours ont été marqués comme "Non-comparution"'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification manuelle:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification des statuts',
      details: error.message 
    });
  }
};

// @desc    Vérifier un rendez-vous spécifique avec la règle des 3 jours
// @route   GET /api/rendezvousft/:id/check
// @access  Public
exports.checkSingleRendezvousStatus = async (req, res) => {
  try {
    console.log(`🔄 Vérification du statut pour le rendez-vous ID: ${req.params.id}`);
    
    // Récupérer le rendez-vous
    const rdv = await RendezvousFt.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);
    
    const rdvDate = rdv.date_rendez_vous ? new Date(rdv.date_rendez_vous).toISOString().split('T')[0] : null;
    const rdvTime = rdv.heure_rendez_vous ? rdv.heure_rendez_vous.substring(0, 5) : '00:00';
    
    let shouldUpdate = false;
    let newStatus = rdv.statut;
    let reason = '';
    
    // Vérifier si le rendez-vous doit être mis à jour
    const normalizedStatus = rdv.statut ? rdv.statut.toLowerCase() : '';
    
    if (normalizedStatus === 'en attente' && rdvDate) {
      if (rdvDate < today || (rdvDate === today && rdvTime <= currentTime)) {
        shouldUpdate = true;
        newStatus = 'En cours';
        reason = 'Date/heure du rendez-vous dépassée';
      }
    } else if (normalizedStatus === 'en cours' && rdv.date_rendez_vous) {
      // Calculer la différence en jours
      const rdvDateObj = new Date(rdv.date_rendez_vous);
      const diffTime = now - rdvDateObj;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 3) {
        shouldUpdate = true;
        newStatus = 'Non-comparution';
        reason = `Rendez-vous "En cours" depuis plus de 3 jours (${diffDays} jours écoulés)`;
      }
    }
    
    if (shouldUpdate) {
      // Mettre à jour le statut
      const updatedRendezvous = await RendezvousFt.updateStatut(req.params.id, newStatus);
      
      res.status(200).json({
        success: true,
        message: `Statut mis à jour: ${rdv.statut} → ${newStatus}`,
        reason: reason,
        updated: true,
        oldStatus: rdv.statut,
        newStatus: newStatus,
        daysElapsed: normalizedStatus === 'en cours' ? Math.floor((now - new Date(rdv.date_rendez_vous)) / (1000 * 60 * 60 * 24)) : null,
        data: updatedRendezvous
      });
    } else {
      let noUpdateReason = '';
      if (normalizedStatus !== 'en attente' && normalizedStatus !== 'en cours') {
        noUpdateReason = 'Statut déjà mis à jour';
      } else if (normalizedStatus === 'en attente' && rdvDate && rdvDate > today) {
        noUpdateReason = 'Date future';
      } else if (normalizedStatus === 'en attente' && rdvDate === today && rdvTime && rdvTime > currentTime) {
        noUpdateReason = 'Heure future aujourd\'hui';
      } else if (normalizedStatus === 'en cours' && rdv.date_rendez_vous) {
        const rdvDateObj = new Date(rdv.date_rendez_vous);
        const diffDays = Math.floor((now - rdvDateObj) / (1000 * 60 * 60 * 24));
        noUpdateReason = `Rendez-vous encore "En cours" (${diffDays} jours écoulés, seuil: 3 jours)`;
      } else {
        noUpdateReason = 'Condition non remplie';
      }
      
      res.status(200).json({
        success: true,
        message: 'Aucune mise à jour nécessaire',
        updated: false,
        currentStatus: rdv.statut,
        reason: noUpdateReason,
        daysElapsed: normalizedStatus === 'en cours' && rdv.date_rendez_vous ? 
          Math.floor((now - new Date(rdv.date_rendez_vous)) / (1000 * 60 * 60 * 24)) : null
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du rendez-vous:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification du statut',
      details: error.message 
    });
  }
};

// @desc    Vérifier spécifiquement les rendez-vous "En cours" > 3 jours
// @route   GET /api/rendezvousft/check-overdue
// @access  Public
exports.checkOverdueRendezvous = async (req, res) => {
  try {
    console.log('📅 Vérification spécifique des rendez-vous "En cours" en retard...');
    
    const result = await checkOverdueOngoingRendezvous();
    
    // Optionnel: Mettre à jour automatiquement les rendez-vous en retard
    let updatedCount = 0;
    if (req.query.autoUpdate === 'true' && result.count > 0) {
      console.log('🔄 Mise à jour automatique des rendez-vous en retard...');
      
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const rdv of result.rendezvous) {
          await client.query(
            'UPDATE rendezvousft SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['Non-comparution', rdv.id]
          );
          console.log(`   ✓ RDV-${rdv.id} mis à jour: Non-comparution (${rdv.daysElapsed} jours)`);
          updatedCount++;
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    res.status(200).json({
      success: true,
      message: result.count > 0 
        ? `${result.count} rendez-vous "En cours" depuis plus de 3 jours trouvés` 
        : 'Aucun rendez-vous "En cours" depuis plus de 3 jours',
      overdueCount: result.count,
      updatedCount: updatedCount,
      rendezvous: result.rendezvous,
      autoUpdated: req.query.autoUpdate === 'true',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des rendez-vous en retard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification des rendez-vous en retard',
      details: error.message 
    });
  }
};

// @desc    Obtenir les statistiques détaillées des statuts
// @route   GET /api/rendezvousft/detailed-stats
// @access  Public
exports.getDetailedStats = async (req, res) => {
  try {
    // Statistiques par statut
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(statut) = 'en attente' THEN 1 END) as en_attente,
        COUNT(CASE WHEN LOWER(statut) = 'en cours' THEN 1 END) as en_cours,
        COUNT(CASE WHEN LOWER(statut) = 'non-comparution' THEN 1 END) as non_comparution,
        COUNT(CASE WHEN LOWER(statut) = 'fini' THEN 1 END) as fini
      FROM rendezvousft
    `);

    // Rendez-vous "En cours" qui approchent du seuil de 3 jours
    const nearingThresholdResult = await db.query(`
      SELECT id, date_rendez_vous, updated_at
      FROM rendezvousft 
      WHERE LOWER(statut) = 'en cours'
      AND date_rendez_vous <= CURRENT_DATE - INTERVAL '2 days'
      AND date_rendez_vous > CURRENT_DATE - INTERVAL '3 days'
      ORDER BY date_rendez_vous
    `);

    const stats = {
      ...statsResult.rows[0],
      en_cours_nearing_threshold: nearingThresholdResult.rows.length,
      last_auto_check: new Date().toISOString(),
      check_interval_minutes: 30,
      overdue_threshold_days: 3
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting detailed stats:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques détaillées',
      details: error.message 
    });
  }
};

// @desc    Gérer le système de vérification automatique
// @route   POST /api/rendezvousft/checker/restart
// @access  Public
exports.restartChecker = async (req, res) => {
  try {
    restartStatusChecker();
    res.status(200).json({
      success: true,
      message: 'Vérification automatique redémarrée',
      timestamp: new Date().toISOString(),
      check_interval_minutes: 30,
      overdue_threshold_days: 3
    });
  } catch (error) {
    console.error('❌ Erreur lors du redémarrage:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du redémarrage',
      details: error.message 
    });
  }
};

// @desc    Arrêter le système de vérification automatique
// @route   POST /api/rendezvousft/checker/stop
// @access  Public
exports.stopChecker = async (req, res) => {
  try {
    stopStatusChecker();
    res.status(200).json({
      success: true,
      message: 'Vérification automatique arrêtée',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'arrêt',
      details: error.message 
    });
  }
};

// @desc    Obtenir l'état du système de vérification
// @route   GET /api/rendezvousft/checker/status
// @access  Public
exports.getCheckerStatus = async (req, res) => {
  try {
    const isActive = checkInterval !== null;
    
    res.status(200).json({
      success: true,
      isActive: isActive,
      isChecking: isChecking,
      check_interval_minutes: 30,
      overdue_threshold_days: 3,
      last_check: isChecking ? 'En cours...' : 'Non disponible',
      next_check_estimated: isActive ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'état:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération de l\'état',
      details: error.message 
    });
  }
};

// Exporter les fonctions pour une utilisation externe
exports.checkAndUpdateRendezvousStatus = checkAndUpdateRendezvousStatus;
exports.checkOverdueOngoingRendezvous = checkOverdueOngoingRendezvous;
exports.stopStatusChecker = stopStatusChecker;
exports.restartStatusChecker = restartStatusChecker;