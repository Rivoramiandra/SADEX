// models/AvisDePaiement.js
const db = require('../config/db');

class AvisDePaiement {
  /**
   * Créer un nouvel avis de paiement avec transaction
   * @param {Object} avisData - Les données de l'avis de paiement
   * @returns {Promise<Object>} - Le résultat de l'opération
   */
  static async createWithTransaction(avisData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      console.log('🔍 Début transaction pour avis de paiement');
      console.log('📋 Données reçues:', avisData);

      // 1. Vérifier si la descente existe - AVEC GUILLEMETS
      const descenteCheck = await client.query(
        'SELECT id FROM "Descentes" WHERE id = $1', // <-- GUILLEMETS ESSENTIELS
        [avisData.iddescente]
      );

      console.log('✅ Vérification descente ID', avisData.iddescente, ':', 
        descenteCheck.rows.length > 0 ? 'TROUVÉE' : 'NON TROUVÉE');

      if (descenteCheck.rows.length === 0) {
        throw new Error(`Descente ${avisData.iddescente} non trouvée dans la table "Descentes"`);
      }

      // 2. Vérifier si le FT existe
      const ftCheck = await client.query(
        'SELECT id, reference_ft FROM ft WHERE id = $1',
        [avisData.idft]
      );

      console.log('✅ Vérification FT ID', avisData.idft, ':', 
        ftCheck.rows.length > 0 ? 'TROUVÉ' : 'NON TROUVÉ');

      if (ftCheck.rows.length === 0) {
        throw new Error(`FT ${avisData.idft} non trouvé`);
      }

      // 3. Vérifier si un avis existe déjà pour ce FT
      const existingAvis = await client.query(
        'SELECT id, num_ap FROM avisdepaiement WHERE idft = $1',
        [avisData.idft]
      );

      console.log('✅ Vérification avis existant pour FT', avisData.idft, ':',
        existingAvis.rows.length > 0 ? 'EXISTE DÉJÀ' : 'PAS D\'AVIS');

      if (existingAvis.rows.length > 0) {
        throw new Error(`Un avis de paiement existe déjà pour le FT ${avisData.idft} (${existingAvis.rows[0].num_ap})`);
      }

      // 4. Vérifier si le num_ap est unique
      const numApCheck = await client.query(
        'SELECT id FROM avisdepaiement WHERE num_ap = $1',
        [avisData.num_ap]
      );

      if (numApCheck.rows.length > 0) {
        throw new Error(`Le numéro AP ${avisData.num_ap} existe déjà`);
      }

      // 5. Formater les dates
      const dateAp = avisData.date_ap ? new Date(avisData.date_ap).toISOString().split('T')[0] : null;
      const finPremierPaiement = avisData.fin_premier_paiement 
        ? new Date(avisData.fin_premier_paiement).toISOString().split('T')[0] 
        : null;

      // 6. Générer un numéro AP si non fourni
      let numAp = avisData.num_ap;
      if (!numAp) {
        numAp = await this.generateNumAP();
      }

      // 7. Préparer les valeurs pour l'insertion
      const values = [
        avisData.iddescente,
        avisData.idft,
        numAp,
        dateAp,
        avisData.superficie_remblai ? parseFloat(avisData.superficie_remblai) : null,
        avisData.zone_geo || null,
        avisData.pu || null, // PU est VARCHAR(10), pas NUMERIC
        avisData.destination || null,
        avisData.montant ? parseFloat(avisData.montant) : null,
        avisData.montant_lettre || null,
        finPremierPaiement,
        avisData.contact || null,
        avisData.statut || 'En attente'  // Statut obligatoire
      ];

      console.log('📋 Valeurs pour insertion SQL:', values);

      // 8. Insérer l'avis de paiement
      const avisResult = await client.query(`
        INSERT INTO avisdepaiement (
          iddescente,
          idft,
          num_ap,
          date_ap,
          superficie_remblai,
          zone_geo,
          pu,
          destination,
          montant,
          montant_lettre,
          fin_premier_paiement,
          contact,
          statut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, values);

      const createdAvis = avisResult.rows[0];
      console.log('✅ Avis créé avec ID:', createdAvis.id, 'Numéro AP:', createdAvis.num_ap);

      // 9. Mettre à jour le statut du FT si nécessaire
      await client.query(
        'UPDATE ft SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['Avis de paiement émis', avisData.idft]
      );

      console.log('✅ Statut FT mis à jour');

      await client.query('COMMIT');
      console.log('✅ Transaction commitée avec succès');

      return {
        success: true,
        message: 'Avis de paiement créé avec succès',
        data: createdAvis
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur dans AvisDePaiement.createWithTransaction:', error);
      console.error('❌ Détails erreur:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    } finally {
      client.release();
    }
  }

  /**
   * Générer un numéro AP unique
   * @returns {Promise<string>}
   */
  static async generateNumAP() {
    try {
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      
      const result = await db.query(
        `SELECT COUNT(*) as count FROM avisdepaiement
         WHERE EXTRACT(YEAR FROM created_at) = $1 
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(DAY FROM created_at) = $3`,
        [year, month, day]
      );

      const count = parseInt(result.rows[0].count) + 1;
      const sequence = count.toString().padStart(3, '0');

      return `AP-${year}${month}${day}-${sequence}`;
    } catch (error) {
      console.error('Erreur dans generateNumAP:', error);
      // Fallback
      return `AP-${Date.now().toString().slice(-8)}`;
    }
  }

  /**
   * Récupérer un avis de paiement par son ID
   * @param {number} id - L'ID de l'avis de paiement
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    try {
      const result = await db.query(`
        SELECT 
          ap.*,
          ft.reference_ft,
          ft.date_ft,
          ft.nom_convoquee,
          ft.cin,
          ft.contact as contact_ft,
          d.nom_personne_r,
          d.commune,
          d.fokontany
        FROM avisdepaiement ap
        LEFT JOIN ft ON ap.idft = ft.id
        LEFT JOIN "Descentes" d ON ap.iddescente = d.id  -- <-- GUILLEMETS
        WHERE ap.id = $1
      `, [id]);

      const avis = result.rows[0];
      
      if (avis) {
        // Formater les dates pour l'affichage
        if (avis.date_ap) {
          avis.date_ap_formatted = new Date(avis.date_ap).toLocaleDateString('fr-FR');
        }
        if (avis.fin_premier_paiement) {
          avis.fin_premier_paiement_formatted = new Date(avis.fin_premier_paiement).toLocaleDateString('fr-FR');
        }
        if (avis.created_at) {
          avis.created_at_formatted = new Date(avis.created_at).toLocaleDateString('fr-FR');
        }
      }

      return avis || null;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.findById:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les avis de paiement avec filtres
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>}
   */
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT 
          ap.*,
          ft.reference_ft,
          ft.date_ft,
          ft.nom_convoquee,
          ft.cin,
          d.nom_personne_r,
          d.commune,
          d.fokontany
        FROM avisdepaiement ap
        LEFT JOIN ft ON ap.idft = ft.id
        LEFT JOIN "Descentes" d ON ap.iddescente = d.id  -- <-- GUILLEMETS
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;

      // Filtres
      if (filters.num_ap) {
        query += ` AND ap.num_ap ILIKE $${paramIndex}`;
        values.push(`%${filters.num_ap}%`);
        paramIndex++;
      }

      if (filters.idft) {
        query += ` AND ap.idft = $${paramIndex}`;
        values.push(filters.idft);
        paramIndex++;
      }

      if (filters.iddescente) {
        query += ` AND ap.iddescente = $${paramIndex}`;
        values.push(filters.iddescente);
        paramIndex++;
      }

      if (filters.date_from) {
        query += ` AND ap.date_ap >= $${paramIndex}`;
        values.push(filters.date_from);
        paramIndex++;
      }

      if (filters.date_to) {
        query += ` AND ap.date_ap <= $${paramIndex}`;
        values.push(filters.date_to);
        paramIndex++;
      }

      if (filters.zone_geo) {
        query += ` AND ap.zone_geo ILIKE $${paramIndex}`;
        values.push(`%${filters.zone_geo}%`);
        paramIndex++;
      }

      if (filters.statut) {
        query += ` AND ap.statut = $${paramIndex}`;
        values.push(filters.statut);
        paramIndex++;
      }

      // Tri par défaut
      query += ` ORDER BY ap.created_at DESC`;

      // Limite et offset pour pagination
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(filters.offset);
      }

      const result = await db.query(query, values);

      // Formater les dates pour chaque ligne
      const avisList = result.rows.map(row => {
        if (row.date_ap) {
          row.date_ap_formatted = new Date(row.date_ap).toLocaleDateString('fr-FR');
        }
        if (row.fin_premier_paiement) {
          row.fin_premier_paiement_formatted = new Date(row.fin_premier_paiement).toLocaleDateString('fr-FR');
        }
        if (row.created_at) {
          row.created_at_formatted = new Date(row.created_at).toLocaleDateString('fr-FR');
        }
        return row;
      });

      return avisList;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.findAll:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un avis de paiement
   * @param {number} id - L'ID de l'avis de paiement
   * @param {Object} updateData - Les données à mettre à jour
   * @returns {Promise<Object|null>}
   */
  static async update(id, updateData) {
    try {
      const excludedFields = ['id', 'created_at', 'num_ap'];
      
      // Récupérer l'avis existant
      const existingAvis = await this.findById(id);
      if (!existingAvis) {
        return null;
      }
      
      // Formater les dates si présentes
      if (updateData.date_ap) {
        updateData.date_ap = new Date(updateData.date_ap).toISOString().split('T')[0];
      }
      
      if (updateData.fin_premier_paiement) {
        updateData.fin_premier_paiement = new Date(updateData.fin_premier_paiement).toISOString().split('T')[0];
      }
      
      // Préparer les données de mise à jour
      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (!excludedFields.includes(key)) {
          // Convertir les nombres
          if (key === 'superficie_remblai' || key === 'montant') {
            filteredData[key] = value ? parseFloat(value) : null;
          } else {
            filteredData[key] = value;
          }
        }
      }
      
      // Ajouter la date de mise à jour
      filteredData.updated_at = new Date();
      
      // Construction de la requête SQL
      const setClause = Object.keys(filteredData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(filteredData)];
      
      const query = `
        UPDATE avisdepaiement
        SET ${setClause}
        WHERE id = $1
        RETURNING *;
      `;
      
      console.log('📝 Requête update avis de paiement:', query);
      console.log('📋 Valeurs:', values);
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.update:', error);
      throw error;
    }
  }

  /**
   * Supprimer un avis de paiement
   * @param {number} id - L'ID de l'avis de paiement
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    try {
      const result = await db.query(
        'DELETE FROM avisdepaiement WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.delete:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des avis de paiement
   * @returns {Promise<Object>}
   */
  static async getStatistics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
        .toISOString().split('T')[0];

      const statsQuery = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN date_ap >= $1 THEN 1 END) as today,
          COUNT(CASE WHEN date_ap >= $2 THEN 1 END) as this_month,
          COUNT(CASE WHEN date_ap >= $3 THEN 1 END) as this_year,
          COALESCE(SUM(montant), 0) as total_montant,
          COUNT(CASE WHEN statut = 'En attente' THEN 1 END) as en_attente,
          COUNT(CASE WHEN statut = 'Payé' THEN 1 END) as paye,
          COUNT(CASE WHEN statut = 'Annulé' THEN 1 END) as annule
        FROM avisdepaiement
      `, [today, monthStart, yearStart]);

      return statsQuery.rows[0];
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.getStatistics:', error);
      throw error;
    }
  }

  /**
   * Rechercher les avis de paiement
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Array>}
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT 
          ap.*,
          ft.reference_ft,
          ft.nom_convoquee,
          ft.cin,
          d.nom_personne_r
        FROM avisdepaiement ap
        LEFT JOIN ft ON ap.idft = ft.id
        LEFT JOIN "Descentes" d ON ap.iddescente = d.id  -- <-- GUILLEMETS
        WHERE ap.num_ap ILIKE $1 
          OR ft.reference_ft ILIKE $1
          OR ft.nom_convoquee ILIKE $1
          OR ft.cin ILIKE $1
          OR d.nom_personne_r ILIKE $1
          OR ap.contact ILIKE $1
        ORDER BY ap.created_at DESC
        LIMIT 20
      `;

      const result = await db.query(query, [`%${searchTerm}%`]);

      return result.rows;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.search:', error);
      throw error;
    }
  }

  /**
   * Récupérer les avis par FT ID
   * @param {number} idft - ID du FT
   * @returns {Promise<Array>}
   */
  static async findByFtId(idft) {
    try {
      const result = await db.query(`
        SELECT ap.*, ft.reference_ft
        FROM avisdepaiement ap
        LEFT JOIN ft ON ap.idft = ft.id
        WHERE ap.idft = $1
        ORDER BY ap.created_at DESC
      `, [idft]);

      return result.rows;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.findByFtId:', error);
      throw error;
    }
  }

  /**
   * Récupérer les avis par Descente ID
   * @param {number} iddescente - ID de la descente
   * @returns {Promise<Array>}
   */
  static async findByDescenteId(iddescente) {
    try {
      const result = await db.query(`
        SELECT ap.*, ft.reference_ft, d.nom_personne_r
        FROM avisdepaiement ap
        LEFT JOIN ft ON ap.idft = ft.id
        LEFT JOIN "Descentes" d ON ap.iddescente = d.id
        WHERE ap.iddescente = $1
        ORDER BY ap.created_at DESC
      `, [iddescente]);

      return result.rows;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.findByDescenteId:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un numéro AP existe déjà
   * @param {string} num_ap - Numéro AP à vérifier
   * @returns {Promise<Object|null>}
   */
  static async findByNumAp(num_ap) {
    try {
      const result = await db.query(
        'SELECT * FROM avisdepaiement WHERE num_ap = $1',
        [num_ap]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Erreur dans AvisDePaiement.findByNumAp:', error);
      throw error;
    }
  }
}

module.exports = AvisDePaiement;