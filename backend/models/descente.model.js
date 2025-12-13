import pool from "../config/db.js";

const tableName = "Descentes";

// Préparer les données avant insertion ou update
const prepareData = (data) => {
  const result = { ...data };

  // Assurer que les colonnes TEXT[] soient bien des tableaux JS
  if (result.infraction && !Array.isArray(result.infraction)) {
    result.infraction = [result.infraction];
  }
  if (result.actions && !Array.isArray(result.actions)) {
    result.actions = [result.actions];
  }
  if (result.dossier_a_fournir && !Array.isArray(result.dossier_a_fournir)) {
    result.dossier_a_fournir = [result.dossier_a_fournir];
  }

  return result;
};

// Déterminer le statut du rendez-vous
const determineRendezvousStatus = (date_rendez_vous, heure_rendez_vous) => {
  let status = 'En attente';
  
  if (date_rendez_vous) {
    const rdvDate = new Date(date_rendez_vous);
    const now = new Date();
    const rdvDateOnly = new Date(rdvDate.getFullYear(), rdvDate.getMonth(), rdvDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (rdvDateOnly < nowDateOnly) {
      // Date passée → "En cours"
      status = 'En cours';
    } else if (rdvDateOnly.getTime() === nowDateOnly.getTime() && heure_rendez_vous) {
      // Aujourd'hui, vérifier l'heure
      const currentTime = now.toTimeString().substring(0, 5);
      if (heure_rendez_vous <= currentTime) {
        status = 'En cours';
      }
    }
  }
  
  return status;
};

// Modèle
export default {
  // Créer une descente ET un rendez-vous (version corrigée sans .connect())
  create: async (data) => {
    const preparedData = prepareData(data);
    
    try {
      // 1. Insérer dans la table Descentes
      const descenteQuery = `
        INSERT INTO "${tableName}"(
          date_descente, heure_descente, date_rendez_vous, heure_rendez_vous,
          n_pv_pat, n_fifafi, type_verbalisateur, nom_verbalisateur,
          personne_r, nom_personne_r, contact_r, adresse_r,
          commune, fokontany, district, localisation, superficie,
          x_coord, y_coord, infraction, actions, modele_pv, reference,
          dossier_a_fournir, statut_descente, "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW(),NOW()
        ) RETURNING *;
      `;

      const descenteValues = [
        preparedData.date_descente || null,
        preparedData.heure_descente || null,
        preparedData.date_rendez_vous || null,
        preparedData.heure_rendez_vous || null,
        preparedData.n_pv_pat || null,
        preparedData.n_fifafi || null,
        preparedData.type_verbalisateur || null,
        preparedData.nom_verbalisateur || null,
        preparedData.personne_r || null,
        preparedData.nom_personne_r || null,
        preparedData.contact_r || null,
        preparedData.adresse_r || null,
        preparedData.commune || null,
        preparedData.fokontany || null,
        preparedData.district || null,
        preparedData.localisation || null,
        preparedData.superficie || null,
        preparedData.x_coord || null,
        preparedData.y_coord || null,
        preparedData.infraction || null,
        preparedData.actions || null,
        preparedData.modele_pv || null,
        preparedData.reference || null,
        preparedData.dossier_a_fournir || null,
        preparedData.statut_descente || 'En cours'
      ];

      // Utiliser pool.query directement
      const descenteResult = await pool.query(descenteQuery, descenteValues);
      const newDescente = descenteResult.rows[0];
      console.log('✅ Descente créée:', newDescente);
      
      // 2. Déterminer le statut pour le rendez-vous
      const rdvStatus = determineRendezvousStatus(
        newDescente.date_rendez_vous,
        newDescente.heure_rendez_vous
      );
      
      // 3. Insérer dans rendezvousFt
      const rendezvousQuery = `
        INSERT INTO rendezvousFt (
          iddescente,
          date_descente,
          heure_descente,
          date_rendez_vous,
          heure_rendez_vous,
          n_pv_pat,
          n_fifafi,
          contact_r,
          infraction,
          actions,
          modele_pv,
          reference,
          statut,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      
      const rendezvousValues = [
        newDescente.id,
        newDescente.date_descente,
        newDescente.heure_descente,
        newDescente.date_rendez_vous,
        newDescente.heure_rendez_vous,
        newDescente.n_pv_pat,
        newDescente.n_fifafi,
        newDescente.contact_r,
        newDescente.infraction,
        newDescente.actions,
        newDescente.modele_pv,
        newDescente.reference,
        rdvStatus
      ];
      
      const rendezvousResult = await pool.query(rendezvousQuery, rendezvousValues);
      const newRendezvous = rendezvousResult.rows[0];
      console.log('✅ Rendez-vous créé automatiquement:', newRendezvous);
      
      return {
        descente: newDescente,
        rendezvous: newRendezvous
      };
      
    } catch (error) {
      console.error("❌ Erreur SQL CREATE Descente:", error);
      throw error;
    }
  },

  // Version alternative avec transaction si vous avez besoin de .connect()
  createWithTransaction: async (data) => {
    const preparedData = prepareData(data);
    const client = await pool.connect(); // Si vous avez cette méthode
    
    try {
      await client.query('BEGIN');
      
      // 1. Insérer dans la table Descentes
      const descenteQuery = `
        INSERT INTO "${tableName}"(
          date_descente, heure_descente, date_rendez_vous, heure_rendez_vous,
          n_pv_pat, n_fifafi, type_verbalisateur, nom_verbalisateur,
          personne_r, nom_personne_r, contact_r, adresse_r,
          commune, fokontany, district, localisation, superficie,
          x_coord, y_coord, infraction, actions, modele_pv, reference,
          dossier_a_fournir, statut_descente, "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW(),NOW()
        ) RETURNING *;
      `;

      const descenteValues = [
        preparedData.date_descente || null,
        preparedData.heure_descente || null,
        preparedData.date_rendez_vous || null,
        preparedData.heure_rendez_vous || null,
        preparedData.n_pv_pat || null,
        preparedData.n_fifafi || null,
        preparedData.type_verbalisateur || null,
        preparedData.nom_verbalisateur || null,
        preparedData.personne_r || null,
        preparedData.nom_personne_r || null,
        preparedData.contact_r || null,
        preparedData.adresse_r || null,
        preparedData.commune || null,
        preparedData.fokontany || null,
        preparedData.district || null,
        preparedData.localisation || null,
        preparedData.superficie || null,
        preparedData.x_coord || null,
        preparedData.y_coord || null,
        preparedData.infraction || null,
        preparedData.actions || null,
        preparedData.modele_pv || null,
        preparedData.reference || null,
        preparedData.dossier_a_fournir || null,
        preparedData.statut_descente || 'En cours'
      ];

      const descenteResult = await client.query(descenteQuery, descenteValues);
      const newDescente = descenteResult.rows[0];
      
      // 2. Déterminer le statut pour le rendez-vous
      const rdvStatus = determineRendezvousStatus(
        newDescente.date_rendez_vous,
        newDescente.heure_rendez_vous
      );
      
      // 3. Insérer dans rendezvousFt
      const rendezvousQuery = `
        INSERT INTO rendezvousFt (
          iddescente,
          date_descente,
          heure_descente,
          date_rendez_vous,
          heure_rendez_vous,
          n_pv_pat,
          n_fifafi,
          contact_r,
          infraction,
          actions,
          modele_pv,
          reference,
          statut,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      
      const rendezvousValues = [
        newDescente.id,
        newDescente.date_descente,
        newDescente.heure_descente,
        newDescente.date_rendez_vous,
        newDescente.heure_rendez_vous,
        newDescente.n_pv_pat,
        newDescente.n_fifafi,
        newDescente.contact_r,
        newDescente.infraction,
        newDescente.actions,
        newDescente.modele_pv,
        newDescente.reference,
        rdvStatus
      ];
      
      const rendezvousResult = await client.query(rendezvousQuery, rendezvousValues);
      const newRendezvous = rendezvousResult.rows[0];
      
      await client.query('COMMIT');
      
      return {
        descente: newDescente,
        rendezvous: newRendezvous
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("❌ Erreur transaction SQL CREATE Descente:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Récupérer toutes les descentes
  findAll: async () => {
    const query = `SELECT * FROM "${tableName}" ORDER BY "createdAt" DESC;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("❌ Erreur SQL FIND ALL Descente:", error);
      throw error;
    }
  },

  // Récupérer une descente par ID
  findById: async (id) => {
    const query = `SELECT * FROM "${tableName}" WHERE id=$1;`;
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Erreur SQL FIND BY ID Descente:", error);
      throw error;
    }
  },

  // Mettre à jour une descente
  update: async (id, data) => {
    const preparedData = prepareData(data);

    const query = `
      UPDATE "${tableName}" SET
        date_descente=$1, heure_descente=$2, date_rendez_vous=$3, heure_rendez_vous=$4,
        n_pv_pat=$5, n_fifafi=$6, type_verbalisateur=$7, nom_verbalisateur=$8,
        personne_r=$9, nom_personne_r=$10, contact_r=$11, adresse_r=$12,
        commune=$13, fokontany=$14, district=$15, localisation=$16, superficie=$17,
        x_coord=$18, y_coord=$19, infraction=$20, actions=$21,
        modele_pv=$22, reference=$23, dossier_a_fournir=$24, statut_descente=$25,
        "updatedAt"=NOW()
      WHERE id=$26
      RETURNING *;
    `;

    const values = [
      preparedData.date_descente || null,
      preparedData.heure_descente || null,
      preparedData.date_rendez_vous || null,
      preparedData.heure_rendez_vous || null,
      preparedData.n_pv_pat || null,
      preparedData.n_fifafi || null,
      preparedData.type_verbalisateur || null,
      preparedData.nom_verbalisateur || null,
      preparedData.personne_r || null,
      preparedData.nom_personne_r || null,
      preparedData.contact_r || null,
      preparedData.adresse_r || null,
      preparedData.commune || null,
      preparedData.fokontany || null,
      preparedData.district || null,
      preparedData.localisation || null,
      preparedData.superficie || null,
      preparedData.x_coord || null,
      preparedData.y_coord || null,
      preparedData.infraction || null,
      preparedData.actions || null,
      preparedData.modele_pv || null,
      preparedData.reference || null,
      preparedData.dossier_a_fournir || null,
      preparedData.statut_descente || 'En cours',
      id
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Erreur SQL UPDATE Descente:", error);
      throw error;
    }
  },

  // Supprimer une descente (version sans .connect())
  delete: async (id) => {
    try {
      // 1. Supprimer le rendez-vous associé d'abord
      const deleteRendezvousQuery = `DELETE FROM rendezvousFt WHERE iddescente=$1;`;
      await pool.query(deleteRendezvousQuery, [id]);
      
      // 2. Supprimer la descente
      const deleteDescenteQuery = `DELETE FROM "${tableName}" WHERE id=$1 RETURNING *;`;
      const result = await pool.query(deleteDescenteQuery, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Erreur SQL DELETE Descente:", error);
      throw error;
    }
  }
};