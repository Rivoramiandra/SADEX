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

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          updates.push(`${key} = $${valueIndex}`);
          values.push(data[key]);
          valueIndex++;
        }
      });

      if (updates.length === 0) {
        throw new Error('No fields to update');
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
}

module.exports = RendezvousFt;