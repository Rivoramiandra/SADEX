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
    statut_descente: formData.statut_descente
  };
};

// Créer une descente
export const createDescente = async (req, res) => {
  try {
    console.log("📨 Requête POST /descentes:", req.body);
    
    // Mapper les données
    const mappedData = mapFormDataToModel(req.body);
    console.log("📋 Données mappées:", mappedData);
    
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

// Récupérer une descente par ID
export const getDescenteById = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes/:id", req.params.id);
    const descente = await Descente.findById(req.params.id);
    if (!descente) return res.status(404).json({ error: "Descente non trouvée" });
    
    // Mapper les données du modèle vers le frontend
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
      statut_descente: descente.statut_descente
    };
    
    res.status(200).json(mappedData);
  } catch (err) {
    console.error("❌ Erreur getDescenteById:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération de la descente",
      details: err.message 
    });
  }
};

// Mettre à jour une descente
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

// Les autres fonctions restent les mêmes
export const getAllDescentes = async (req, res) => {
  try {
    console.log("📨 Requête GET /descentes");
    const descentes = await Descente.findAll();
    res.status(200).json(descentes);
  } catch (err) {
    console.error("❌ Erreur getAllDescentes:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des descentes",
      details: err.message 
    });
  }
};

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