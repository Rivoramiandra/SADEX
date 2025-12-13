// models/Ft.js
const db = require('../config/db');

class Ft {
  /**
   * Créer un nouveau FT avec gestion du statut de dossier
   * @param {Object} ftData - Les données du FT
   * @returns {Promise<Object>} - Le FT créé
   */
  static async create(ftData) {
    try {
      // Calculer le statut du dossier
      const statutDossier = ftData.statut_dossier || this.calculateStatutDossier(
        ftData.dossiers_fournis || [],
        ftData.dossier_a_fournir || ''
      );

      // Préparer l'objet dossier pour JSON
      const dossierObject = {
        dossiers_fournis: ftData.dossiers_fournis || [],
        dossier_a_fournir: ftData.dossier_a_fournir || '',
        statut_dossier: statutDossier,
        conclusion: ftData.conclusion || '',
        contact: ftData.contact || '',
        delai_complement: ftData.delai_complement || 0
      };

      // Calculer la date de deadline si délai spécifié
      let dateDeadline = null;
      if (ftData.delai_complement > 0 && ftData.date_ft) {
        const dateFt = new Date(ftData.date_ft);
        dateFt.setDate(dateFt.getDate() + ftData.delai_complement);
        dateDeadline = dateFt.toISOString().split('T')[0];
      }

      // Préparer l'heure au format HH:MM:SS
      let heureFormatted = null;
      if (ftData.heure_ft) {
        heureFormatted = ftData.heure_ft.length === 5 
          ? `${ftData.heure_ft}:00` 
          : ftData.heure_ft;
      }

      // Exécuter l'insertion
      const result = await db.query(`
        INSERT INTO ft (
          reference_ft, 
          date_ft, 
          heure_ft, 
          type_convoquee,
          nom_convoquee, 
          cin, 
          adresse, 
          contact, 
          titre_terrain,
          nom_propriete, 
          nom_proprietaire, 
          superficie_remblai,
          dossier, 
          date_deadlinedossier, 
          conclusion, 
          statut,
          statut_dossier,
          iddescente, 
          idrendezvous
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        ftData.reference_ft,
        ftData.date_ft,
        heureFormatted,
        ftData.type_convoquee || null,
        ftData.nom_convoquee || null,
        ftData.cin || null,
        ftData.adresse || null,
        ftData.contact || null,
        ftData.titre_terrain || null,
        ftData.nom_propriete || null,
        ftData.nom_proprietaire || null,
        ftData.superficie_remblai ? parseFloat(ftData.superficie_remblai) : null,
        JSON.stringify(dossierObject),
        dateDeadline,
        ftData.conclusion || '',
        ftData.statut || 'Etabli',
        statutDossier,
        ftData.iddescente,
        ftData.idrendezvous || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans create:', error);
      throw error;
    }
  }

  /**
   * Créer un FT avec transaction (mise à jour des statuts)
   * @param {Object} ftData - Les données du FT
   * @returns {Promise<Object>} - Le résultat de l'opération
   */
  static async createWithTransaction(ftData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Vérifier si le rendez-vous existe
      const rendezvousCheck = await client.query(
        'SELECT id, statut FROM rendezvousft WHERE id = $1',
        [ftData.idrendezvous]
      );

      if (rendezvousCheck.rows.length === 0) {
        throw new Error(`Rendez-vous ${ftData.idrendezvous} non trouvé`);
      }

      // 2. Vérifier si la descente existe et récupérer les dossiers à fournir
      const descenteCheck = await client.query(
        'SELECT id, dossier_a_fournir FROM "Descentes" WHERE id = $1',
        [ftData.iddescente]
      );

      if (descenteCheck.rows.length === 0) {
        throw new Error(`Descente ${ftData.iddescente} non trouvée`);
      }

      // Récupérer les dossiers à fournir de la descente
      const descenteData = descenteCheck.rows[0];
      const dossierAFournir = descenteData.dossier_a_fournir || '';

      // 3. Calculer le statut du dossier
      const statutDossier = ftData.statut_dossier || this.calculateStatutDossier(
        ftData.dossiers_fournis || [],
        dossierAFournir
      );

      // 4. Préparer les données
      const dossierObject = {
        dossiers_fournis: ftData.dossiers_fournis || [],
        dossier_a_fournir: dossierAFournir,
        statut_dossier: statutDossier,
        conclusion: ftData.conclusion || '',
        contact: ftData.contact || '',
        delai_complement: ftData.delai_complement || 0
      };

      let dateDeadline = null;
      if (ftData.delai_complement > 0 && ftData.date_ft) {
        const dateFt = new Date(ftData.date_ft);
        dateFt.setDate(dateFt.getDate() + ftData.delai_complement);
        dateDeadline = dateFt.toISOString().split('T')[0];
      }

      let heureFormatted = null;
      if (ftData.heure_ft) {
        heureFormatted = ftData.heure_ft.length === 5 
          ? `${ftData.heure_ft}:00` 
          : ftData.heure_ft;
      }

      // 5. Insérer le FT
      const ftResult = await client.query(`
        INSERT INTO ft (
          reference_ft, date_ft, heure_ft, type_convoquee,
          nom_convoquee, cin, adresse, contact, titre_terrain,
          nom_propriete, nom_proprietaire, superficie_remblai,
          dossier, date_deadlinedossier, conclusion, statut,
          statut_dossier, iddescente, idrendezvous
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        ftData.reference_ft,
        ftData.date_ft,
        heureFormatted,
        ftData.type_convoquee || null,
        ftData.nom_convoquee || null,
        ftData.cin || null,
        ftData.adresse || null,
        ftData.contact || null,
        ftData.titre_terrain || null,
        ftData.nom_propriete || null,
        ftData.nom_proprietaire || null,
        ftData.superficie_remblai ? parseFloat(ftData.superficie_remblai) : null,
        JSON.stringify(dossierObject),
        dateDeadline,
        ftData.conclusion || '',
        'Etabli',
        statutDossier,
        ftData.iddescente,
        ftData.idrendezvous
      ]);

      const createdFt = ftResult.rows[0];

      // 6. Mettre à jour le statut du rendez-vous
      await client.query(
        'UPDATE rendezvousft SET statut = $1 WHERE id = $2',
        ['Fini', ftData.idrendezvous]
      );

      // 7. Mettre à jour le statut de la descente si nécessaire
      if (statutDossier === 'Complet' || statutDossier === 'Fini') {
        await client.query(
          'UPDATE "Descentes" SET statut_descente = $1 WHERE id = $2',
          ['Fini', ftData.iddescente]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'FT créé avec succès',
        data: createdFt,
        statut_dossier: statutDossier
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur dans createWithTransaction:', error);
      
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
   * Calculer le statut du dossier
   * @param {Array} dossiersFournis - Dossiers fournis par le convoqué
   * @param {string} dossierAFournir - Dossiers requis (string séparés par virgule)
   * @returns {string} - 'Complet', 'Incomplet' ou 'Aucun dossier requis'
   */
  static calculateStatutDossier(dossiersFournis, dossierAFournir) {
    // Nettoyer la chaîne des dossiers à fournir
    const cleanDossierAFournir = this.cleanJsonString(dossierAFournir);
    
    // Si pas de dossiers requis
    if (!cleanDossierAFournir || cleanDossierAFournir.trim() === '') {
      return 'Aucun dossier requis';
    }

    // Convertir en tableau de dossiers requis
    const dossiersRequis = cleanDossierAFournir
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    // Si pas de dossiers requis après nettoyage
    if (dossiersRequis.length === 0) {
      return 'Aucun dossier requis';
    }

    // Vérifier si tous les dossiers requis sont fournis
    const tousDossiersFournis = dossiersRequis.every(dossier => 
      dossiersFournis.includes(dossier)
    );

    // Vérifier si au moins un dossier requis n'est pas fourni
    const auMoinsUnManquant = dossiersRequis.some(dossier => 
      !dossiersFournis.includes(dossier)
    );

    if (tousDossiersFournis) {
      return 'Complet';
    } else if (auMoinsUnManquant) {
      return 'Incomplet';
    } else {
      return 'Aucun dossier requis';
    }
  }

  /**
   * Nettoyer une chaîne JSON
   * @param {string} str - Chaîne à nettoyer
   * @returns {string} - Chaîne nettoyée
   */
  static cleanJsonString(str) {
    if (str === null || str === undefined) {
      return '';
    }
   
    let cleanStr = typeof str === 'string' ? str : String(str);
    cleanStr = cleanStr.trim();
   
    if (cleanStr === '') {
      return '';
    }
   
    if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanStr);
        if (typeof parsed === 'object' && parsed !== null) {
          const firstKey = Object.keys(parsed)[0];
          const value = parsed[firstKey];
          return value !== null && value !== undefined ? String(value) : '';
        }
      } catch (error) {
        console.debug('JSON parsing failed:', error);
      }
    }
   
    if ((cleanStr.startsWith('"') && cleanStr.endsWith('"')) ||
        (cleanStr.startsWith("'") && cleanStr.endsWith("'"))) {
      cleanStr = cleanStr.slice(1, -1);
    }
   
    return cleanStr;
  }

  /**
   * Récupérer un FT par son ID
   * @param {number} id - L'ID du FT
   * @returns {Promise<Object|null>}
   */
  /**
 * Récupérer un FT par son ID
 * @param {number} id - L'ID du FT
 * @returns {Promise<Object|null>}
 */
static async findById(id) {
  try {
    const result = await db.query(`
      SELECT 
        ft.*,
        (dossier::jsonb->>'statut_dossier') as statut_dossier,
        (dossier::jsonb->>'dossiers_fournis') as dossiers_fournis_json,
        (dossier::jsonb->>'dossier_a_fournir') as dossier_a_fournir_json,
        (dossier::jsonb->>'conclusion') as conclusion_dossier,
        (dossier::jsonb->>'delai_complement') as delai_complement_dossier
      FROM ft WHERE id = $1
    `, [id]);

    const ft = result.rows[0];
    
    if (ft) {
      // Parser les données JSON si elles existent
      if (ft.dossiers_fournis_json) {
        try {
          ft.dossiers_fournis = JSON.parse(ft.dossiers_fournis_json);
        } catch {
          ft.dossiers_fournis = [];
        }
      } else {
        ft.dossiers_fournis = [];
      }
      
      ft.dossier_a_fournir = ft.dossier_a_fournir_json || '';
      
      // Si conclusion est dans dossier JSON, utiliser cette valeur
      if (ft.conclusion_dossier) {
        ft.conclusion = ft.conclusion_dossier;
      }
      
      // Si delai_complement est dans dossier JSON, utiliser cette valeur
      if (ft.delai_complement_dossier) {
        ft.delai_complement = parseInt(ft.delai_complement_dossier) || 0;
      }
    }

    return ft || null;
  } catch (error) {
    console.error('Erreur dans findById:', error);
    throw error;
  }
}
  /**
 * Récupérer un FT complet avec les données de la descente
 * @param {number} id - L'ID du FT
 * @returns {Promise<Object|null>}
 */
static async findWithDescente(id) {
  try {
    const result = await db.query(`
      SELECT 
        ft.*,
        d.*,
        (ft.dossier::jsonb->>'statut_dossier') as statut_dossier,
        (ft.dossier::jsonb->>'dossiers_fournis') as dossiers_fournis_json,
        (ft.dossier::jsonb->>'dossier_a_fournir') as dossier_a_fournir_json,
        (ft.dossier::jsonb->>'conclusion') as conclusion_dossier,
        (ft.dossier::jsonb->>'delai_complement') as delai_complement_dossier
      FROM ft
      LEFT JOIN "Descentes" d ON ft.iddescente = d.id
      WHERE ft.id = $1
    `, [id]);

    const ft = result.rows[0];
    
    if (ft) {
      // Parser les données JSON
      if (ft.dossiers_fournis_json) {
        try {
          ft.dossiers_fournis = JSON.parse(ft.dossiers_fournis_json);
        } catch {
          ft.dossiers_fournis = [];
        }
      } else {
        ft.dossiers_fournis = [];
      }
      
      ft.dossier_a_fournir = ft.dossier_a_fournir_json || '';
      
      // Utiliser les valeurs du dossier JSON si disponibles
      if (ft.conclusion_dossier) {
        ft.conclusion = ft.conclusion_dossier;
      }
      
      if (ft.delai_complement_dossier) {
        ft.delai_complement = parseInt(ft.delai_complement_dossier) || 0;
      }
      
      // Nettoyer les champs JSON de la descente
      if (ft.infraction) {
        ft.infraction = this.cleanJsonString(ft.infraction);
      }
      if (ft.actions) {
        ft.actions = this.cleanJsonString(ft.actions);
      }
      if (ft.dossier_a_fournir_field) { // Si vous avez un champ dossier_a_fournir dans Descentes
        ft.descente_dossier_a_fournir = this.cleanJsonString(ft.dossier_a_fournir_field);
      }
    }

    return ft || null;
  } catch (error) {
    console.error('Erreur dans findWithDescente:', error);
    throw error;
  }
}
  /**
   * Vérifier si un FT existe déjà pour un rendez-vous
   * @param {number} idrendezvous - L'ID du rendez-vous
   * @returns {Promise<boolean>}
   */
  static async existsForRendezvous(idrendezvous) {
    try {
      const result = await db.query(
        'SELECT id FROM ft WHERE idrendezvous = $1',
        [idrendezvous]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur dans existsForRendezvous:', error);
      throw error;
    }
  }

  /**
   * Générer une référence FT unique
   * @returns {Promise<string>}
   */
  static async generateReference() {
    try {
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ft 
         WHERE EXTRACT(YEAR FROM created_at) = $1 
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(DAY FROM created_at) = $3`,
        [year, month, day]
      );

      const count = parseInt(result.rows[0].count) + 1;
      const sequence = count.toString().padStart(3, '0');

      return `FT-${year}${month}${day}-${sequence}`;
    } catch (error) {
      console.error('Erreur dans generateReference:', error);
      // Fallback
      return `FT-${Date.now().toString().slice(-8)}`;
    }
  }

  /**
   * Mettre à jour le statut d'un FT
   * @param {number} id - L'ID du FT
   * @param {string} statut - Nouveau statut
   * @param {string} statutDossier - Nouveau statut du dossier
   * @returns {Promise<Object>}
   */
  static async updateStatut(id, statut, statutDossier = null) {
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (statut) {
        updates.push(`statut = $${paramIndex}`);
        values.push(statut);
        paramIndex++;
      }

      if (statutDossier) {
        // Mettre à jour le statut dans l'objet dossier
        const dossierQuery = await db.query(
          'SELECT dossier FROM ft WHERE id = $1',
          [id]
        );
        
        if (dossierQuery.rows.length > 0) {
          let dossier = dossierQuery.rows[0].dossier || {};
          if (typeof dossier === 'string') {
            try {
              dossier = JSON.parse(dossier);
            } catch {
              dossier = {};
            }
          }
          
          dossier.statut_dossier = statutDossier;
          
          updates.push(`dossier = $${paramIndex}`);
          values.push(JSON.stringify(dossier));
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('Aucune mise à jour spécifiée');
      }

      values.push(id);

      const query = `
        UPDATE ft 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);

      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans updateStatut:', error);
      throw error;
    }
  }

  /**
 * Récupérer tous les FT avec filtres
 * @param {Object} filters - Filtres de recherche
 * @returns {Promise<Array>}
 */
static async findAll(filters = {}) {
  try {
    let query = `
      SELECT 
        ft.*,
        (ft.dossier::jsonb->>'statut_dossier') as statut_dossier,
        (ft.dossier::jsonb->>'conclusion') as conclusion_ft,
        (ft.dossier::jsonb->>'dossiers_fournis') as dossiers_fournis_json,
        d.nom_personne_r,
        d.commune,
        d.fokontany
      FROM ft
      LEFT JOIN "Descentes" d ON ft.iddescente = d.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;

    // Filtres
    if (filters.statut) {
      query += ` AND ft.statut = $${paramIndex}`;
      values.push(filters.statut);
      paramIndex++;
    }

    if (filters.statut_dossier) {
      query += ` AND (ft.dossier::jsonb->>'statut_dossier') = $${paramIndex}`;
      values.push(filters.statut_dossier);
      paramIndex++;
    }

    if (filters.date_from) {
      query += ` AND ft.date_ft >= $${paramIndex}`;
      values.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      query += ` AND ft.date_ft <= $${paramIndex}`;
      values.push(filters.date_to);
      paramIndex++;
    }

    if (filters.iddescente) {
      query += ` AND ft.iddescente = $${paramIndex}`;
      values.push(filters.iddescente);
      paramIndex++;
    }

    if (filters.idrendezvous) {
      query += ` AND ft.idrendezvous = $${paramIndex}`;
      values.push(filters.idrendezvous);
      paramIndex++;
    }

    // Tri par défaut
    query += ` ORDER BY ft.created_at DESC`;

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

    // Parser les données JSON pour chaque ligne
    const fts = result.rows.map(row => {
      if (row.dossiers_fournis_json) {
        try {
          row.dossiers_fournis = JSON.parse(row.dossiers_fournis_json);
        } catch {
          row.dossiers_fournis = [];
        }
      } else {
        row.dossiers_fournis = [];
      }
      return row;
    });

    return fts;
  } catch (error) {
    console.error('Erreur dans findAll:', error);
    throw error;
  }
}
// models/Ft.js

// models/Ft.js - Méthode update corrigée
static async update(id, updateData) {
  try {
    const excludedFields = ['id', 'created_at', 'reference_ft'];
    
    // Vérifier d'abord le FT existant pour récupérer les données actuelles
    const existingFt = await this.findById(id);
    if (!existingFt) {
      return null;
    }
    
    // Récupérer les données JSON actuelles de la colonne dossier
    let dossierData = {};
    try {
      if (existingFt.dossier) {
        dossierData = typeof existingFt.dossier === 'string' 
          ? JSON.parse(existingFt.dossier) 
          : existingFt.dossier;
      }
    } catch (error) {
      console.error('❌ Erreur de parsing JSON dossier:', error);
      dossierData = {};
    }
    
    // Mettre à jour les champs dans l'objet dossier
    if (updateData.dossiers_fournis) {
      dossierData.dossiers_fournis = updateData.dossiers_fournis;
    }
    
    if (updateData.statut_dossier) {
      dossierData.statut_dossier = updateData.statut_dossier;
    }
    
    if (updateData.conclusion !== undefined) {
      dossierData.conclusion = updateData.conclusion;
    }
    
    if (updateData.delai_complement !== undefined) {
      dossierData.delai_complement = updateData.delai_complement;
    }
    
    // Préparer les données de mise à jour
    const filteredData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (!excludedFields.includes(key)) {
        // Ne pas inclure les champs qui font partie du JSON dossier
        if (!['dossiers_fournis', 'statut_dossier', 'conclusion', 'delai_complement'].includes(key)) {
          filteredData[key] = value;
        }
      }
    }
    
    // Ajouter la colonne dossier mise à jour
    filteredData.dossier = JSON.stringify(dossierData);
    
    // Ajouter la date de mise à jour
    filteredData.updated_at = new Date();
    
    // Construction de la requête SQL
    const setClause = Object.keys(filteredData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(filteredData)];
    
    const query = `
      UPDATE ft
      SET ${setClause}
      WHERE id = $1
      RETURNING *;
    `;
    
    console.log('📝 Requête update:', query);
    console.log('📋 Valeurs:', values);
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Erreur dans Ft.update:', error);
    throw error;
  }
}

}

module.exports = Ft;