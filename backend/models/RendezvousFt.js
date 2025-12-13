// models/RendezvousFt.js
const db = require('../config/db');

class RendezvousFt {
  static async findAll() {
    try {
      const result = await db.query(`
        SELECT * FROM public.rendezvousft
ORDER BY id ASC 
      `);
      return result.rows;
    } catch (error) {
      console.error('Erreur dans findAll:', error);
      throw error;
    }
  }


  static async findByDescenteId(idDescente) {
    try {
      const result = await db.query(`
        SELECT * FROM rendezvousft 
        WHERE iddescente = $1
        ORDER BY date_rendez_vous DESC
      `, [idDescente]);
      return result.rows;
    } catch (error) {
      console.error('Erreur dans findByDescenteId:', error);
      throw error;
    }
  }

 static async update(id, data) {
  try {
    const updates = [];
    const values = [];
    let valueIndex = 1;

    // Liste des colonnes qui ne devraient pas être mises à jour manuellement
    const autoUpdatedColumns = ['updated_at', 'created_at'];
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && !autoUpdatedColumns.includes(key)) {
        updates.push(`${key} = $${valueIndex}`);
        values.push(data[key]);
        valueIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    const result = await db.query(`
      UPDATE rendezvousft 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `, values);

    return result.rows[0];
  } catch (error) {
    console.error('Erreur dans update:', error);
    throw error;
  }
}

  static async delete(id) {
    try {
      const result = await db.query(
        'DELETE FROM rendezvousft WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans delete:', error);
      throw error;
    }
  }

  static async updateStatut(id, statut) {
    try {
      const result = await db.query(`
        UPDATE rendezvousft 
        SET statut = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [statut, id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans updateStatut:', error);
      throw error;
    }
  }

  static async getTodayRendezvous() {
    try {
      const result = await db.query(`
        SELECT r.*, d.nom_verbalisateur, d.nom_personne_r
        FROM rendezvousft r
        LEFT JOIN descentes d ON r.iddescente = d.id
        WHERE r.date_rendez_vous = CURRENT_DATE
        ORDER BY r.heure_rendez_vous
      `);
      return result.rows;
    } catch (error) {
      console.error('Erreur dans getTodayRendezvous:', error);
      throw error;
    }
  }

  static async getUpcomingRendezvous(days = 7) {
    try {
      const result = await db.query(`
        SELECT r.*, d.nom_verbalisateur, d.nom_personne_r
        FROM rendezvousft r
        LEFT JOIN descentes d ON r.iddescente = d.id
        WHERE r.date_rendez_vous BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND r.statut NOT IN ('annulé', 'terminé')
        ORDER BY r.date_rendez_vous, r.heure_rendez_vous
      `);
      return result.rows;
    } catch (error) {
      console.error('Erreur dans getUpcomingRendezvous:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN date_rendez_vous = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN statut = 'confirmé' THEN 1 END) as confirmed,
          COUNT(CASE WHEN statut = 'planifié' THEN 1 END) as planned,
          COUNT(CASE WHEN statut = 'en attente' THEN 1 END) as pending,
          COUNT(CASE WHEN statut = 'annulé' THEN 1 END) as cancelled,
          COUNT(CASE WHEN statut = 'terminé' THEN 1 END) as completed
        FROM rendezvousft
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans getStats:', error);
      throw error;
    }
  }
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM rendezvousft WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur dans findById:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const fields = [];
      const placeholders = [];
      const values = [];
      let index = 1;

      Object.keys(data).forEach(key => {
        fields.push(key);
        placeholders.push(`$${index}`);
        values.push(data[key]);
        index++;
      });

      const result = await db.query(`
        INSERT INTO rendezvousft (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `, values);

      return result.rows[0];
    } catch (error) {
      console.error('Erreur dans create:', error);
      throw error;
    }
  }
    // Méthode pour récupérer les données complètes d'un rendez-vous avec sa descente
  static async findFullDataById(id) {
    try {
      const result = await db.query(`
        SELECT 
          r.id AS rendezvous_id,
          r.date_descente AS rdv_date_descente,
          r.heure_descente AS rdv_heure_descente,
          r.date_rendez_vous,
          r.heure_rendez_vous,
          r.n_pv_pat,
          r.n_fifafi,
          r.contact_r,
          r.infraction AS rdv_infraction,
          r.actions AS rdv_actions,
          r.modele_pv AS rdv_modele_pv,
          r.reference AS rdv_reference,
          r.statut AS rdv_statut,
          r.created_at AS rdv_created_at,
          r.updated_at AS rdv_updated_at,
          
          d.id AS descente_id,
          d.date_descente AS desc_date_descente,
          d.heure_descente AS desc_heure_descente,
          d.date_rendez_vous AS desc_date_rdv,
          d.heure_rendez_vous AS desc_heure_rdv,
          d.n_pv_pat AS desc_n_pv_pat,
          d.n_fifafi AS desc_n_fifafi,
          d.type_verbalisateur,
          d.nom_verbalisateur,
          d.personne_r,
          d.nom_personne_r,
          d.contact_r AS desc_contact_r,
          d.adresse_r,
          d.commune,
          d.fokontany,
          d.district,
          d.localisation,
          d.superficie,
          d.x_coord,
          d.y_coord,
          d.infraction AS desc_infraction,
          d.actions AS desc_actions,
          d.modele_pv AS desc_modele_pv,
          d.reference AS desc_reference,
          d.dossier_a_fournir,
          d.statut_descente
        FROM rendezvousft r
        LEFT JOIN "Descentes" d ON r.iddescente = d.id
        WHERE r.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Structurer les données de manière organisée
      return {
        rendezvous: {
          id: row.rendezvous_id,
          iddescente: row.descente_id,
          date_descente: row.rdv_date_descente,
          heure_descente: row.rdv_heure_descente,
          date_rendez_vous: row.date_rendez_vous,
          heure_rendez_vous: row.heure_rendez_vous,
          n_pv_pat: row.n_pv_pat,
          n_fifafi: row.n_fifafi,
          contact_r: row.contact_r,
          infraction: row.rdv_infraction,
          actions: row.rdv_actions,
          modele_pv: row.rdv_modele_pv,
          reference: row.rdv_reference,
          statut: row.rdv_statut
        },
        descente: row.descente_id ? {
          id: row.descente_id,
          date_descente: row.desc_date_descente,
          heure_descente: row.desc_heure_descente,
          date_rendez_vous: row.desc_date_rdv,
          heure_rendez_vous: row.desc_heure_rdv,
          n_pv_pat: row.desc_n_pv_pat,
          n_fifafi: row.desc_n_fifafi,
          type_verbalisateur: row.type_verbalisateur,
          nom_verbalisateur: row.nom_verbalisateur,
          personne_r: row.personne_r,
          nom_personne_r: row.nom_personne_r,
          contact_r: row.desc_contact_r,
          adresse_r: row.adresse_r,
          commune: row.commune,
          fokontany: row.fokontany,
          district: row.district,
          localisation: row.localisation,
          superficie: row.superficie,
          x_coord: row.x_coord,
          y_coord: row.y_coord,
          infraction: row.desc_infraction,
          actions: row.desc_actions,
          modele_pv: row.desc_modele_pv,
          reference: row.desc_reference,
          dossier_a_fournir: row.dossier_a_fournir,
          statut_descente: row.statut_descente
        } : null
      };
    } catch (error) {
      console.error('Erreur dans findFullDataById:', error);
      throw error;
    }
  }
}

module.exports = RendezvousFt;