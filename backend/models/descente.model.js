import pool from "../config/db.js";

const tableName = "Descentes";

// Fonction pour convertir les points en polygone WKT
const pointsToPolygonWKT = (polygon_points) => {
  if (!polygon_points || polygon_points.length < 3) {
    return null;
  }
  
  // Trier les points par ordre
  const orderedPoints = [...polygon_points]
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Créer la chaîne de coordonnées (longitude latitude)
  const coordinates = orderedPoints.map(point => 
    `${point.longitude} ${point.latitude}`
  );
  
  // Fermer le polygone (premier point = dernier point)
  if (coordinates.length > 0) {
    coordinates.push(coordinates[0]);
  }
  
  // Retourner au format WKT: POLYGON((lon1 lat1, lon2 lat2, ...))
  return `POLYGON((${coordinates.join(',')}))`;
};

// Fonction pour calculer le centroïde à partir des points
const calculateCentroid = (polygon_points) => {
  if (!polygon_points || polygon_points.length === 0) {
    return null;
  }
  
  // Trier les points par ordre
  const orderedPoints = [...polygon_points]
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Calculer le centroïde simple (moyenne des coordonnées)
  let sumLat = 0;
  let sumLon = 0;
  
  orderedPoints.forEach(point => {
    sumLat += point.latitude;
    sumLon += point.longitude;
  });
  
  return {
    latitude: sumLat / orderedPoints.length,
    longitude: sumLon / orderedPoints.length
  };
};

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

  // Convertir les points en polygone WKT si disponibles
  if (result.polygon_points) {
    result.geom_polygon_wkt = pointsToPolygonWKT(result.polygon_points);
    
    // Si pas de coordonnées Lambert fournies, calculer à partir du polygone
    if (!result.x_coord || !result.y_coord) {
      const centroid = calculateCentroid(result.polygon_points);
      if (centroid) {
        // Ici vous pourriez convertir latitude/longitude en Lambert
        // Pour l'instant, on utilise les coordonnées géographiques
        result.x_coord = centroid.longitude;
        result.y_coord = centroid.latitude;
      }
    }
    
    // Ne pas stocker polygon_points dans la base (optionnel)
    delete result.polygon_points;
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
  // Créer une descente ET un rendez-vous
  create: async (data) => {
    const preparedData = prepareData(data);
    
    try {
      // 1. Insérer dans la table Descentes avec geom_polygon
      const descenteQuery = `
        INSERT INTO "${tableName}"(
          date_descente, heure_descente, date_rendez_vous, heure_rendez_vous,
          n_pv_pat, n_fifafi, type_verbalisateur, nom_verbalisateur,
          personne_r, nom_personne_r, contact_r, adresse_r,
          commune, fokontany, district, localisation, superficie,
          x_coord, y_coord, infraction, actions, modele_pv, reference,
          dossier_a_fournir, statut_descente, 
          geom_polygon,  -- NOUVELLE COLONNE
          "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
          ST_GeomFromText($26, 4326),  -- NOUVELLE VALEUR pour geom_polygon
          NOW(),NOW()
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
        preparedData.statut_descente || 'En cours',
        preparedData.geom_polygon_wkt || null  // WKT du polygone
      ];

      // Utiliser pool.query directement
      const descenteResult = await pool.query(descenteQuery, descenteValues);
      const newDescente = descenteResult.rows[0];
      console.log('✅ Descente créée avec polygone:', newDescente);
      
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
      
      // Récupérer la descente avec le polygone en GeoJSON
      const descenteWithPolygon = await pool.query(
        `SELECT *, ST_AsGeoJSON(geom_polygon) as polygon_geojson 
         FROM "${tableName}" WHERE id = $1`,
        [newDescente.id]
      );
      
      return {
        descente: descenteWithPolygon.rows[0],
        rendezvous: newRendezvous
      };
      
    } catch (error) {
      console.error("❌ Erreur SQL CREATE Descente:", error);
      throw error;
    }
  },

  // Version alternative avec transaction
  createWithTransaction: async (data) => {
    const preparedData = prepareData(data);
    const client = await pool.connect();
    
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
          dossier_a_fournir, statut_descente, 
          geom_polygon,  -- NOUVELLE COLONNE
          "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
          ST_GeomFromText($26, 4326),  -- NOUVELLE VALEUR pour geom_polygon
          NOW(),NOW()
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
        preparedData.statut_descente || 'En cours',
        preparedData.geom_polygon_wkt || null  // WKT du polygone
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

  // Récupérer toutes les descentes AVEC le polygone en GeoJSON
  findAll: async () => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson  -- Convertir en GeoJSON pour le frontend
      FROM "${tableName}" 
      ORDER BY "createdAt" DESC;
    `;
    try {
      const result = await pool.query(query);
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        return row;
      });
      return rows;
    } catch (error) {
      console.error("❌ Erreur SQL FIND ALL Descente:", error);
      throw error;
    }
  },

  // Récupérer une descente par ID avec polygone
  findById: async (id) => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson
      FROM "${tableName}" 
      WHERE id=$1;
    `;
    try {
      const result = await pool.query(query, [id]);
      if (result.rows[0] && result.rows[0].polygon_geojson) {
        result.rows[0].polygon_geojson = JSON.parse(result.rows[0].polygon_geojson);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Erreur SQL FIND BY ID Descente:", error);
      throw error;
    }
  },

  // Récupérer les descentes avec pagination
  findAllPaginated: async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson,
        COUNT(*) OVER() as total_count
      FROM "${tableName}" 
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2;
    `;
    try {
      const result = await pool.query(query, [limit, offset]);
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        delete row.total_count; // Supprimer le champ de comptage
        return row;
      });
      
      return {
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error("❌ Erreur SQL FIND ALL PAGINATED Descente:", error);
      throw error;
    }
  },

  // Mettre à jour une descente avec polygone
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
        geom_polygon=ST_GeomFromText($26, 4326),  -- Mettre à jour le polygone
        "updatedAt"=NOW()
      WHERE id=$27
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
      preparedData.geom_polygon_wkt || null,  // WKT du polygone
      id
    ];

    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        // Récupérer aussi le polygone en GeoJSON
        const descenteWithPolygon = await pool.query(
          `SELECT *, ST_AsGeoJSON(geom_polygon) as polygon_geojson 
           FROM "${tableName}" WHERE id = $1`,
          [id]
        );
        if (descenteWithPolygon.rows[0] && descenteWithPolygon.rows[0].polygon_geojson) {
          descenteWithPolygon.rows[0].polygon_geojson = JSON.parse(descenteWithPolygon.rows[0].polygon_geojson);
        }
        return descenteWithPolygon.rows[0];
      }
      return null;
    } catch (error) {
      console.error("❌ Erreur SQL UPDATE Descente:", error);
      throw error;
    }
  },

  // Supprimer une descente
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
  },

  // Récupérer toutes les descentes avec leurs relations FT, Avis, Paiement pour la carte
  getForMap: async () => {
    const query = `
      SELECT DISTINCT ON (d.id)
        -- Informations descente
        d.id,
        d.reference,
        d.n_pv_pat,
        d.n_fifafi,
        d.date_descente,
        d.heure_descente,
        d.date_rendez_vous,
        d.heure_rendez_vous,
        d.type_verbalisateur,
        d.nom_verbalisateur,
        d.personne_r,
        d.nom_personne_r,
        d.contact_r,
        d.adresse_r,
        d.district,
        d.commune,
        d.fokontany,
        d.localisation,
        d.superficie,
        d.infraction,
        d.actions,
        d.modele_pv,
        d.dossier_a_fournir,
        d.statut_descente,
        
        -- Coordonnées (utiliser x_coord et y_coord)
        d.x_coord AS laborde_x,
        d.y_coord AS laborde_y,
        
        -- Polygone en GeoJSON
        ST_AsGeoJSON(d.geom_polygon) as polygon_geojson,
        
        -- Relations FT (corrigé: reference_ft au lieu de reference)
        ft.id AS ft_id,
        ft.reference_ft AS ft_reference,
        ft.statut AS ft_statut,
        ft.date_ft,
        ft.statut_dossier AS ft_statut_dossier,
        
        -- Relations Avis
        ap.id AS avis_id,
        ap.iddescente AS avis_iddescente,
        ap.statut AS avis_statut,
        
        -- Relations Paiement
        p.idpaiement AS paiement_id,
        p.iddescente AS paiement_iddescente,
        p.idft AS paiement_idft,
        p.idavis AS paiement_idavis,
        p.montant AS paiement_montant,
        p.date_paiement AS paiement_date,
        p.statut AS paiement_statut,
        p.type_paiement AS paiement_type_paiement,
        p.montant_reste AS paiement_montant_reste,
        p.statut AS paiement_statut

        
      FROM public."Descentes" d
      
      -- LEFT JOIN Fait Terrain (FT)
      LEFT JOIN public.ft ft ON ft.iddescente = d.id
      
      -- LEFT JOIN Avis de paiement
      LEFT JOIN public.avisdepaiement ap ON ap.iddescente = d.id
      
      -- LEFT JOIN Paiement
      LEFT JOIN public.paiement p ON (p.iddescente = d.id OR p.idft = ft.id OR p.idavis = ap.id)
      
      WHERE d.x_coord IS NOT NULL AND d.y_coord IS NOT NULL
      
      ORDER BY d.id, d.date_descente DESC;
    `;
    
    try {
      const result = await pool.query(query);
      
      // Regrouper les résultats pour éviter les doublons
      const descentesMap = new Map();
      
      result.rows.forEach(row => {
        const descenteId = row.id;
        
        if (!descentesMap.has(descenteId)) {
          // Créer la structure de base de la descente
          descentesMap.set(descenteId, {
            // Identifiant
            id: row.id,
            
            // Références
            reference: row.reference,
            n_pv_pat: row.n_pv_pat,
            n_fifafi: row.n_fifafi,
            
            // Dates
            date_descente: row.date_descente,
            heure_descente: row.heure_descente,
            date_rendez_vous: row.date_rendez_vous,
            heure_rendez_vous: row.heure_rendez_vous,
            
            // Personnes
            type_verbalisateur: row.type_verbalisateur,
            nom_verbalisateur: row.nom_verbalisateur,
            personne_r: row.personne_r,
            nom_personne_r: row.nom_personne_r,
            contact_r: row.contact_r,
            adresse_r: row.adresse_r,
            
            // Localisation
            district: row.district,
            commune: row.commune,
            fokontany: row.fokontany,
            localisation: row.localisation,
            superficie: row.superficie,
            
            // Infractions et actions
            infraction: row.infraction || "Infraction non spécifiée",
            actions: row.actions,
            
            // Polygone
            polygon_geojson: row.polygon_geojson ? JSON.parse(row.polygon_geojson) : null,
            
            // Autres
            modele_pv: row.modele_pv,
            dossier_a_fournir: row.dossier_a_fournir,
            statut_descente: row.statut_descente,
            
            // Coordonnées Laborde
            laborde_x: row.laborde_x,
            laborde_y: row.laborde_y,
            
            // Détails des relations
            details: {
              ft_id: null,
              ft_reference: null,
              ft_statut: null,
              ft_date: null,
              ft_statut_dossier: null,
              
              avis_id: null,
              avis_statut: null,
              
              paiement_id: null,
              paiement_montant: null,
              paiement_date: null,
              paiement_statut: null
            }
          });
        }
        
        const descente = descentesMap.get(descenteId);
        
        // Mettre à jour les relations FT si elles existent
        if (row.ft_id && !descente.details.ft_id) {
          descente.details.ft_id = row.ft_id;
          descente.details.ft_reference = row.ft_reference;
          descente.details.ft_statut = row.ft_statut;
          descente.details.ft_date = row.date_ft;
          descente.details.ft_statut_dossier = row.ft_statut_dossier;
        }
        
        // Mettre à jour les relations Avis si elles existent
        if (row.avis_id && !descente.details.avis_id) {
          descente.details.avis_id = row.avis_id;
          descente.details.avis_statut = row.avis_statut;
        }
        
        // Mettre à jour les relations Paiement si elles existent
        if (row.paiement_id && !descente.details.paiement_id) {
          descente.details.paiement_id = row.paiement_id;
          descente.details.paiement_montant = row.paiement_montant;
          descente.details.paiement_date = row.paiement_date;
          descente.details.paiement_statut = row.paiement_statut;
          descente.details.paiement_type_paiement = row.paiement_type_paiement;
          descente.details.paiement_montant_reste = row.paiement_montant_reste;
          descente.details.paiement_statut = row.paiement_statut;
          
        }
      });
      
      // Convertir la Map en tableau
      const descentesArray = Array.from(descentesMap.values());
      
      console.log(`✅ ${descentesArray.length} descentes récupérées pour la carte avec polygones`);
      return descentesArray;
      
    } catch (error) {
      console.error("❌ Erreur SQL getForMap:", error);
      throw error;
    }
  },

  // Récupérer les coordonnées du polygone
  getPolygonPoints: async (id) => {
    const query = `
      SELECT 
        ST_AsGeoJSON(geom_polygon) as geojson,
        ST_AsText(geom_polygon) as wkt
      FROM "${tableName}" 
      WHERE id=$1 AND geom_polygon IS NOT NULL;
    `;
    
    try {
      const result = await pool.query(query, [id]);
      
      if (result.rows[0] && result.rows[0].geojson) {
        const geojson = JSON.parse(result.rows[0].geojson);
        
        // Extraire les points du GeoJSON
        if (geojson.type === 'Polygon' && geojson.coordinates.length > 0) {
          // Le premier anneau contient les coordonnées du polygone
          const coordinates = geojson.coordinates[0];
          
          // Convertir en format similaire à polygon_points
          const points = coordinates.map((coord, index) => ({
            longitude: coord[0],
            latitude: coord[1],
            order: index + 1
          }));
          
          // Supprimer le dernier point (identique au premier dans un polygone fermé)
          if (points.length > 0) {
            points.pop();
          }
          
          return points;
        }
      }
      
      return [];
    } catch (error) {
      console.error("❌ Erreur SQL getPolygonPoints:", error);
      throw error;
    }
  },

  // Récupérer les descentes par district
  findByDistrict: async (district) => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson
      FROM "${tableName}" 
      WHERE district=$1
      ORDER BY "createdAt" DESC;
    `;
    try {
      const result = await pool.query(query, [district]);
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        return row;
      });
      return rows;
    } catch (error) {
      console.error("❌ Erreur SQL FIND BY DISTRICT Descente:", error);
      throw error;
    }
  },

  // Récupérer les descentes par commune
  findByCommune: async (commune) => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson
      FROM "${tableName}" 
      WHERE commune=$1
      ORDER BY "createdAt" DESC;
    `;
    try {
      const result = await pool.query(query, [commune]);
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        return row;
      });
      return rows;
    } catch (error) {
      console.error("❌ Erreur SQL FIND BY COMMUNE Descente:", error);
      throw error;
    }
  },

  // Récupérer les descentes par date
  findByDate: async (date) => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson
      FROM "${tableName}" 
      WHERE date_descente=$1
      ORDER BY "createdAt" DESC;
    `;
    try {
      const result = await pool.query(query, [date]);
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        return row;
      });
      return rows;
    } catch (error) {
      console.error("❌ Erreur SQL FIND BY DATE Descente:", error);
      throw error;
    }
  },

  // Rechercher des descentes par terme
  search: async (searchTerm) => {
    const query = `
      SELECT 
        *,
        ST_AsGeoJSON(geom_polygon) as polygon_geojson
      FROM "${tableName}" 
      WHERE 
        reference ILIKE $1 OR
        n_pv_pat ILIKE $1 OR
        nom_personne_r ILIKE $1 OR
        commune ILIKE $1 OR
        fokontany ILIKE $1 OR
        infraction::text ILIKE $1
      ORDER BY "createdAt" DESC;
    `;
    try {
      const result = await pool.query(query, [`%${searchTerm}%`]);
      // Parser le GeoJSON pour chaque ligne
      const rows = result.rows.map(row => {
        if (row.polygon_geojson) {
          row.polygon_geojson = JSON.parse(row.polygon_geojson);
        }
        return row;
      });
      return rows;
    } catch (error) {
      console.error("❌ Erreur SQL SEARCH Descente:", error);
      throw error;
    }
  },

  // Compter le nombre total de descentes
  count: async () => {
    const query = `SELECT COUNT(*) as total FROM "${tableName}";`;
    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error("❌ Erreur SQL COUNT Descente:", error);
      throw error;
    }
  },

  // Mettre à jour uniquement le polygone
  updatePolygon: async (id, polygon_points) => {
    try {
      const geom_polygon_wkt = pointsToPolygonWKT(polygon_points);
      
      const query = `
        UPDATE "${tableName}" 
        SET 
          geom_polygon = ST_GeomFromText($1, 4326),
          "updatedAt" = NOW()
        WHERE id = $2
        RETURNING *;
      `;
      
      const result = await pool.query(query, [geom_polygon_wkt, id]);
      
      if (result.rows[0]) {
        // Récupérer aussi le polygone en GeoJSON
        const descenteWithPolygon = await pool.query(
          `SELECT *, ST_AsGeoJSON(geom_polygon) as polygon_geojson 
           FROM "${tableName}" WHERE id = $1`,
          [id]
        );
        if (descenteWithPolygon.rows[0] && descenteWithPolygon.rows[0].polygon_geojson) {
          descenteWithPolygon.rows[0].polygon_geojson = JSON.parse(descenteWithPolygon.rows[0].polygon_geojson);
        }
        return descenteWithPolygon.rows[0];
      }
      return null;
    } catch (error) {
      console.error("❌ Erreur SQL UPDATE POLYGON Descente:", error);
      throw error;
    }
  },

  // Calculer la superficie réelle à partir du polygone
  calculateSurface: async (id) => {
    const query = `
      SELECT 
        ST_Area(geom_polygon::geography) as surface_m2,
        ST_Area(geom_polygon::geography) / 10000 as surface_ha
      FROM "${tableName}" 
      WHERE id=$1 AND geom_polygon IS NOT NULL;
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows[0]) {
        return {
          surface_m2: parseFloat(result.rows[0].surface_m2),
          surface_ha: parseFloat(result.rows[0].surface_ha)
        };
      }
      return null;
    } catch (error) {
      console.error("❌ Erreur SQL CALCULATE SURFACE Descente:", error);
      throw error;
    }
  }
};