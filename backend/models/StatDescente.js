const pool = require("../config/db.js");

// Modèle pour les statistiques du dashboard Descentes
module.exports = {
  
  // 1. Statistiques des Descentes et PV par mois + Totaux Globaux
  getMonthlyStats: async () => {
    // Requête pour le détail mensuel (Année en cours)
    const queryMensuel = `
      SELECT 
        TO_CHAR(date_descente, 'Mon') as month,
        EXTRACT(MONTH FROM date_descente) as month_num,
        COUNT(*) as total_descentes,
        COUNT(NULLIF(n_pv_pat, '')) as nb_de_pv_pat,
        COUNT(NULLIF(n_fifafi, '')) as nb_de_fifafi
      FROM "Descentes"
      WHERE date_descente >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2
      ORDER BY month_num;
    `;

    // Requête pour la somme totale absolue (Toute la base de données)
    const queryTotalGlobal = `
      SELECT 
        COUNT(*) as total_descentes_global,
        COUNT(NULLIF(n_pv_pat, '')) as total_pv_pat_global,
        COUNT(NULLIF(n_fifafi, '')) as total_fifafi_global
      FROM "Descentes";
    `;
    
    try {
      // Exécution simultanée des deux requêtes
      const [mensuelRes, globalRes] = await Promise.all([
        pool.query(queryMensuel),
        pool.query(queryTotalGlobal)
      ]);

      return {
        mensuel: mensuelRes.rows,
        global: globalRes.rows[0] // Retourne un objet unique avec les totaux
      };
    } catch (error) {
      console.error("❌ Erreur SQL getMonthlyStats:", error);
      throw error;
    }
  },

getInfractionStats: async () => {
    // 1. Requête pour les détails par mois
    const queryMensuel = `
      SELECT 
        TO_CHAR(date_descente, 'Mon') AS month,
        EXTRACT(MONTH FROM date_descente) as month_num,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Remblai Illicite%') AS remblai_illicite,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%construction sur remblai Illicite%') AS construction_sur_remblai,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Remblai Illicite récent%') AS remblai_recent,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Cellage%') AS cellage
      FROM "Descentes"
      WHERE date_descente >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2
      ORDER BY month_num;
    `;

    // 2. Requête pour la SOMME GLOBALE dans toute la base
    const queryGlobal = `
      SELECT 
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Remblai Illicite%') AS total_remblai,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%construction sur remblai Illicite%') AS total_construction,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Remblai Illicite récent%') AS total_recent,
        COUNT(*) FILTER (WHERE array_to_string(infraction, ',') ILIKE '%Cellage%') AS total_cellage,
        COUNT(*) AS total_descentes_global
      FROM "Descentes";
    `;

    try {
      const [mensuelRes, globalRes] = await Promise.all([
        pool.query(queryMensuel),
        pool.query(queryGlobal)
      ]);

      return {
        par_mois: mensuelRes.rows,
        cumul_general: globalRes.rows[0] // On renvoie l'objet unique du total
      };
    } catch (error) {
      console.error("❌ Erreur SQL getInfractionStats:", error);
      throw error;
    }
  },
  getZoneStats: async () => {
    // Requête Mensuelle (CUA vs Périphérie)
    const queryMensuel = `
      SELECT 
        TO_CHAR(date_descente, 'Mon') as month,
        EXTRACT(MONTH FROM date_descente) as month_num,
        COUNT(*) FILTER (WHERE district IN (
          '1er Arrondissement', '2e Arrondissement', '3e Arrondissement', 
          '4e Arrondissement', '5e Arrondissement', '6e Arrondissement'
        )) as total_cua,
        COUNT(*) FILTER (WHERE district NOT IN (
          '1er Arrondissement', '2e Arrondissement', '3e Arrondissement', 
          '4e Arrondissement', '5e Arrondissement', '6e Arrondissement'
        )) as total_peripherie,
        COUNT(*) as total_global
      FROM "Descentes"
      WHERE date_descente >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2
      ORDER BY month_num;
    `;

    // Requête Somme Globale (Toute la base)
    const queryGlobal = `
      SELECT 
        COUNT(*) FILTER (WHERE district IN (
          '1er Arrondissement', '2e Arrondissement', '3e Arrondissement', 
          '4e Arrondissement', '5e Arrondissement', '6e Arrondissement'
        )) as cua_global,
        COUNT(*) FILTER (WHERE district NOT IN (
          '1er Arrondissement', '2e Arrondissement', '3e Arrondissement', 
          '4e Arrondissement', '5e Arrondissement', '6e Arrondissement'
        )) as peripherie_global,
        COUNT(*) as somme_absolue
      FROM "Descentes";
    `;

    try {
      const [mensuelRes, globalRes] = await Promise.all([
        pool.query(queryMensuel),
        pool.query(queryGlobal)
      ]);

      return {
        mensuel: mensuelRes.rows,
        global: globalRes.rows[0]
      };
    } catch (error) {
      console.error("❌ Erreur SQL getZoneStats:", error);
      throw error;
    }
  },
  getDistrictStats: async () => {
    // Liste des 14 districts de référence
    const districtsReference = [
      '1er Arrondissement', '2e Arrondissement', '3e Arrondissement', 
      '4e Arrondissement', '5e Arrondissement', '6e Arrondissement',
      'Ambohidratrimo', 'Andramasina', 'Anjozorobe', 'Ankazobe', 
      'Antananarivo Atsimondrano', 'Antananarivo Avaradrano', 
      'Arivonimamo', 'Manjakandriana'
    ];

    // Construction de la liste pour SQL
    const districtsList = districtsReference.map(d => `('${d}')`).join(', ');

    // A. Détail mensuel par district (incluant les zéros)
    // Note: Pour le mensuel avec zéros, c'est plus complexe, 
    // nous allons ici assurer que le TOTAL GLOBAL inclut bien tout le monde.
    
    const queryGlobal = `
      WITH RefDistricts AS (
        SELECT * FROM (VALUES ${districtsList}) AS t(district_name)
      )
      SELECT 
        rd.district_name as district,
        COUNT(d.id) as total_global, -- On compte l'ID de la table Descentes
        CASE 
          WHEN rd.district_name LIKE '%Arrondissement%' THEN 'CUA'
          ELSE 'Périphérie'
        END as zone
      FROM RefDistricts rd
      LEFT JOIN "Descentes" d ON rd.district_name = d.district
      GROUP BY rd.district_name
      ORDER BY total_global DESC;
    `;

    // B. Détail mensuel (Année en cours)
    const queryMensuel = `
      SELECT 
        TO_CHAR(date_descente, 'Mon') as month,
        EXTRACT(MONTH FROM date_descente) as month_num,
        district,
        COUNT(*) as nombre_descentes
      FROM "Descentes"
      WHERE date_descente >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY 1, 2, 3
      ORDER BY month_num, nombre_descentes DESC;
    `;

    try {
      const [mensuelRes, globalRes] = await Promise.all([
        pool.query(queryMensuel),
        pool.query(queryGlobal)
      ]);

      return {
        mensuelParDistrict: mensuelRes.rows,
        totalParDistrict: globalRes.rows // Cette liste contient forcément les 14 districts
      };
    } catch (error) {
      console.error("❌ Erreur SQL getDistrictStats:", error);
      throw error;
    }
  },

};