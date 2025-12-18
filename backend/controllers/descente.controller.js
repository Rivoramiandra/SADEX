import Descente from "../models/descente.model.js";

// Fonction pour mapper les données du frontend vers le modèle
const mapFormDataToModel = (formData) => {
  return {
    // Date & heure
    date_descente: formData.date_descente || formData.date,
    heure_descente: formData.heure_descente || formData.heure,
    date_rendez_vous: formData.date_rendez_vous || formData.date_rdv_ft,
    heure_rendez_vous: formData.heure_rendez_vous || formData.heure_rdv_ft,
    
    // Références
    n_pv_pat: formData.n_pv_pat,
    n_fifafi: formData.n_fifafi,
    type_verbalisateur: formData.type_verbalisateur,
    nom_verbalisateur: formData.nom_verbalisateur,
    modele_pv: formData.modele_pv,
    reference: formData.reference,
    ref_om: formData.ref_om,
    ref_rapport: formData.ref_rapport,
    
    // Personnes
    personne_r: formData.personne_r || formData.pers_verb,
    nom_personne_r: formData.nom_personne_r || formData.nom_pers,
    adresse_r: formData.adresse_r || formData.adresse,
    contact_r: formData.contact_r || formData.contact,
    
    // Localisation
    district: formData.district || formData.dist,
    commune: formData.commune || formData.comm,
    fokontany: formData.fokontany || formData.fkt,
    localisation: formData.localisation,
    superficie: formData.superficie,
    x_coord: formData.x_coord || formData.x,
    y_coord: formData.y_coord || formData.y,
    
    // Infractions & actions
    infraction: formData.infraction || formData.constat,
    actions: formData.actions || formData.action,
    
    // Pièces & statut
    dossier_a_fournir: formData.dossier_a_fournir || formData.pieces_a_fournir,
    statut_descente: formData.statut_descente,
    
    // NOUVEAU : Points du polygone
    polygon_points: formData.polygon_points || formData.polygon || formData.geometry_points,
    
    // NOUVEAU : Type de géométrie
    geometry_type: formData.geometry_type || 'polygon'
  };
};

// Fonction pour mapper les données du modèle vers le frontend
const mapModelToFormData = (descente) => {
  const mappedData = {
    // Date & heure
    date: descente.date_descente,
    heure: descente.heure_descente,
    date_rdv_ft: descente.date_rendez_vous,
    heure_rdv_ft: descente.heure_rendez_vous,
    
    // Références
    n_pv_pat: descente.n_pv_pat,
    n_fifafi: descente.n_fifafi,
    type_verbalisateur: descente.type_verbalisateur,
    nom_verbalisateur: descente.nom_verbalisateur,
    modele_pv: descente.modele_pv,
    reference: descente.reference,
    ref_om: descente.ref_om,
    ref_rapport: descente.ref_rapport,
    
    // Personnes
    pers_verb: descente.personne_r,
    nom_pers: descente.nom_personne_r,
    adresse: descente.adresse_r,
    contact: descente.contact_r,
    
    // Localisation
    dist: descente.district,
    comm: descente.commune,
    fkt: descente.fokontany,
    localisation: descente.localisation,
    superficie: descente.superficie,
    x: descente.x_coord,
    y: descente.y_coord,
    
    // Infractions & actions
    constat: descente.infraction,
    action: descente.actions,
    
    // Pièces & statut
    pieces_a_fournir: descente.dossier_a_fournir,
    statut_descente: descente.statut_descente,
    
    // NOUVEAU : Informations sur le polygone
    polygon_geojson: descente.polygon_geojson,
    has_polygon: !!descente.polygon_geojson
  };
  
  // Ajouter les points du polygone si disponible
  if (descente.polygon_points) {
    mappedData.polygon_points = descente.polygon_points;
  } else if (descente.polygon_geojson) {
    // Extraire les points du GeoJSON
    try {
      const geojson = descente.polygon_geojson;
      if (geojson.type === 'Polygon' && geojson.coordinates.length > 0) {
        const coordinates = geojson.coordinates[0];
        mappedData.polygon_points = coordinates.map((coord, index) => ({
          longitude: coord[0],
          latitude: coord[1],
          order: index + 1
        })).slice(0, -1); // Supprimer le dernier point (fermeture du polygone)
      }
    } catch (error) {
      console.error("Erreur extraction points GeoJSON:", error);
    }
  }
  
  return mappedData;
};

// Fonction de conversion Laborde vers WGS84
const convertLabordeToWGS84 = (x, y) => {
  try {
    const proj4 = require('proj4');
    
    // Définition de la projection Laborde Madagascar (EPSG:8441)
    proj4.defs("EPSG:8441",
      "+proj=omerc +lat_0=-18.9 +lonc=46.43722916666667 +alpha=18.9 +k=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs"
    );
    
    const result = proj4("EPSG:8441", "EPSG:4326", [x, y]);
    return [result[1], result[0]]; // [lat, lng]
  } catch (error) {
    console.error("Erreur conversion proj4:", error);
    throw new Error("Échec de conversion des coordonnées");
  }
};

// Créer une descente AVEC polygone
export const createDescente = async (req, res) => {
  try {
    console.log("📨 Requête POST /descentes:", req.body);
    
    // Mapper les données (inclut polygon_points)
    const mappedData = mapFormDataToModel(req.body);
    console.log("📋 Données mappées:", mappedData);
    
    // Vérifier s'il y a un polygone
    if (mappedData.polygon_points) {
      console.log(`📍 Polygone reçu avec ${mappedData.polygon_points.length} points`);
      
      // Calculer le centroïde si pas de coordonnées fournies
      if (!mappedData.x_coord || !mappedData.y_coord) {
        const points = mappedData.polygon_points;
        if (points && points.length > 0) {
          // Calcul simple du centre
          const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
          const sumLon = points.reduce((sum, p) => sum + p.longitude, 0);
          mappedData.x_coord = sumLon / points.length;
          mappedData.y_coord = sumLat / points.length;
          console.log(`📍 Centroïde calculé: ${mappedData.x_coord}, ${mappedData.y_coord}`);
        }
      }
    }
    
    const descente = await Descente.create(mappedData);
    
    res.status(201).json({
      message: "Descente créée avec succès",
      data: descente
    });
  } catch (err) {
    console.error("❌ Erreur createDescente:", err);
    res.status(500).json({ 
      error: "Erreur lors de la création de la descente",
      details: err.message 
    });
  }
};

// Récupérer une descente par ID AVEC polygone
export const getDescenteById = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes/:id", req.params.id);
    const descente = await Descente.findById(req.params.id);
    if (!descente) return res.status(404).json({ error: "Descente non trouvée" });
    
    // Mapper les données du modèle vers le frontend
    const mappedData = mapModelToFormData(descente);
    
    res.status(200).json(mappedData);
  } catch (err) {
    console.error("❌ Erreur getDescenteById:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération de la descente",
      details: err.message 
    });
  }
};

// Mettre à jour une descente AVEC polygone
export const updateDescente = async (req, res) => {
  try {
    console.log("📨 Requête PUT /descentes/:id", req.params.id, req.body);
    
    // Mapper les données
    const mappedData = mapFormDataToModel(req.body);
    console.log("📋 Données mappées pour update:", mappedData);
    
    const updatedDescente = await Descente.update(req.params.id, mappedData);
    if (!updatedDescente) return res.status(404).json({ error: "Descente non trouvée" });
    
    res.status(200).json({
      message: "Descente mise à jour avec succès",
      data: updatedDescente
    });
  } catch (err) {
    console.error("❌ Erreur updateDescente:", err);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour de la descente",
      details: err.message 
    });
  }
};

// Mettre à jour uniquement le polygone d'une descente
export const updateDescentePolygon = async (req, res) => {
  try {
    const { id } = req.params;
    const { polygon_points } = req.body;
    
    console.log(`📨 Requête PUT /descentes/${id}/polygon avec ${polygon_points?.length || 0} points`);
    
    if (!polygon_points || polygon_points.length < 3) {
      return res.status(400).json({ 
        error: "Un polygone nécessite au moins 3 points" 
      });
    }
    
    const updatedDescente = await Descente.updatePolygon(id, polygon_points);
    if (!updatedDescente) return res.status(404).json({ error: "Descente non trouvée" });
    
    res.status(200).json({
      message: "Polygone mis à jour avec succès",
      data: updatedDescente
    });
  } catch (err) {
    console.error("❌ Erreur updateDescentePolygon:", err);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du polygone",
      details: err.message 
    });
  }
};

// Récupérer les points du polygone d'une descente
export const getDescentePolygon = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📨 Requête GET /descentes/${id}/polygon`);
    
    const polygonPoints = await Descente.getPolygonPoints(id);
    
    res.status(200).json({
      success: true,
      data: polygonPoints
    });
  } catch (err) {
    console.error("❌ Erreur getDescentePolygon:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération du polygone",
      details: err.message 
    });
  }
};

// Calculer la superficie réelle d'une descente à partir du polygone
export const calculateDescenteSurface = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📨 Requête GET /descentes/${id}/surface`);
    
    const surfaceData = await Descente.calculateSurface(id);
    
    if (!surfaceData) {
      return res.status(404).json({ 
        error: "Surface non calculable (polygone non trouvé)" 
      });
    }
    
    res.status(200).json({
      success: true,
      data: surfaceData
    });
  } catch (err) {
    console.error("❌ Erreur calculateDescenteSurface:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors du calcul de la superficie",
      details: err.message 
    });
  }
};

// Récupérer toutes les descentes AVEC polygones
export const getAllDescentes = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes");
    const descentes = await Descente.findAll();
    
    // Convertir les descentes au format frontend
    const formattedDescentes = descentes.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json(formattedDescentes);
  } catch (err) {
    console.error("❌ Erreur getAllDescentes:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des descentes",
      details: err.message 
    });
  }
};

// Récupérer les descentes avec pagination
export const getDescentesPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`📨 Requête GET /descentes/paginated?page=${page}&limit=${limit}`);
    
    const result = await Descente.findAllPaginated(page, limit);
    
    // Formater les données
    result.data = result.data.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Erreur getDescentesPaginated:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération paginée des descentes",
      details: err.message 
    });
  }
};

// Supprimer une descente
export const deleteDescente = async (req, res) => {
  try {
    console.log("📨 Requête DELETE /descentes/:id", req.params.id);
    const deletedDescente = await Descente.delete(req.params.id);
    if (!deletedDescente) return res.status(404).json({ error: "Descente non trouvée" });
    res.status(200).json({ message: "Descente supprimée avec succès" });
  } catch (err) {
    console.error("❌ Erreur deleteDescente:", err);
    res.status(500).json({ 
      error: "Erreur lors de la suppression de la descente",
      details: err.message 
    });
  }
};

// Récupérer toutes les descentes pour la carte AVEC polygones
export const getAllDescentesForMap = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes/carte");
    
    // Utiliser la nouvelle méthode getForMap
    const descentes = await Descente.getForMap();
    
    // Fonction de conversion Laborde vers WGS84
    const convertLabordeToWGS84 = (x, y) => {
      if (!x || !y || x === 0 || y === 0 || isNaN(x) || isNaN(y)) {
        return [null, null];
      }
      
      try {
        const proj4 = require('proj4');
        
        // Définition de la projection Laborde Madagascar (EPSG:8441)
        proj4.defs("EPSG:8441",
          "+proj=omerc +lat_0=-18.9 +lonc=46.43722916666667 +alpha=18.9 +k=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs"
        );
        
        const result = proj4("EPSG:8441", "EPSG:4326", [x, y]);
        return [result[1], result[0]]; // [lat, lng]
      } catch (error) {
        console.error("Erreur conversion proj4:", error);
        return [null, null];
      }
    };
    
    // Traiter les descentes pour la carte
    const descentesForMap = descentes.map(descente => {
      let lat = descente.lat;
      let lng = descente.lng;
      let labordeX = descente.laborde_x || descente.x_coord;
      let labordeY = descente.laborde_y || descente.y_coord;
      
      // Si pas de lat/lng mais des coordonnées Laborde, convertir
      if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && labordeX && labordeY) {
        try {
          [lat, lng] = convertLabordeToWGS84(labordeX, labordeY);
          console.log(`📍 Conversion ${descente.id}: Laborde(${labordeX}, ${labordeY}) → WGS84(${lat}, ${lng})`);
        } catch (error) {
          console.error(`❌ Erreur conversion pour descente ${descente.id}:`, error);
          lat = -18.8792;
          lng = 47.5079;
        }
      }
      
      // Si toujours pas de coordonnées valides, utiliser des valeurs par défaut
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = -18.8792;
        lng = 47.5079;
      }
      
      // Extraire les points du polygone pour le frontend
      let polygon_points = [];
      if (descente.polygon_geojson) {
        try {
          const geojson = descente.polygon_geojson;
          if (geojson.type === 'Polygon' && geojson.coordinates.length > 0) {
            const coordinates = geojson.coordinates[0];
            polygon_points = coordinates.map((coord, index) => ({
              longitude: coord[0],
              latitude: coord[1],
              order: index + 1
            })).slice(0, -1); // Supprimer le dernier point (fermeture)
          }
        } catch (error) {
          console.error(`Erreur extraction polygone descente ${descente.id}:`, error);
        }
      }
      
      return {
        id: descente.id,
        reference: descente.reference,
        localisation: descente.localisation || descente.commune || "Non spécifié",
        commune: descente.commune,
        district: descente.district,
        fokontany: descente.fokontany,
        verbalisateur: descente.nom_verbalisateur,
        type_verbalisateur: descente.type_verbalisateur,
        infraction: descente.infraction,
        actions: descente.actions,
        date_descente: descente.date_descente,
        heure_descente: descente.heure_descente,
        date_rendez_vous: descente.date_rendez_vous,
        heure_rendez_vous: descente.heure_rendez_vous,
        personne_r: descente.personne_r,
        nom_personne_r: descente.nom_personne_r,
        contact_r: descente.contact_r,
        adresse_r: descente.adresse_r,
        superficie: descente.superficie,
        dossier_a_fournir: descente.dossier_a_fournir,
        statut_descente: descente.statut_descente,
        modele_pv: descente.modele_pv,
        n_pv_pat: descente.n_pv_pat,
        n_fifafi: descente.n_fifafi,
        ref_om: descente.ref_om,
        ref_rapport: descente.ref_rapport,
        
        // Coordonnées pour la carte
        lat: lat,
        lng: lng,
        laborde_x: labordeX,
        laborde_y: labordeY,
        
        // Polygone pour affichage sur carte
        polygon_geojson: descente.polygon_geojson,
        polygon_points: polygon_points,
        has_polygon: !!descente.polygon_geojson,
        
        // Détails des relations
        details: descente.details
      };
    });
    
    res.status(200).json({
      success: true,
      count: descentesForMap.length,
      data: descentesForMap,
      message: `${descentesForMap.length} descentes récupérées avec relations FT/Avis/Paiement et polygones`
    });
  } catch (err) {
    console.error("❌ Erreur getAllDescentesForMap:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération des descentes pour la carte",
      details: err.message 
    });
  }
};

// Récupérer les coordonnées en WGS84
export const getDescentesWGS84 = async (req, res) => {
  try {
    const descentes = await Descente.findAll();
    
    const result = descentes.map(descente => {
      const x = descente.x_coord || descente.x;
      const y = descente.y_coord || descente.y;
      
      let wgs84Lat = null;
      let wgs84Lng = null;
      
      if (x && y) {
        try {
          [wgs84Lat, wgs84Lng] = convertLabordeToWGS84(x, y);
        } catch (error) {
          console.error(`Erreur conversion ${descente.id}:`, error);
        }
      }
      
      return {
        id: descente.id,
        reference: descente.reference,
        // Système Laborde (coordonnées projetées en mètres)
        laborde: {
          x: x,
          y: y
        },
        // Système WGS84 (coordonnées géographiques pour Leaflet)
        wgs84: {
          lat: wgs84Lat,
          lng: wgs84Lng
        },
        localisation: descente.localisation,
        commune: descente.commune,
        district: descente.district,
        // Informations sur le polygone
        has_polygon: !!descente.polygon_geojson,
        polygon_geojson: descente.polygon_geojson
      };
    });
    
    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error("❌ Erreur getDescentesWGS84:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la conversion des coordonnées",
      details: err.message 
    });
  }
};

// Récupérer les descentes par district
export const getDescentesByDistrict = async (req, res) => {
  try {
    const { district } = req.params;
    console.log(`📨 Requête GET /descentes/district/${district}`);
    
    const descentes = await Descente.findByDistrict(district);
    
    const formattedDescentes = descentes.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json({
      success: true,
      count: formattedDescentes.length,
      data: formattedDescentes
    });
  } catch (err) {
    console.error("❌ Erreur getDescentesByDistrict:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération des descentes par district",
      details: err.message 
    });
  }
};

// Récupérer les descentes par commune
export const getDescentesByCommune = async (req, res) => {
  try {
    const { commune } = req.params;
    console.log(`📨 Requête GET /descentes/commune/${commune}`);
    
    const descentes = await Descente.findByCommune(commune);
    
    const formattedDescentes = descentes.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json({
      success: true,
      count: formattedDescentes.length,
      data: formattedDescentes
    });
  } catch (err) {
    console.error("❌ Erreur getDescentesByCommune:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération des descentes par commune",
      details: err.message 
    });
  }
};

// Récupérer les descentes par date
export const getDescentesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`📨 Requête GET /descentes/date/${date}`);
    
    const descentes = await Descente.findByDate(date);
    
    const formattedDescentes = descentes.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json({
      success: true,
      count: formattedDescentes.length,
      data: formattedDescentes
    });
  } catch (err) {
    console.error("❌ Erreur getDescentesByDate:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération des descentes par date",
      details: err.message 
    });
  }
};

// Rechercher des descentes
export const searchDescentes = async (req, res) => {
  try {
    const { q } = req.query;
    console.log(`📨 Requête GET /descentes/search?q=${q}`);
    
    if (!q) {
      return res.status(400).json({ 
        error: "Le terme de recherche est requis" 
      });
    }
    
    const descentes = await Descente.search(q);
    
    const formattedDescentes = descentes.map(descente => 
      mapModelToFormData(descente)
    );
    
    res.status(200).json({
      success: true,
      count: formattedDescentes.length,
      data: formattedDescentes
    });
  } catch (err) {
    console.error("❌ Erreur searchDescentes:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la recherche des descentes",
      details: err.message 
    });
  }
};

// Statistiques des descentes
export const getDescentesStats = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes/stats");
    
    // Récupérer toutes les descentes pour calculer les stats
    const descentes = await Descente.findAll();
    
    const stats = {
      total: descentes.length,
      by_district: {},
      by_commune: {},
      by_infraction: {},
      by_status: {},
      with_polygon: 0,
      without_polygon: 0
    };
    
    descentes.forEach(descente => {
      // Stats par district
      const district = descente.district || 'Non spécifié';
      stats.by_district[district] = (stats.by_district[district] || 0) + 1;
      
      // Stats par commune
      const commune = descente.commune || 'Non spécifiée';
      stats.by_commune[commune] = (stats.by_commune[commune] || 0) + 1;
      
      // Stats par infraction
      if (descente.infraction) {
        const infractions = Array.isArray(descente.infraction) ? descente.infraction : [descente.infraction];
        infractions.forEach(inf => {
          stats.by_infraction[inf] = (stats.by_infraction[inf] || 0) + 1;
        });
      }
      
      // Stats par statut
      const status = descente.statut_descente || 'En cours';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      
      // Stats polygone
      if (descente.polygon_geojson) {
        stats.with_polygon++;
      } else {
        stats.without_polygon++;
      }
    });
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error("❌ Erreur getDescentesStats:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la récupération des statistiques",
      details: err.message 
    });
  }
};