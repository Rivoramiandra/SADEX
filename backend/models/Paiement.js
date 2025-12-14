const db = require('../config/db');

class Paiement {
  static async create(paiementData) {
    const {
      idavis,
      iddescente,
      idft,
      montant,
      date_paiement,
      mode_paiement,
      reference,
      type_paiement,
      montant_reste,
      nombre_tranche,
      numero_tranche,
      contact,
      statut
    } = paiementData;

    const query = `
      INSERT INTO paiement (
        idavis, iddescente, idft, montant, date_paiement, 
        mode_paiement, reference, type_paiement, montant_reste,
        nombre_tranche, numero_tranche, contact, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING idpaiement
    `;

    const values = [
      idavis, iddescente, idft, montant, date_paiement,
      mode_paiement, reference, type_paiement, montant_reste,
      nombre_tranche, numero_tranche, contact || null, statut
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0].idpaiement;
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      throw error;
    }
  }

  static async findByAvisId(idavis) {
    const query = `
      SELECT * FROM paiement 
      WHERE idavis = $1 
      ORDER BY date_paiement DESC, idpaiement DESC
    `;
    
    try {
      const result = await db.query(query, [idavis]);
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      throw error;
    }
  }

  static async findById(idpaiement) {
    const query = 'SELECT * FROM paiement WHERE idpaiement = $1';
    
    try {
      const result = await db.query(query, [idpaiement]);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la récupération du paiement:', error);
      throw error;
    }
  }

  static async getTotalByAvis(idavis) {
    const query = 'SELECT SUM(montant) as total_paye FROM paiement WHERE idavis = $1';
    
    try {
      const result = await db.query(query, [idavis]);
      return result.rows[0].total_paye || 0;
    } catch (error) {
      console.error('Erreur lors du calcul du total payé:', error);
      throw error;
    }
  }
// models/Paiement.js - Ajoutez cette méthode
static async findAll(filters = {}) {
  try {
    let query = `
      SELECT 
        p.*,
        ap.num_ap,
        ap.montant as montant_avis,
        ft.reference_ft,
        ft.nom_convoquee,
        ft.contact as contact_ft
      FROM paiement p
      LEFT JOIN avisdepaiement ap ON p.idavis = ap.id
      LEFT JOIN ft ON p.idft = ft.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;
    
    // Filtres optionnels
    if (filters.idft) {
      query += ` AND p.idft = $${paramIndex}`;
      values.push(filters.idft);
      paramIndex++;
    }
    
    if (filters.idavis) {
      query += ` AND p.idavis = $${paramIndex}`;
      values.push(filters.idavis);
      paramIndex++;
    }
    
    if (filters.date_from) {
      query += ` AND p.date_paiement >= $${paramIndex}`;
      values.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters.date_to) {
      query += ` AND p.date_paiement <= $${paramIndex}`;
      values.push(filters.date_to);
      paramIndex++;
    }
    
    if (filters.statut) {
      query += ` AND p.statut = $${paramIndex}`;
      values.push(filters.statut);
      paramIndex++;
    }
    
    query += ` ORDER BY p.date_paiement DESC, p.idpaiement DESC`;
    
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
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur dans Paiement.findAll:', error);
    throw error;
  }
}
  static async getHistoriqueByFt(idft) {
    const query = `
      SELECT p.*, ap.num_ap, ap.montant as montant_avis
      FROM paiement p
      JOIN avis_paiement ap ON p.idavis = ap.id
      WHERE p.idft = $1
      ORDER BY p.date_paiement DESC
    `;
    
    try {
      const result = await db.query(query, [idft]);
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  static async delete(idpaiement) {
    const query = 'DELETE FROM paiement WHERE idpaiement = $1';
    
    try {
      const result = await db.query(query, [idpaiement]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression du paiement:', error);
      throw error;
    }
  }

  static async update(idpaiement, paiementData) {
    const fields = [];
    const values = [];
    let index = 1;

    Object.keys(paiementData).forEach(key => {
      if (paiementData[key] !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(paiementData[key]);
        index++;
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(idpaiement);
    
    const query = `
      UPDATE paiement 
      SET ${fields.join(', ')}, updated_at = NOW() 
      WHERE idpaiement = $${values.length}
    `;

    try {
      const result = await db.query(query, values);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error);
      throw error;
    }
  }
}

module.exports = Paiement;