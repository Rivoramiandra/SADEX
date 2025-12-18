import React, { useEffect, useState, useRef } from "react";
import {
  Map,
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Satellite,
  X,
  Filter,
  List,
  Calendar,
  User,
  FileText,
  Navigation,
  Globe,
  Hash,
  MapPinned,
  Phone,
  Home,
  CheckCircle,
  AlertCircle,
  Shapes,
  Target,
  AlertTriangle,
  Landmark,
  FileCheck,
  ClipboardList
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polygon as LeafletPolygon,
  Polyline
} from "react-leaflet";
import L from "leaflet";
import proj4 from "proj4";
import "leaflet/dist/leaflet.css";

// --- DÉFINITIONS DES ICÔNES ---
const descenteIconRouge = new L.DivIcon({
  className: "custom-descente-icon-rouge",
  html: '<div style="width:14px;height:14px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
const descenteIconJaune = new L.DivIcon({
  className: "custom-descente-icon-jaune",
  html: '<div style="width:14px;height:14px;background-color:#eab308;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
const descenteIconBleu = new L.DivIcon({
  className: "custom-descente-icon-bleu",
  html: '<div style="width:14px;height:14px;background-color:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
const descenteIconVert = new L.DivIcon({
  className: "custom-descente-icon-vert",
  html: '<div style="width:14px;height:14px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
// Icône pour le point de descente dans le polygone (ORANGE) - maintenant le centre
const descentePointInPolygonIcon = new L.DivIcon({
  className: "custom-descente-in-polygon-icon",
  html: '<div style="width:14px;height:14px;background-color:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.8);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
// Icône pour le résultat de recherche
const searchIcon = new L.DivIcon({
  className: "custom-search-icon",
  html: '<div style="width:16px;height:16px;background-color:#a855f7;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

// --- Définition projection EPSG:8441 (Laborde Madagascar) ---
try {
  proj4.defs(
    "EPSG:8441",
    "+proj=omerc +lat_0=-18.9 +lonc=46.43722916666667 +alpha=18.9 +k=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs"
  );
} catch (e) {
  console.error("Erreur enregistrement EPSG:8441:", e);
}

// --- Fonctions utilitaires ---
// Fonction pour convertir Laborde vers WGS84
const convertLabordeToWGS84 = (x, y) => {
  try {
    if (!x || !y || isNaN(x) || isNaN(y)) return null;
   
    // proj4 attend [x, y] et retourne [lng, lat]
    const result = proj4("EPSG:8441", "EPSG:4326", [parseFloat(x), parseFloat(y)]);
   
    // Vérifier si le résultat est valide pour Madagascar
    const lat = result[1];
    const lng = result[0];
   
    if (lat < -26 || lat > -12 || lng < 43 || lng > 51) {
      console.warn(`Coordonnées hors de Madagascar: lat=${lat}, lng=${lng}`);
      return null;
    }
   
    // Retourner [lat, lng] pour Leaflet
    return [lat, lng];
  } catch (error) {
    console.error("Erreur conversion Laborde:", error, "x:", x, "y:", y);
    return null;
  }
};

// Fonction pour vérifier si des coordonnées sont en Laborde (valeurs en mètres)
const isLabordeCoordinates = (x, y) => {
  if (!x || !y || isNaN(x) || isNaN(y)) return false;
  return x > 100000 && x < 1000000 && y > 100000 && y < 1000000;
};

// Fonction pour vérifier si c'est la valeur par défaut (-18.8792, 47.5079)
const isDefaultCoordinates = (lat, lng) => {
  return lat === -18.8792 && lng === 47.5079;
};

// Fonction pour déterminer la couleur d'une descente
const getDescenteCouleur = (descente) => {
  const { details } = descente;
  if (details?.paiement_id) return 'vert';
  if (details?.avis_id) return 'bleu';
  if (details?.ft_id) return 'jaune';
  return 'rouge';
};

// Fonction pour déterminer le statut affiché
const getDescenteStatut = (descente) => {
  const { details } = descente;
  if (details?.paiement_id) return 'Paiement effectué';
  if (details?.avis_id) return 'Avis de paiement émis';
  if (details?.ft_id) return 'FT créé';
  return 'En attente';
};

// Fonction pour obtenir l'icône d'une descente
const getDescenteIcon = (descente) => {
  const { details } = descente;
  if (details?.paiement_id) return descenteIconVert;
  if (details?.avis_id) return descenteIconBleu;
  if (details?.ft_id) return descenteIconJaune;
  return descenteIconRouge;
};

// Fonction pour formater une date
const formatDate = (dateString) => {
  if (!dateString) return "Non spécifié";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Fonction pour formater une heure
const formatHeure = (heureString) => {
  if (!heureString) return "";
  return heureString;
};

// Fonction pour afficher les coordonnées de façon sécurisée
const safeCoordinateDisplay = (coord) => {
  if (coord === undefined || coord === null || isNaN(coord) || !isFinite(coord)) {
    return "N/A";
  }
  return coord.toFixed(6);
};

// Calculer le centre géométrique du polygone
const calculatePolygonCenter = (polygon) => {
  if (!polygon || polygon.type !== 'Polygon') return null;
 
  const coordinates = polygon.coordinates[0];
  if (!coordinates || coordinates.length === 0) return null;
 
  let sumLat = 0;
  let sumLng = 0;
 
  coordinates.forEach(coord => {
    // GeoJSON: [lng, lat]
    sumLng += coord[0];
    sumLat += coord[1];
  });
 
  return [sumLat / coordinates.length, sumLng / coordinates.length];
};

// --- Composant DetailedPopup ---
const DetailedPopup = ({ descente }) => {
  const couleur = getDescenteCouleur(descente);
  const statut = getDescenteStatut(descente);
  
  return (
    <div className="space-y-3 min-w-[320px] max-h-[70vh] overflow-y-auto p-1">
      {/* Badge d'état */}
      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-block mb-2 ${
        couleur === 'vert' ? 'bg-green-100 text-green-800' :
        couleur === 'bleu' ? 'bg-blue-100 text-blue-800' :
        couleur === 'jaune' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {statut}
      </div>
 
      {/* Information coordonnées CORRIGÉES */}
      <div className="bg-blue-50 p-2 rounded border border-blue-200">
        <h4 className="font-semibold text-blue-700 text-sm mb-1 flex items-center gap-1">
          <Target className="w-4 h-4" /> Coordonnées
          {descente.has_polygon && <span className="text-orange-600 text-xs ml-2">(Centre du polygone)</span>}
        </h4>
        <div className="text-xs space-y-1">
          <div>
            <span className="font-medium text-blue-600">WGS84:</span>
            <div className="text-blue-800">
              Lat: {safeCoordinateDisplay(descente.displayLat)}<br/>
              Lon: {safeCoordinateDisplay(descente.displayLng)}
            </div>
          </div>
          {descente.laborde_x && descente.laborde_y && (
            <div>
              <span className="font-medium text-blue-600">Laborde:</span>
              <div className="text-blue-800">
                X: {parseFloat(descente.laborde_x).toFixed(2)}<br/>
                Y: {parseFloat(descente.laborde_y).toFixed(2)}
            </div>
            </div>
          )}
          {descente.has_polygon && (
            <div className="mt-2 p-1 bg-orange-50 rounded text-orange-700 text-xs">
              ✅ Point positionné au centre géométrique du polygone
            </div>
          )}
        </div>
      </div>
 
      {/* En-tête */}
      <div className="border-b pb-3">
        <h3 className="font-bold text-lg text-slate-800">
          Descente {descente.reference || `#${descente.id}`}
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          {descente.date_descente && (
            <>
              <Calendar className="w-3 h-3 inline mr-1" />
              {formatDate(descente.date_descente)}
              {descente.heure_descente && ` à ${formatHeure(descente.heure_descente)}`}
            </>
          )}
        </p>
      </div>
 
      {/* État des étapes */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" /> État des étapes
        </h4>
        <div className="text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${descente.details?.ft_id ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <span className="text-slate-600">FT créé:</span>
            </div>
            <span className={`font-medium ${descente.details?.ft_id ? 'text-green-600' : 'text-red-600'}`}>
              {descente.details?.ft_id ? '✓ Fini' : '⨯ Non fini'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${descente.details?.avis_id ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-slate-600">Avis de paiement:</span>
            </div>
            <span className={`font-medium ${descente.details?.avis_id ? 'text-green-600' : 'text-red-600'}`}>
              {descente.details?.avis_id ? '✓ Fini' : '⨯ Non fini'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${descente.details?.paiement_id ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-slate-600">Paiement:</span>
            </div>
            <span className={`font-medium ${descente.details?.paiement_id ? 'text-green-600' : 'text-red-600'}`}>
              {descente.details?.paiement_id ? '✓ Fini' : '⨯ Non fini'}
            </span>
          </div>
        </div>
      </div>
 
      {/* Informations principales */}
      <div className="grid grid-cols-1 gap-3">
        {/* Références */}
        <div>
          <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
            <Hash className="w-4 h-4" /> Références
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {descente.n_pv_pat && (
              <div>
                <span className="font-medium">N° PV/PAT:</span>
                <div className="text-slate-600">{descente.n_pv_pat}</div>
              </div>
            )}
            {descente.n_fifafi && (
              <div>
                <span className="font-medium">N° FIFAFI:</span>
                <div className="text-slate-600">{descente.n_fifafi}</div>
              </div>
            )}
            {descente.ref_om && (
              <div>
                <span className="font-medium">Ref OM:</span>
                <div className="text-slate-600">{descente.ref_om}</div>
              </div>
            )}
            {descente.ref_rapport && (
              <div>
                <span className="font-medium">Ref Rapport:</span>
                <div className="text-slate-600">{descente.ref_rapport}</div>
              </div>
            )}
          </div>
        </div>
   
        {/* Localisation */}
        <div>
          <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
            <MapPinned className="w-4 h-4" /> Localisation
          </h4>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Localité:</span> {descente.localisation || 'Non spécifié'}</div>
            <div className="grid grid-cols-2 gap-2">
              {descente.district && (
                <div>
                  <span className="font-medium">District:</span>
                  <div className="text-slate-600">{descente.district}</div>
                </div>
              )}
              {descente.commune && (
                <div>
                  <span className="font-medium">Commune:</span>
                  <div className="text-slate-600">{descente.commune}</div>
                </div>
              )}
              {descente.fokontany && (
                <div>
                  <span className="font-medium">Fokontany:</span>
                  <div className="text-slate-600">{descente.fokontany}</div>
                </div>
              )}
              {descente.superficie && (
                <div>
                  <span className="font-medium">Superficie:</span>
                  <div className="text-slate-600">{descente.superficie}</div>
                </div>
              )}
            </div>
          </div>
        </div>
   
        {/* Personnes concernées */}
        <div>
          <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
            <User className="w-4 h-4" /> Personnes concernées
          </h4>
          <div className="text-sm space-y-1">
            {descente.nom_verbalisateur && (
              <div>
                <span className="font-medium">Verbalisateur:</span>
                <div className="text-slate-600">{descente.nom_verbalisateur}</div>
                {descente.type_verbalisateur && (
                  <div className="text-xs text-slate-500">({descente.type_verbalisateur})</div>
                )}
              </div>
            )}
            {descente.nom_personne_r && (
              <div>
                <span className="font-medium">Personne R:</span>
                <div className="text-slate-600">{descente.nom_personne_r}</div>
                {descente.personne_r && (
                  <div className="text-xs text-slate-500">({descente.personne_r})</div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-1">
              {descente.contact_r && (
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact:
                  </span>
                  <div className="text-slate-600">{descente.contact_r}</div>
                </div>
              )}
              {descente.adresse_r && (
                <div>
                  <span className="font-medium">Adresse:</span>
                  <div className="text-slate-600">{descente.adresse_r}</div>
                </div>
              )}
            </div>
          </div>
        </div>
   
        {/* Infractions et actions */}
        <div>
          <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
            <FileText className="w-4 h-4" /> Constatations
          </h4>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Infraction:</span>
              <div className="text-slate-600 mt-1">
                {Array.isArray(descente.infraction)
                  ? descente.infraction.map((inf, idx) => (
                      <div key={idx} className="flex items-start gap-1 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <span>{inf}</span>
                      </div>
                    ))
                  : <div className="flex items-start gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                      <span>{descente.infraction}</span>
                    </div>
                }
              </div>
            </div>
            {descente.actions && (
              <div>
                <span className="font-medium">Actions:</span>
                <div className="text-slate-600 mt-1">
                  {Array.isArray(descente.actions)
                    ? descente.actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-1 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                          <span>{action}</span>
                        </div>
                      ))
                    : <div className="flex items-start gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                        <span>{descente.actions}</span>
                      </div>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
   
        {/* Rendez-vous */}
        {descente.date_rendez_vous && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <h4 className="font-semibold text-yellow-700 text-sm mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Rendez-vous fixé
            </h4>
            <div className="text-sm text-yellow-600">
              {formatDate(descente.date_rendez_vous)}
              {descente.heure_rendez_vous && ` à ${formatHeure(descente.heure_rendez_vous)}`}
            </div>
          </div>
        )}
   
        {/* Pièces à fournir */}
        {descente.dossier_a_fournir && (
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <h4 className="font-semibold text-blue-700 text-sm mb-1">📄 Pièces à fournir</h4>
            <ul className="text-xs text-blue-600 list-disc pl-4">
              {Array.isArray(descente.dossier_a_fournir)
                ? descente.dossier_a_fournir.map((piece, idx) => (
                    <li key={idx}>{piece}</li>
                  ))
                : <li>{descente.dossier_a_fournir}</li>
              }
            </ul>
          </div>
        )}
   
        {/* Informations techniques */}
        <div className="border-t pt-3">
          <h4 className="font-semibold text-slate-700 text-sm mb-1">📋 Informations techniques</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {descente.modele_pv && (
              <div>
                <span className="font-medium">Modèle PV:</span>
                <div className="text-slate-600">{descente.modele_pv}</div>
              </div>
            )}
            <div>
              <span className="font-medium">ID Descente:</span>
              <div className="text-slate-600">{descente.id}</div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Bouton d'action */}
      <div className="pt-3 border-t">
        <a
          href={`/descentes/${descente.id}`}
          className="inline-block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
        >
          Voir les détails complets
        </a>
      </div>
    </div>
  );
};

// --- Composant DescentePolygonLayer ---
const DescentePolygonLayer = ({ descentes, showPolygons }) => {
  const map = useMap();
 
  if (!showPolygons) return null;
 
  // Filtrer les descentes avec polygone
  const descentesWithPolygons = descentes.filter(d =>
    d.polygon_geojson && d.polygon_geojson.type === 'Polygon'
  );
 
  if (descentesWithPolygons.length === 0) return null;
  
  // Style AMÉLIORÉ pour les polygones de descente - couleurs plus contrastées
  const getPolygonStyle = (descente) => {
    const couleur = getDescenteCouleur(descente);
    const styles = {
      rouge: {
        color: '#dc2626', // Rouge plus foncé
        fillColor: '#fca5a5', // Rouge clair
        weight: 2.5,
        opacity: 0.9,
        fillOpacity: 0.3,
        dashArray: '8, 4' // Ajout de pointillés pour différencier
      },
      jaune: {
        color: '#d97706', // Jaune plus foncé
        fillColor: '#fde68a', // Jaune clair
        weight: 2.5,
        opacity: 0.9,
        fillOpacity: 0.3,
        dashArray: '8, 4'
      },
      bleu: {
        color: '#1d4ed8', // Bleu plus foncé
        fillColor: '#93c5fd', // Bleu clair
        weight: 2.5,
        opacity: 0.9,
        fillOpacity: 0.3,
        dashArray: '8, 4'
      },
      vert: {
        color: '#059669', // Vert plus foncé
        fillColor: '#86efac', // Vert clair
        weight: 2.5,
        opacity: 0.9,
        fillOpacity: 0.3,
        dashArray: '8, 4'
      }
    };
    return styles[couleur] || styles.rouge;
  };
  
  return (
    <>
      {descentesWithPolygons.map((descente) => {
        if (!descente.polygon_geojson || descente.polygon_geojson.type !== 'Polygon') {
          return null;
        }
       
        // Convertir les coordonnées du polygone (GeoJSON: [lng, lat])
        const coordinates = descente.polygon_geojson.coordinates[0];
        const latlngs = coordinates.map(coord => [coord[1], coord[0]]); // [lat, lng]
       
        return (
          <React.Fragment key={`polygon-group-${descente.id}`}>
            {/* Polygone */}
            <LeafletPolygon
              key={`polygon-${descente.id}`}
              positions={latlngs}
              pathOptions={getPolygonStyle(descente)}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({
                    ...layer.options,
                    weight: 4,
                    opacity: 1,
                    fillOpacity: 0.5,
                    dashArray: 'none'
                  });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(getPolygonStyle(descente));
                }
              }}
            >
              <Popup>
                <DetailedPopup descente={descente} />
              </Popup>
            </LeafletPolygon>
            
            {/* Point de descente au CENTRE du polygone */}
            {descente.displayLat && descente.displayLng && (
              <Marker
                key={`descente-point-center-${descente.id}`}
                position={[descente.displayLat, descente.displayLng]}
                icon={descentePointInPolygonIcon}
                zIndexOffset={1000}
              >
                <Popup>
                  <DetailedPopup descente={descente} />
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// --- Composant AdministrativeLimitsLayer ---
const AdministrativeLimitsLayer = ({ showLimits }) => {
  const [limitsData, setLimitsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const map = useMap();

  useEffect(() => {
    if (!showLimits) {
      setLimitsData([]);
      return;
    }

    const fetchLimits = async () => {
      try {
        setLoading(true);
        console.log("Chargement des limites administratives...");
        const response = await fetch("http://localhost:3000/api/shapefile/limites");
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        console.log("Données limites reçues:", data);
        setLimitsData(data);
        console.log(`${data.length} limites administratives chargées`);
      } catch (error) {
        console.error("Erreur lors du chargement des limites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [showLimits]);

  if (!showLimits) return null;

  if (loading) {
    return (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Chargement des limites administratives...
      </div>
    );
  }

  if (limitsData.length === 0) {
    return null;
  }

  // Style AMÉLIORÉ pour les limites administratives
  const limitsStyle = {
    color: '#0284c7', // Bleu ciel plus clair
    weight: 1.5,
    opacity: 0.6,
    fillColor: 'transparent',
    dashArray: '6, 3'
  };

  // Style au survol
  const hoverStyle = {
    weight: 3,
    opacity: 0.8,
    color: '#0369a1',
    dashArray: '6, 3'
  };

  // Fonction pour convertir les coordonnées Laborde MultiLineString en WGS84
  const convertLabordeCoordinates = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return [];
    
    try {
      // Les coordonnées sont dans le format Laborde (x, y)
      // Nous devons les convertir en WGS84 (lat, lng)
      const convertedCoordinates = coordinates.map(coordPair => {
        return coordPair.map(coord => {
          // coord est [x, y] en Laborde
          const x = coord[0];
          const y = coord[1];
          
          // Convertir Laborde -> WGS84
          const wgs84 = convertLabordeToWGS84(x, y);
          if (wgs84) {
            // convertLabordeToWGS84 retourne [lat, lng]
            // Leaflet attend [lat, lng]
            return [wgs84[0], wgs84[1]];
          }
          return null;
        }).filter(coord => coord !== null); // Filtrer les conversions échouées
      });
      
      return convertedCoordinates;
    } catch (error) {
      console.error("Erreur conversion coordonnées limites:", error);
      return [];
    }
  };

  return (
    <>
      {limitsData.map((feature, index) => {
        if (!feature.geom || !feature.geom.coordinates) {
          console.warn("Géométrie manquante pour la limite:", feature);
          return null;
        }

        // Vérifier le type de géométrie
        const geomType = feature.geom.type;
        const coordinates = feature.geom.coordinates;
        
        if (geomType === 'MultiLineString') {
          // Convertir chaque LineString dans le MultiLineString
          const convertedLines = coordinates.map((line, lineIndex) => {
            const convertedCoords = convertLabordeCoordinates([line]);
            return convertedCoords[0] || [];
          }).filter(line => line.length > 0);

          if (convertedLines.length === 0) {
            return null;
          }

          // Afficher chaque ligne
          return convertedLines.map((lineCoords, lineIndex) => (
            <Polyline
              key={`limit-${feature.id}-${lineIndex}`}
              positions={lineCoords}
              pathOptions={limitsStyle}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(limitsStyle);
                },
                click: (e) => {
                  const latlng = e.latlng;
                  const popupContent = `
                    <div style="padding: 10px; min-width: 200px;">
                      <h3 style="color: #0369a1; font-weight: bold; margin-bottom: 8px;">${feature.commune || 'Limite Administrative'}</h3>
                      <div style="font-size: 12px;">
                        <div><strong>ID:</strong> ${feature.id}</div>
                        ${feature.commune ? `<div><strong>Commune:</strong> ${feature.commune}</div>` : ''}
                        <div><strong>Type:</strong> ${geomType}</div>
                        <div><strong>Lignes:</strong> ${convertedLines.length}</div>
                        <div><strong>Points:</strong> ${lineCoords.length}</div>
                      </div>
                    </div>
                  `;
                  L.popup()
                    .setLatLng(latlng)
                    .setContent(popupContent)
                    .openOn(map);
                }
              }}
            />
          ));
        } else if (geomType === 'LineString') {
          // Convertir une LineString simple
          const convertedCoords = convertLabordeCoordinates([coordinates]);
          const lineCoords = convertedCoords[0] || [];
          
          if (lineCoords.length === 0) {
            return null;
          }

          return (
            <Polyline
              key={`limit-${feature.id}`}
              positions={lineCoords}
              pathOptions={limitsStyle}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(limitsStyle);
                },
                click: (e) => {
                  const latlng = e.latlng;
                  const popupContent = `
                    <div style="padding: 10px; min-width: 200px;">
                      <h3 style="color: #0369a1; font-weight: bold; margin-bottom: 8px;">${feature.commune || 'Limite Administrative'}</h3>
                      <div style="font-size: 12px;">
                        <div><strong>ID:</strong> ${feature.id}</div>
                        ${feature.commune ? `<div><strong>Commune:</strong> ${feature.commune}</div>` : ''}
                        <div><strong>Type:</strong> ${geomType}</div>
                        <div><strong>Points:</strong> ${lineCoords.length}</div>
                      </div>
                    </div>
                  `;
                  L.popup()
                    .setLatLng(latlng)
                    .setContent(popupContent)
                    .openOn(map);
                }
              }}
            />
          );
        } else {
          console.warn(`Type de géométrie non supporté: ${geomType}`);
          return null;
        }
      })}
    </>
  );
};

// --- Composant TitresFonciersLayer ---
const TitresFonciersLayer = ({ showTitres }) => {
  const [titresData, setTitresData] = useState(null);
  const [loading, setLoading] = useState(false);
  const map = useMap();

  useEffect(() => {
    if (!showTitres) {
      setTitresData(null);
      return;
    }

    const fetchTitres = async () => {
      try {
        setLoading(true);
        console.log("Chargement des titres fonciers...");
        const response = await fetch("http://localhost:3000/api/titres-sans-nom");
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Données titres fonciers reçues:", data);
        
        // Vérifier si c'est un FeatureCollection
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          setTitresData(data.features);
          console.log(`${data.features.length} titres fonciers chargés`);
        } else if (Array.isArray(data)) {
          // Si c'est directement un tableau de features
          setTitresData(data);
          console.log(`${data.length} titres fonciers chargés`);
        } else {
          console.error("Format de données non reconnu:", data);
          setTitresData([]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des titres fonciers:", error);
        setTitresData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTitres();
  }, [showTitres]);

  if (!showTitres || !titresData) return null;

  if (loading) {
    return (
      <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-[1000] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Chargement des titres fonciers...
      </div>
    );
  }

  if (titresData.length === 0) {
    return (
      <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Aucun titre foncier disponible
      </div>
    );
  }

  // Style AMÉLIORÉ pour les titres fonciers
  const titresStyle = {
    color: '#16a34a', // Vert plus doux
    weight: 1.8,
    opacity: 0.7,
    fillColor: '#86efac',
    fillOpacity: 0.15
  };

  // Style au survol
  const hoverStyle = {
    weight: 3,
    opacity: 0.9,
    color: '#15803d',
    fillColor: '#86efac',
    fillOpacity: 0.25
  };

  // Fonction pour convertir les coordonnées Laborde MultiPolygon en WGS84
  const convertLabordeMultiPolygon = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return [];
    
    try {
      // Les coordonnées sont dans le format Laborde (x, y) - MultiPolygon
      // Structure: MultiPolygon -> [Polygon] -> [Ring] -> [Point] -> [x, y]
      const convertedPolygons = coordinates.map(polygon => {
        return polygon.map(ring => {
          return ring.map(coord => {
            // coord est [x, y] en Laborde
            const x = coord[0];
            const y = coord[1];
            
            // Convertir Laborde -> WGS84
            const wgs84 = convertLabordeToWGS84(x, y);
            if (wgs84) {
              // convertLabordeToWGS84 retourne [lat, lng]
              // Leaflet attend [lat, lng]
              return [wgs84[0], wgs84[1]];
            }
            return null;
          }).filter(coord => coord !== null); // Filtrer les conversions échouées
        });
      });
      
      return convertedPolygons;
    } catch (error) {
      console.error("Erreur conversion coordonnées titres fonciers:", error);
      return [];
    }
  };

  // Fonction pour convertir les coordonnées Laborde Polygon en WGS84
  const convertLabordePolygon = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return [];
    
    try {
      // Les coordonnées sont dans le format Laborde (x, y) - Polygon
      // Structure: Polygon -> [Ring] -> [Point] -> [x, y]
      const convertedRings = coordinates.map(ring => {
        return ring.map(coord => {
          // coord est [x, y] en Laborde
          const x = coord[0];
          const y = coord[1];
          
          // Convertir Laborde -> WGS84
          const wgs84 = convertLabordeToWGS84(x, y);
          if (wgs84) {
            // convertLabordeToWGS84 retourne [lat, lng]
            // Leaflet attend [lat, lng]
            return [wgs84[0], wgs84[1]];
          }
          return null;
        }).filter(coord => coord !== null); // Filtrer les conversions échouées
      });
      
      return convertedRings;
    } catch (error) {
      console.error("Erreur conversion coordonnées titres fonciers:", error);
      return [];
    }
  };

  return (
    <>
      {titresData.map((feature, index) => {
        if (!feature.geometry || !feature.geometry.coordinates) {
          console.warn("Géométrie manquante pour le titre foncier:", feature);
          return null;
        }

        // Vérifier le type de géométrie
        const geomType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        console.log(`Titre ${index}: ${geomType}, ${properties.titre || 'Sans titre'}`);

        if (geomType === 'MultiPolygon') {
          // Convertir MultiPolygon
          const convertedPolygons = convertLabordeMultiPolygon(coordinates);
          
          if (convertedPolygons.length === 0) {
            console.warn("Aucune coordonnée valide pour le titre:", feature);
            return null;
          }

          // Afficher chaque polygone
          return convertedPolygons.map((polygonCoords, polygonIndex) => (
            polygonCoords.map((ringCoords, ringIndex) => (
              <LeafletPolygon
                key={`titre-${properties.gid || properties.objectid || index}-${polygonIndex}-${ringIndex}`}
                positions={ringCoords}
                pathOptions={titresStyle}
                eventHandlers={{
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle(hoverStyle);
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle(titresStyle);
                  },
                  click: (e) => {
                    const latlng = e.latlng;
                    const popupContent = `
                      <div style="padding: 10px; min-width: 250px;">
                        <h3 style="color: #15803d; font-weight: bold; margin-bottom: 8px;">
                          <i class="fas fa-landmark" style="margin-right: 8px;"></i>
                          ${properties.titre || 'Titre Foncier'}
                        </h3>
                        <div style="font-size: 12px;">
                          <div><strong>Référence:</strong> ${properties.titre_r || properties.titre || 'N/A'}</div>
                          <div><strong>ID:</strong> ${properties.gid || properties.objectid || 'N/A'}</div>
                          ${properties.propriete ? `<div><strong>Propriété:</strong> ${properties.propriete}</div>` : ''}
                          ${properties.sur_plan ? `<div><strong>Surface:</strong> ${parseFloat(properties.sur_plan).toFixed(2)} m²</div>` : ''}
                          ${properties.partie ? `<div><strong>Partie:</strong> ${properties.partie}</div>` : ''}
                          ${properties.feuille ? `<div><strong>Feuille:</strong> ${properties.feuille}</div>` : ''}
                          ${properties.parcelle ? `<div><strong>Parcelle:</strong> ${properties.parcelle}</div>` : ''}
                          <div><strong>Type:</strong> ${geomType}</div>
                          <div><strong>Polygones:</strong> ${convertedPolygons.length}</div>
                        </div>
                      </div>
                    `;
                    L.popup()
                      .setLatLng(latlng)
                      .setContent(popupContent)
                      .openOn(map);
                  }
                }}
              />
            ))
          ));
        } else if (geomType === 'Polygon') {
          // Convertir Polygon simple
          const convertedRings = convertLabordePolygon(coordinates);
          
          if (convertedRings.length === 0) {
            return null;
          }

          return convertedRings.map((ringCoords, ringIndex) => (
            <LeafletPolygon
              key={`titre-${properties.gid || properties.objectid || index}-${ringIndex}`}
              positions={ringCoords}
              pathOptions={titresStyle}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(titresStyle);
                },
                click: (e) => {
                  const latlng = e.latlng;
                  const popupContent = `
                    <div style="padding: 10px; min-width: 250px;">
                      <h3 style="color: #15803d; font-weight: bold; margin-bottom: 8px;">
                        <i class="fas fa-landmark" style="margin-right: 8px;"></i>
                        ${properties.titre || 'Titre Foncier'}
                      </h3>
                      <div style="font-size: 12px;">
                        <div><strong>Référence:</strong> ${properties.titre_r || properties.titre || 'N/A'}</div>
                        <div><strong>ID:</strong> ${properties.gid || properties.objectid || 'N/A'}</div>
                        ${properties.propriete ? `<div><strong>Propriété:</strong> ${properties.propriete}</div>` : ''}
                        ${properties.sur_plan ? `<div><strong>Surface:</strong> ${parseFloat(properties.sur_plan).toFixed(2)} m²</div>` : ''}
                        ${properties.partie ? `<div><strong>Partie:</strong> ${properties.partie}</div>` : ''}
                        ${properties.feuille ? `<div><strong>Feuille:</strong> ${properties.feuille}</div>` : ''}
                        ${properties.parcelle ? `<div><strong>Parcelle:</strong> ${properties.parcelle}</div>` : ''}
                        <div><strong>Type:</strong> ${geomType}</div>
                      </div>
                    </div>
                  `;
                  L.popup()
                    .setLatLng(latlng)
                    .setContent(popupContent)
                    .openOn(map);
                }
              }}
            />
          ));
        } else {
          console.warn(`Type de géométrie non supporté pour les titres fonciers: ${geomType}`);
          return null;
        }
      })}
    </>
  );
};

// --- Composant CadastreLayer ---
const CadastreLayer = ({ showCadastre }) => {
  const [cadastreData, setCadastreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();

  useEffect(() => {
    if (!showCadastre) {
      setCadastreData(null);
      return;
    }

    const fetchCadastre = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Chargement des données cadastrales...");
        
        const response = await fetch("http://localhost:3000/api/cadastre/");
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Données cadastrales reçues:", data);
        
        // Vérifier si c'est un FeatureCollection
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          setCadastreData(data.features);
          console.log(`${data.features.length} parcelles cadastrales chargées`);
        } else {
          console.error("Format de données cadastrales non reconnu:", data);
          setCadastreData([]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données cadastrales:", error);
        setError(error.message);
        setCadastreData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCadastre();
  }, [showCadastre]);

  if (!showCadastre || !cadastreData) return null;

  if (loading) {
    return (
      <div className="absolute top-36 left-1/2 transform -translate-x-1/2 z-[1000] bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Chargement des parcelles cadastrales...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-36 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Erreur: {error}
      </div>
    );
  }

  if (cadastreData.length === 0) {
    return (
      <div className="absolute top-36 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Aucune parcelle cadastrale disponible
      </div>
    );
  }

  // Style AMÉLIORÉ pour les parcelles cadastrales
  const cadastreStyle = {
    color: '#7c3aed', // Violet moins saturé
    weight: 1.5,
    opacity: 0.7,
    fillColor: '#c4b5fd',
    fillOpacity: 0.12,
    dashArray: '5, 3' // Légèrement pointillé
  };

  // Style au survol
  const hoverStyle = {
    weight: 2.5,
    opacity: 0.9,
    color: '#6d28d9',
    fillColor: '#c4b5fd',
    fillOpacity: 0.2,
    dashArray: 'none'
  };

  // Fonction pour convertir les coordonnées Laborde MultiPolygon en WGS84
  const convertLabordeMultiPolygon = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return [];
    
    try {
      // Les coordonnées sont dans le format Laborde (x, y) - MultiPolygon
      // Structure: MultiPolygon -> [Polygon] -> [Ring] -> [Point] -> [x, y]
      const convertedPolygons = coordinates.map(polygon => {
        return polygon.map(ring => {
          return ring.map(coord => {
            // coord est [x, y] en Laborde
            const x = coord[0];
            const y = coord[1];
            
            // Convertir Laborde -> WGS84
            const wgs84 = convertLabordeToWGS84(x, y);
            if (wgs84) {
              // convertLabordeToWGS84 retourne [lat, lng]
              // Leaflet attend [lat, lng]
              return [wgs84[0], wgs84[1]];
            }
            return null;
          }).filter(coord => coord !== null); // Filtrer les conversions échouées
        });
      });
      
      return convertedPolygons;
    } catch (error) {
      console.error("Erreur conversion coordonnées cadastre:", error);
      return [];
    }
  };

  return (
    <>
      {cadastreData.map((feature, index) => {
        if (!feature.geometry || !feature.geometry.coordinates) {
          console.warn("Géométrie manquante pour la parcelle cadastrale:", feature);
          return null;
        }

        // Vérifier le type de géométrie
        const geomType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        // Debug: afficher les informations de la parcelle
        console.log(`Parcelle ${index}:`, {
          id: properties.id,
          nom_sectio: properties.nom_sectio,
          section: properties.section,
          parcelle: properties.parcelle,
          surface: properties.surface,
          type: geomType
        });

        if (geomType === 'MultiPolygon') {
          // Convertir MultiPolygon
          const convertedPolygons = convertLabordeMultiPolygon(coordinates);
          
          if (convertedPolygons.length === 0) {
            console.warn("Aucune coordonnée valide pour la parcelle:", feature);
            return null;
          }

          // Afficher chaque polygone
          return convertedPolygons.map((polygonCoords, polygonIndex) => (
            polygonCoords.map((ringCoords, ringIndex) => (
              <LeafletPolygon
                key={`cadastre-${properties.id || index}-${polygonIndex}-${ringIndex}`}
                positions={ringCoords}
                pathOptions={cadastreStyle}
                eventHandlers={{
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle(hoverStyle);
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle(cadastreStyle);
                  },
                  click: (e) => {
                    const latlng = e.latlng;
                    const popupContent = `
                      <div style="padding: 10px; min-width: 250px;">
                        <h3 style="color: #6d28d9; font-weight: bold; margin-bottom: 8px;">
                          <i class="fas fa-map" style="margin-right: 8px;"></i>
                          Parcelle Cadastrale
                        </h3>
                        <div style="font-size: 12px;">
                          <div><strong>ID:</strong> ${properties.id || 'N/A'}</div>
                          <div><strong>Section:</strong> ${properties.section || 'N/A'}</div>
                          <div><strong>Parcelle:</strong> ${properties.parcelle || 'N/A'}</div>
                          <div><strong>Nom de secteur:</strong> ${properties.nom_sectio || 'N/A'}</div>
                          ${properties.surface ? `<div><strong>Surface:</strong> ${parseFloat(properties.surface).toFixed(2)} m²</div>` : ''}
                          <div><strong>Type:</strong> ${geomType}</div>
                        </div>
                      </div>
                    `;
                    L.popup()
                      .setLatLng(latlng)
                      .setContent(popupContent)
                      .openOn(map);
                  }
                }}
              />
            ))
          ));
        } else if (geomType === 'Polygon') {
          // Convertir Polygon simple
          const convertedRings = convertLabordeMultiPolygon([coordinates])[0];
          
          if (!convertedRings || convertedRings.length === 0) {
            return null;
          }

          return convertedRings.map((ringCoords, ringIndex) => (
            <LeafletPolygon
              key={`cadastre-${properties.id || index}-${ringIndex}`}
              positions={ringCoords}
              pathOptions={cadastreStyle}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(cadastreStyle);
                },
                click: (e) => {
                  const latlng = e.latlng;
                  const popupContent = `
                    <div style="padding: 10px; min-width: 250px;">
                      <h3 style="color: #6d28d9; font-weight: bold; margin-bottom: 8px;">
                        <i class="fas fa-map" style="margin-right: 8px;"></i>
                        Parcelle Cadastrale
                      </h3>
                      <div style="font-size: 12px;">
                        <div><strong>ID:</strong> ${properties.id || 'N/A'}</div>
                        <div><strong>Section:</strong> ${properties.section || 'N/A'}</div>
                        <div><strong>Parcelle:</strong> ${properties.parcelle || 'N/A'}</div>
                        <div><strong>Nom de secteur:</strong> ${properties.nom_sectio || 'N/A'}</div>
                        ${properties.surface ? `<div><strong>Surface:</strong> ${parseFloat(properties.surface).toFixed(2)} m²</div>` : ''}
                        <div><strong>Type:</strong> ${geomType}</div>
                      </div>
                    </div>
                  `;
                  L.popup()
                    .setLatLng(latlng)
                    .setContent(popupContent)
                    .openOn(map);
                }
              }}
            />
          ));
        } else {
          console.warn(`Type de géométrie non supporté pour le cadastre: ${geomType}`);
          return null;
        }
      })}
    </>
  );
};

// --- Composant TitresRequisitionLayer ---
const TitresRequisitionLayer = ({ showTitresRequisition }) => {
  const [titresRequisitionData, setTitresRequisitionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();

  useEffect(() => {
    if (!showTitresRequisition) {
      setTitresRequisitionData(null);
      return;
    }

    const fetchTitresRequisition = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Chargement des titres de réquisition...");
        
        const response = await fetch("http://localhost:3000/api/titre-requisition/");
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Données titres de réquisition reçues:", data);
        
        // Vérifier si c'est un tableau
        if (Array.isArray(data)) {
          setTitresRequisitionData(data);
          console.log(`${data.length} titres de réquisition chargés`);
        } else {
          console.error("Format de données non reconnu:", data);
          setTitresRequisitionData([]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des titres de réquisition:", error);
        setError(error.message);
        setTitresRequisitionData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTitresRequisition();
  }, [showTitresRequisition]);

  if (!showTitresRequisition || !titresRequisitionData) return null;

  if (loading) {
    return (
      <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-[1000] bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Chargement des titres de réquisition...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Erreur: {error}
      </div>
    );
  }

  if (titresRequisitionData.length === 0) {
    return (
      <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Aucun titre de réquisition disponible
      </div>
    );
  }

  // Style AMÉLIORÉ pour les titres de réquisition
  const titresRequisitionStyle = {
    color: '#ea580c', // Orange moins vif
    weight: 2,
    opacity: 0.8,
    fillColor: '#fed7aa',
    fillOpacity: 0.18,
    dashArray: '12, 6' // Pointillés plus espacés
  };

  // Style au survol
  const hoverStyle = {
    weight: 3,
    opacity: 1,
    color: '#c2410c',
    fillColor: '#fed7aa',
    fillOpacity: 0.3,
    dashArray: 'none'
  };

  // Fonction pour convertir les coordonnées Laborde MultiPolygon en WGS84
  const convertLabordeMultiPolygon = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return [];
    
    try {
      // Les coordonnées sont dans le format Laborde (x, y) - MultiPolygon
      // Structure: MultiPolygon -> [Polygon] -> [Ring] -> [Point] -> [x, y]
      const convertedPolygons = coordinates.map(polygon => {
        return polygon.map(ring => {
          return ring.map(coord => {
            // coord est [x, y] en Laborde
            const x = coord[0];
            const y = coord[1];
            
            // Convertir Laborde -> WGS84
            const wgs84 = convertLabordeToWGS84(x, y);
            if (wgs84) {
              // convertLabordeToWGS84 retourne [lat, lng]
              // Leaflet attend [lat, lng]
              return [wgs84[0], wgs84[1]];
            }
            return null;
          }).filter(coord => coord !== null); // Filtrer les conversions échouées
        });
      });
      
      return convertedPolygons;
    } catch (error) {
      console.error("Erreur conversion coordonnées titres réquisition:", error);
      return [];
    }
  };

  return (
    <>
      {titresRequisitionData.map((feature, index) => {
        if (!feature.geom || !feature.geom.coordinates) {
          console.warn("Géométrie manquante pour le titre de réquisition:", feature);
          return null;
        }

        // Vérifier le type de géométrie
        const geomType = feature.geom.type;
        const coordinates = feature.geom.coordinates;
        
        // Debug: afficher les informations du titre
        console.log(`Titre réquisition ${index}:`, {
          gid: feature.gid,
          titre: feature.titre,
          properiete: feature.properiete,
          sur_plan: feature.sur_plan,
          aire_calcu: feature.aire_calcu,
          type: geomType
        });

        if (geomType === 'MultiPolygon') {
          // Convertir MultiPolygon
          const convertedPolygons = convertLabordeMultiPolygon(coordinates);
          
          if (convertedPolygons.length === 0) {
            console.warn("Aucune coordonnée valide pour le titre de réquisition:", feature);
            return null;
          }

          // Afficher chaque polygone
          return convertedPolygons.map((polygonCoords, polygonIndex) => (
            polygonCoords.map((ringCoords, ringIndex) => (
              <LeafletPolygon
                key={`titre-req-${feature.gid || index}-${polygonIndex}-${ringIndex}`}
                positions={ringCoords}
                pathOptions={titresRequisitionStyle}
                eventHandlers={{
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle(hoverStyle);
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle(titresRequisitionStyle);
                  },
                  click: (e) => {
                    const latlng = e.latlng;
                    const popupContent = `
                      <div style="padding: 12px; min-width: 280px;">
                        <h3 style="color: #c2410c; font-weight: bold; margin-bottom: 10px; font-size: 14px;">
                          <i class="fas fa-file-contract" style="margin-right: 8px;"></i>
                          Titre de Réquisition
                        </h3>
                        <div style="font-size: 12px; line-height: 1.5;">
                          <div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Titre:</strong> 
                            <span style="color: #1f2937; font-weight: 600;"> ${feature.titre || 'N/A'}</span>
                          </div>
                          <div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Référence:</strong> 
                            <span style="color: #1f2937;"> ${feature.titre_r || feature.titre || 'N/A'}</span>
                          </div>
                          <div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Propriété:</strong> 
                            <span style="color: #1f2937;"> ${feature.properiete || 'Non spécifié'}</span>
                          </div>
                          ${feature.sur_plan && feature.sur_plan !== '0.00000000000' ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Surface sur plan:</strong> 
                              <span style="color: #1f2937;"> ${parseFloat(feature.sur_plan).toFixed(2)} m²</span>
                            </div>` : ''
                          }
                          ${feature.aire_calcu ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Surface calculée:</strong> 
                              <span style="color: #1f2937;"> ${parseFloat(feature.aire_calcu).toFixed(2)} m²</span>
                            </div>` : ''
                          }
                          ${feature.tolerance && feature.tolerance !== '0.00000000000' ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Tolérance:</strong> 
                              <span style="color: #1f2937;"> ${parseFloat(feature.tolerance).toFixed(2)}%</span>
                            </div>` : ''
                          }
                          <div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">ID:</strong> 
                            <span style="color: #1f2937;"> ${feature.gid || 'N/A'}</span>
                          </div>
                          ${feature.partie ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Partie:</strong> 
                              <span style="color: #1f2937;"> ${feature.partie}</span>
                            </div>` : ''
                          }
                          ${feature.feuille ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Feuille:</strong> 
                              <span style="color: #1f2937;"> ${feature.feuille}</span>
                            </div>` : ''
                          }
                          ${feature.parcelle ? 
                            `<div style="margin-bottom: 5px;">
                              <strong style="color: #92400e;">Parcelle:</strong> 
                              <span style="color: #1f2937;"> ${feature.parcelle}</span>
                            </div>` : ''
                          }
                          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <div style="font-size: 11px; color: #6b7280;">
                              <div><strong>Type géométrie:</strong> ${geomType}</div>
                              <div><strong>Polygones:</strong> ${convertedPolygons.length}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                    L.popup()
                      .setLatLng(latlng)
                      .setContent(popupContent)
                      .openOn(map);
                  }
                }}
              />
            ))
          ));
        } else if (geomType === 'Polygon') {
          // Convertir Polygon simple
          const convertedRings = convertLabordeMultiPolygon([coordinates])[0];
          
          if (!convertedRings || convertedRings.length === 0) {
            return null;
          }

          return convertedRings.map((ringCoords, ringIndex) => (
            <LeafletPolygon
              key={`titre-req-${feature.gid || index}-${ringIndex}`}
              positions={ringCoords}
              pathOptions={titresRequisitionStyle}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(titresRequisitionStyle);
                },
                click: (e) => {
                  const latlng = e.latlng;
                  const popupContent = `
                    <div style="padding: 12px; min-width: 280px;">
                      <h3 style="color: #c2410c; font-weight: bold; margin-bottom: 10px; font-size: 14px;">
                        <i class="fas fa-file-contract" style="margin-right: 8px;"></i>
                        Titre de Réquisition
                      </h3>
                      <div style="font-size: 12px; line-height: 1.5;">
                        <div style="margin-bottom: 5px;">
                          <strong style="color: #92400e;">Titre:</strong> 
                          <span style="color: #1f2937; font-weight: 600;"> ${feature.titre || 'N/A'}</span>
                        </div>
                        <div style="margin-bottom: 5px;">
                          <strong style="color: #92400e;">Référence:</strong> 
                          <span style="color: #1f2937;"> ${feature.titre_r || feature.titre || 'N/A'}</span>
                        </div>
                        <div style="margin-bottom: 5px;">
                          <strong style="color: #92400e;">Propriété:</strong> 
                          <span style="color: #1f2937;"> ${feature.properiete || 'Non spécifié'}</span>
                        </div>
                        ${feature.sur_plan && feature.sur_plan !== '0.00000000000' ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Surface sur plan:</strong> 
                            <span style="color: #1f2937;"> ${parseFloat(feature.sur_plan).toFixed(2)} m²</span>
                          </div>` : ''
                        }
                        ${feature.aire_calcu ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Surface calculée:</strong> 
                            <span style="color: #1f2937;"> ${parseFloat(feature.aire_calcu).toFixed(2)} m²</span>
                          </div>` : ''
                        }
                        ${feature.tolerance && feature.tolerance !== '0.00000000000' ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Tolérance:</strong> 
                            <span style="color: #1f2937;"> ${parseFloat(feature.tolerance).toFixed(2)}%</span>
                          </div>` : ''
                        }
                        <div style="margin-bottom: 5px;">
                          <strong style="color: #92400e;">ID:</strong> 
                          <span style="color: #1f2937;"> ${feature.gid || 'N/A'}</span>
                        </div>
                        ${feature.partie ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Partie:</strong> 
                            <span style="color: #1f2937;"> ${feature.partie}</span>
                          </div>` : ''
                        }
                        ${feature.feuille ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Feuille:</strong> 
                            <span style="color: #1f2937;"> ${feature.feuille}</span>
                          </div>` : ''
                        }
                        ${feature.parcelle ? 
                          `<div style="margin-bottom: 5px;">
                            <strong style="color: #92400e;">Parcelle:</strong> 
                            <span style="color: #1f2937;"> ${feature.parcelle}</span>
                          </div>` : ''
                        }
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                          <div style="font-size: 11px; color: #6b7280;">
                            <div><strong>Type géométrie:</strong> ${geomType}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                  L.popup()
                    .setLatLng(latlng)
                    .setContent(popupContent)
                    .openOn(map);
                }
              }}
            />
          ));
        } else {
          console.warn(`Type de géométrie non supporté pour les titres de réquisition: ${geomType}`);
          return null;
        }
      })}
    </>
  );
};

// Component pour ajuster la vue de la carte aux marqueurs
const FitBounds = ({ filteredDescentes, showPolygons }) => {
  const map = useMap();
  
  useEffect(() => {
    const bounds = new L.LatLngBounds();
   
    // Ajouter les points de descente
    filteredDescentes.forEach(d => {
      if (d.displayLat && d.displayLng && !isNaN(d.displayLat) && !isNaN(d.displayLng)) {
        bounds.extend([d.displayLat, d.displayLng]);
      }
    });
   
    // Ajouter les polygones si visibles
    if (showPolygons) {
      filteredDescentes.forEach(d => {
        if (d.polygon_geojson && d.polygon_geojson.type === 'Polygon') {
          const coordinates = d.polygon_geojson.coordinates[0];
          coordinates.forEach(coord => {
            bounds.extend([coord[1], coord[0]]); // [lat, lng]
          });
        }
      });
    }
   
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Default to Madagascar if no bounds
      map.setView([-18.8792, 47.5079], 6);
    }
  }, [filteredDescentes, showPolygons, map]);
 
  return null;
};

// --- Composant Principal ---
export default function CartographieContent() {
  const [descentes, setDescentes] = useState([]);
  const [filteredDescentes, setFilteredDescentes] = useState([]);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showListPanel, setShowListPanel] = useState(false);
  const [searchType, setSearchType] = useState('latlon');
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [searchX, setSearchX] = useState("");
  const [searchY, setSearchY] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchMarker, setSearchMarker] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedDescente, setSelectedDescente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPolygons, setShowPolygons] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [showTitres, setShowTitres] = useState(false);
  const [showCadastre, setShowCadastre] = useState(false);
  const [showTitresRequisition, setShowTitresRequisition] = useState(false);
  const [descentesWithPolygonsCount, setDescentesWithPolygonsCount] = useState(0);
 
  const mapRef = useRef(null);
  
  // Filtres pour les couches - TOUS DÉSACTIVÉS AU CHARGEMENT
  const [layers, setLayers] = useState([
    { name: 'Points de descente', active: true, color: '#f97316', type: 'descentes' },
    { name: 'Polygones de descente', active: false, color: '#dc2626', type: 'polygons' },
    { name: 'Limites communales', active: false, color: '#0284c7', type: 'shapefile' },
    { name: 'Titres fonciers', active: false, color: '#16a34a', type: 'titres' },
    { name: 'Parcelles cadastrales', active: false, color: '#7c3aed', type: 'cadastre' },
    { name: 'Titres de réquisition', active: false, color: '#ea580c', type: 'titres-requisition' },
  ]);
  
  // Filtres pour les couleurs de descentes - TOUS DÉSACTIVÉS AU CHARGEMENT
  const [filtreCouleurs, setFiltreCouleurs] = useState({
    rouge: false,
    jaune: false,
    bleu: false,
    vert: false
  });
  
  // Compter les descentes par couleur
  const descentesByColor = {
    rouge: descentes.filter(d => getDescenteCouleur(d) === 'rouge').length,
    jaune: descentes.filter(d => getDescenteCouleur(d) === 'jaune').length,
    bleu: descentes.filter(d => getDescenteCouleur(d) === 'bleu').length,
    vert: descentes.filter(d => getDescenteCouleur(d) === 'vert').length
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resDescentes = await fetch("http://localhost:3000/api/descentes/carte/descentes");
        if (!resDescentes.ok) {
          throw new Error(`Erreur HTTP: ${resDescentes.status}`);
        }
        const response = await resDescentes.json();
        if (response.success && Array.isArray(response.data)) {
          const processedDescentes = response.data.map((item) => {
            // Vérifier si on a des coordonnées Laborde
            const hasLaborde = isLabordeCoordinates(item.laborde_x, item.laborde_y);
           
            // DÉTERMINER LES COORDONNÉES D'AFFICHAGE :
            let displayLat, displayLng;
            let hasValidCoordinates;
           
            if (item.polygon_geojson && item.polygon_geojson.type === 'Polygon') {
              const center = calculatePolygonCenter(item.polygon_geojson);
              if (center) {
                displayLat = center[0];
                displayLng = center[1];
                hasValidCoordinates = true;
              } else {
                displayLat = undefined;
                displayLng = undefined;
                hasValidCoordinates = false;
              }
            } else {
              if (hasLaborde) {
                // CONVERTIR DEPUIS LABORDE
                const converted = convertLabordeToWGS84(item.laborde_x, item.laborde_y);
               
                if (converted) {
                  [displayLat, displayLng] = converted;
                } else {
                  // Si conversion échoue, utiliser les valeurs par défaut
                  displayLat = item.lat;
                  displayLng = item.lng;
                }
              } else {
                // Si pas Laborde, utiliser lat/lng
                displayLat = item.lat;
                displayLng = item.lng;
              }
              hasValidCoordinates = !isDefaultCoordinates(displayLat, displayLng);
            }
           
            return {
              id: item.id,
              reference: item.reference || null,
              n_pv_pat: item.n_pv_pat || null,
              n_fifafi: item.n_fifafi || null,
              ref_om: item.ref_om || null,
              ref_rapport: item.ref_rapport || null,
              date_descente: item.date_descente || null,
              heure_descente: item.heure_descente || null,
              date_rendez_vous: item.date_rendez_vous || null,
              heure_rendez_vous: item.heure_rendez_vous || null,
              type_verbalisateur: item.type_verbalisateur || null,
              nom_verbalisateur: item.verbalisateur || item.nom_verbalisateur || null,
              personne_r: item.personne_r || null,
              nom_personne_r: item.nom_personne_r || null,
              contact_r: item.contact_r || null,
              adresse_r: item.adresse_r || null,
              district: item.district || null,
              commune: item.commune || null,
              fokontany: item.fokontany || null,
              localisation: item.localisation || "Non spécifié",
              superficie: item.superficie || null,
              infraction: item.infraction || "Infraction non spécifiée",
              actions: item.actions || null,
              modele_pv: item.modele_pv || null,
              dossier_a_fournir: item.dossier_a_fournir || null,
              statut_descente: item.statut_descente || null,
             
              // Coordonnées ORIGINALES de la base
              lat: item.lat,
              lng: item.lng,
              laborde_x: item.laborde_x,
              laborde_y: item.laborde_y,
             
              // Coordonnées D'AFFICHAGE (corrigées)
              displayLat,
              displayLng,
              hasValidCoordinates,
             
              // Polygone
              polygon_geojson: item.polygon_geojson || null,
              polygon_points: item.polygon_points || null,
              has_polygon: !!item.polygon_geojson,
              details: item.details || {
                ft_id: null,
                avis_id: null,
                paiement_id: null,
                statut_paiement: null
              }
            };
          });
          const allDescentes = processedDescentes.filter(d =>
            d.displayLat !== undefined && d.displayLng !== undefined &&
            !isNaN(d.displayLat) && !isNaN(d.displayLng) &&
            d.hasValidCoordinates
          );
          setDescentes(allDescentes);
          setFilteredDescentes(allDescentes);
         
          console.log(`${allDescentes.length} descentes chargées`);
        } else {
          setDescentes([]);
          setFilteredDescentes([]);
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des données:", error);
        setDescentes([]);
        setFilteredDescentes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    const withPolygons = filteredDescentes.filter(d => d.has_polygon).length;
    setDescentesWithPolygonsCount(withPolygons);
  }, [filteredDescentes]);
  
  // Mettre à jour les états basés sur l'état des couches
  useEffect(() => {
    const polygonsLayer = layers.find(l => l.name === 'Polygones de descente');
    if (polygonsLayer) {
      setShowPolygons(polygonsLayer.active);
    }
    
    const limitsLayer = layers.find(l => l.name === 'Limites communales');
    if (limitsLayer) {
      setShowLimits(limitsLayer.active);
    }
    
    const titresLayer = layers.find(l => l.name === 'Titres fonciers');
    if (titresLayer) {
      setShowTitres(titresLayer.active);
    }
    
    const cadastreLayer = layers.find(l => l.name === 'Parcelles cadastrales');
    if (cadastreLayer) {
      setShowCadastre(cadastreLayer.active);
    }
    
    const titresRequisitionLayer = layers.find(l => l.name === 'Titres de réquisition');
    if (titresRequisitionLayer) {
      setShowTitresRequisition(titresRequisitionLayer.active);
    }
  }, [layers]);
  
  // Filtrer les descentes selon les couleurs sélectionnées
  useEffect(() => {
    const descentesLayer = layers.find(l => l.name === 'Points de descente');
    if (!descentesLayer?.active) {
      setFilteredDescentes([]);
      return;
    }
    const filtered = descentes.filter(descente => {
      const couleur = getDescenteCouleur(descente);
      return filtreCouleurs[couleur];
    });
    setFilteredDescentes(filtered);
  }, [layers, filtreCouleurs, descentes]);
  
  // Fonction pour activer/désactiver tous les filtres de couleur
  const toggleAllColorFilters = (activate) => {
    setFiltreCouleurs({
      rouge: activate,
      jaune: activate,
      bleu: activate,
      vert: activate
    });
  };
  
  // Fonction pour centrer la carte sur une descente
  const focusOnDescente = (descente) => {
    if (mapRef.current) {
      if (descente.has_polygon && descente.polygon_geojson) {
        const coordinates = descente.polygon_geojson.coordinates[0];
        const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else if (descente.displayLat && descente.displayLng &&
                 !isNaN(descente.displayLat) && !isNaN(descente.displayLng)) {
        mapRef.current.setView([descente.displayLat, descente.displayLng], 16);
      }
      setSelectedDescente(descente);
    }
  };
  
  // Fonction pour maximiser le zoom
  const maximizeZoom = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      let targetZoom;
  
      if (isSatelliteView) {
        targetZoom = 22;
      } else {
        targetZoom = 20;
      }
  
      if (currentZoom < targetZoom) {
        mapRef.current.setZoom(targetZoom);
      } else {
        mapRef.current.setZoom(16);
      }
    }
  };
  
  // Fonction pour changer le style de carte
  const changeMapStyle = () => {
    const newSatelliteView = !isSatelliteView;
    setIsSatelliteView(newSatelliteView);
    if (mapRef.current && newSatelliteView) {
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom >= 20) {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setZoom(22);
          }
        }, 100);
      }
    }
  };
  
  // Fonction de recherche
  const handleSearch = () => {
    try {
      let lat, lng;
      if (searchType === 'latlon') {
        lat = parseFloat(searchLat);
        lng = parseFloat(searchLon);
    
        if (isNaN(lat) || isNaN(lng)) {
          alert("Coordonnées Lat/Lon invalides");
          return;
        }
      } else {
        const x = parseFloat(searchX);
        const y = parseFloat(searchY);
    
        if (isNaN(x) || isNaN(y)) {
          alert("Coordonnées Laborde invalides");
          return;
        }
        const converted = convertLabordeToWGS84(x, y);
        if (converted) {
          [lat, lng] = converted;
        } else {
          alert("Erreur conversion Laborde→WGS84");
          return;
        }
      }
     
      const points = [...filteredDescentes.map(d => ({ ...d, type: 'descente' }))];
  
      let closestPoint = null;
      let minDistance = Infinity;
  
      points.forEach(point => {
        if (point.displayLat && point.displayLng &&
            !isNaN(point.displayLat) && !isNaN(point.displayLng)) {
          const distance = Math.sqrt(
            Math.pow(point.displayLat - lat, 2) +
            Math.pow(point.displayLng - lng, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        }
      });
  
      const tolerance = 0.01;
  
      if (closestPoint && minDistance < tolerance) {
        setSearchResult(closestPoint);
        setSearchMarker([lat, lng]);
        setSelectedDescente(closestPoint);
    
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 16);
        }
      } else {
        setSearchResult(null);
        setSearchMarker([lat, lng]);
    
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 16);
        }
    
        alert("Aucune descente trouvée à proximité de ces coordonnées.");
      }
  
      setShowSearchModal(false);
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      alert("Erreur lors de la recherche");
    }
  };
  
  return (
    <div className="h-[91vh] flex flex-col bg-slate-50">
      {/* Contenu principal: Carte + Panneaux */}
      <div className="flex-1 flex overflow-hidden">
        {/* Carte */}
        <div className={`flex-grow transition-all duration-300 ${showLayersPanel || showListPanel ? 'lg:pr-1/4' : 'pr-0'}`}>
          <div className="bg-white rounded-lg h-full overflow-hidden relative" style={{ right: 0 }}>
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-slate-600">Chargement des descentes...</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={[-18.8792, 47.5079]}
                zoom={6}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
                zoomControl={false}
                className="h-full w-full"
                maxZoom={isSatelliteView ? 22 : 20}
                minZoom={2}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
              >
                {/* Couches de carte */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  opacity={isSatelliteView ? 0 : 1}
                  maxZoom={20}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  opacity={isSatelliteView ? 0.5 : 0}
                  maxZoom={22}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
                  url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  opacity={isSatelliteView ? 1 : 0}
                  maxZoom={22}
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                />
             
                {/* COUCHE DES TITRES DE RÉQUISITION */}
                <TitresRequisitionLayer showTitresRequisition={showTitresRequisition} />
             
                {/* COUCHE DES PARCELLES CADASTRALES */}
                <CadastreLayer showCadastre={showCadastre} />
             
                {/* COUCHE DES TITRES FONCIERS */}
                <TitresFonciersLayer showTitres={showTitres} />
             
                {/* COUCHE DES LIMITES ADMINISTRATIVES */}
                <AdministrativeLimitsLayer showLimits={showLimits} />
             
                {/* COUCHE AMÉLIORÉE : Polygones de descente avec points AU CENTRE */}
                <DescentePolygonLayer
                  descentes={filteredDescentes}
                  showPolygons={showPolygons}
                />
             
                {/* FitBounds avec coordonnées corrigées */}
                {filteredDescentes.length > 0 && (
                  <FitBounds filteredDescentes={filteredDescentes} showPolygons={showPolygons} />
                )}
             
                {/* Markers des descentes (points) - avec coordonnées D'AFFICHAGE CORRIGÉES */}
                {layers.find(l => l.name === 'Points de descente')?.active &&
                  filteredDescentes
                    .filter(d => d.displayLat !== undefined && d.displayLng !== undefined &&
                            !isNaN(d.displayLat) && !isNaN(d.displayLng) && !d.has_polygon) // Exclure celles avec polygone
                    .map((d, i) => (
                    <Marker
                      key={`point-${i}`}
                      position={[d.displayLat, d.displayLng]}
                      icon={getDescenteIcon(d)}
                      eventHandlers={{
                        click: () => setSelectedDescente(d)
                      }}
                    >
                      <Popup>
                        <DetailedPopup descente={d} />
                      </Popup>
                    </Marker>
                  ))}
            
                {/* Marqueur de recherche */}
                {searchMarker && (
                  <Marker position={searchMarker} icon={searchIcon}>
                    <Popup>
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-800">Point de Recherche</h3>
                        <p><strong>Coordonnées WGS84:</strong> {searchMarker[0].toFixed(6)}, {searchMarker[1].toFixed(6)}</p>
                        {searchType === 'laborde' && (
                          <p><strong>Coordonnées Laborde:</strong> {searchX}, {searchY}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            )}
         
            {/* Boutons d'action */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000] lg:flex-row">
              <button
                onClick={() => setShowLayersPanel(!showLayersPanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-colors ${
                  showLayersPanel
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtres</span>
              </button>
            
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-300 shadow-lg hover:bg-slate-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">Rechercher</span>
              </button>
            </div>
         
            {/* Contrôles de carte */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
              <button
                onClick={changeMapStyle}
                className={`w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-colors ${
                  isSatelliteView
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isSatelliteView ? (
                  <Map className="w-5 h-5" />
                ) : (
                  <Satellite className="w-5 h-5" />
                )}
              </button>
          
              <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors border-b"
                >
                  <ZoomIn className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <ZoomOut className="w-5 h-5 text-slate-700" />
                </button>
              </div>
          
              <button
                onClick={maximizeZoom}
                className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <Maximize2 className="w-5 h-5 text-slate-700" />
              </button>
          
              <button
                onClick={() => mapRef.current?.fitWorld()}
                className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <Home className="w-5 h-5 text-slate-700" />
              </button>
            </div>
         
            {/* Info zoom actuel */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 z-[1000]">
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3 h-3 text-blue-500" />
                <div>
                  <div className="font-medium text-slate-900">
                    Zoom: {mapRef.current?.getZoom() || 6}/{isSatelliteView ? '22' : '20'}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    Vue: {isSatelliteView ? 'Satellite' : 'Carte'}
                  </div>
                </div>
              </div>
            </div>
         
            {/* Légende AMÉLIORÉE */}
            <div className={`absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-[240px] transition-all duration-300 ${
              showLegend ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-800">Légende</h4>
                <button
                  onClick={() => setShowLegend(false)}
                  className="text-slate-500 hover:text-slate-700 p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Points de Descente</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
                      <span className="text-xs text-slate-600">En attente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 border border-white"></div>
                      <span className="text-xs text-slate-600">FT créé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
                      <span className="text-xs text-slate-600">Avis émis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>
                      <span className="text-xs text-slate-600">Paiement fait</span>
                    </div>
                  </div>
                </div>
             
                {/* Légende améliorée pour les polygones */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Polygones de Descente</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#dc2626',
                        border: '1px solid #dc2626',
                        opacity: 0.7,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}></div>
                      <span className="text-xs text-slate-600">En attente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#d97706',
                        border: '1px solid #d97706',
                        opacity: 0.7,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}></div>
                      <span className="text-xs text-slate-600">FT créé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#1d4ed8',
                        border: '1px solid #1d4ed8',
                        opacity: 0.7,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}></div>
                      <span className="text-xs text-slate-600">Avis émis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#059669',
                        border: '1px solid #059669',
                        opacity: 0.7,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}></div>
                      <span className="text-xs text-slate-600">Paiement fait</span>
                    </div>
                  </div>
                </div>
             
                {/* Légende pour les points dans les polygones */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Points dans Polygone</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-600 border-2 border-white shadow-md"></div>
                      <span className="text-xs text-slate-600">Point de descente (centre)</span>
                    </div>
                  </div>
                </div>
                
                {/* Légende pour les limites administratives */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Limites Administratives</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2" style={{ 
                        background: 'repeating-linear-gradient(90deg, #0284c7, #0284c7 4px, transparent 4px, transparent 8px)',
                        opacity: 0.7 
                      }}></div>
                      <span className="text-xs text-slate-600">Limites communales</span>
                    </div>
                  </div>
                </div>
                
                {/* Légende pour les titres fonciers */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Titres Fonciers</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#16a34a',
                        opacity: 0.7,
                        border: '1px solid #16a34a'
                      }}></div>
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#86efac',
                        opacity: 0.15,
                        border: '1px dashed #16a34a'
                      }}></div>
                      <span className="text-xs text-slate-600">Titres fonciers</span>
                    </div>
                  </div>
                </div>
                
                {/* Légende pour les parcelles cadastrales */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Parcelles Cadastrales</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#7c3aed',
                        opacity: 0.7,
                        border: '1px solid #7c3aed',
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}></div>
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#c4b5fd',
                        opacity: 0.12,
                        border: '1px dashed #7c3aed'
                      }}></div>
                      <span className="text-xs text-slate-600">Parcelles cadastrales</span>
                    </div>
                  </div>
                </div>
                
                {/* Légende pour les titres de réquisition */}
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Titres de Réquisition</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2" style={{ 
                        background: 'repeating-linear-gradient(90deg, #ea580c, #ea580c 6px, transparent 6px, transparent 12px)',
                        opacity: 0.8 
                      }}></div>
                      <div className="w-4 h-2 rounded-sm" style={{ 
                        backgroundColor: '#fed7aa',
                        opacity: 0.18,
                        border: '1px dashed #ea580c'
                      }}></div>
                      <span className="text-xs text-slate-600">Titres de réquisition</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
         
            {/* Bouton pour afficher la légende si cachée */}
            {!showLegend && (
              <button
                onClick={() => setShowLegend(true)}
                className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-[1000] flex items-center gap-2 text-sm hover:bg-slate-50"
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Légende</span>
              </button>
            )}
         
            {/* Résultat de recherche */}
            {searchResult && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-white p-4 rounded-lg shadow-lg max-w-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800">
                    Descente Trouvée
                  </h4>
                  <button
                    onClick={() => {
                      setSearchResult(null);
                      setSearchMarker(null);
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">État :</span>
                    <span className={`font-medium ${
                      getDescenteCouleur(searchResult) === 'vert' ? 'text-green-600' :
                      getDescenteCouleur(searchResult) === 'bleu' ? 'text-blue-600' :
                      getDescenteCouleur(searchResult) === 'jaune' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {getDescenteStatut(searchResult)}
                    </span>
                  </div>
                  {searchResult.has_polygon && (
                    <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                      <span className="font-medium text-purple-600 flex items-center gap-1">
                        <Shapes className="w-3 h-3" /> Polygone:
                      </span>
                      <span className="text-purple-800 font-medium">Disponible</span>
                      <div className="text-green-600 text-xs">(Point au centre)</div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Localité:</span>
                    <span className="text-slate-800">{searchResult.localisation || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Commune:</span>
                    <span className="text-slate-800">{searchResult.commune || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Coordonnées:</span>
                    <span className="text-slate-800 text-xs">
                      {searchResult.displayLat?.toFixed(6)}, {searchResult.displayLng?.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
     
        {/* Panneau latéral des filtres */}
        {showLayersPanel && (
          <div className="w-full lg:w-1/4 bg-white border-l border-slate-200 overflow-y-auto absolute lg:relative right-0 h-full z-10">
            <div className="p-4 lg:p-6 space-y-6 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-700" />
                  <h2 className="text-lg font-bold text-slate-900">Filtres Cartographie</h2>
                </div>
                <button
                  onClick={() => setShowLayersPanel(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Filtres des couches */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">Couches cartographiques</h3>
                {layers.map((layer, index) => (
                  <div key={layer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded border border-slate-300"
                        style={layer.active ? { backgroundColor: layer.color } : { backgroundColor: '#e5e7eb' }}
                      ></div>
                      <span className="text-sm font-medium text-slate-700">{layer.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newLayers = [...layers];
                        newLayers[index].active = !newLayers[index].active;
                        setLayers(newLayers);
                      }}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        layer.active ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform ${
                          layer.active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </button>
                  </div>
                ))}
              </div>

              {/* Filtres par couleur */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Filtrer par état</h3>
                  
                </div>
                {Object.entries(filtreCouleurs).map(([couleur, active]) => (
                  <div key={couleur} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{
                          backgroundColor:
                            couleur === 'rouge' ? '#ef4444' :
                            couleur === 'jaune' ? '#eab308' :
                            couleur === 'bleu' ? '#3b82f6' : '#22c55e'
                        }}
                      ></div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 capitalize block">
                          {couleur === 'rouge' ? 'En attente' :
                           couleur === 'jaune' ? 'FT créé' :
                           couleur === 'bleu' ? 'Avis émis' : 'Paiement fait'}
                        </span>
                        <span className="text-xs text-slate-500">({descentesByColor[couleur] || 0})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFiltreCouleurs(prev => ({
                          ...prev,
                          [couleur]: !prev[couleur]
                        }));
                      }}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        active ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform ${
                          active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </button>
                  </div>
                ))}
              </div>

              
            </div>
          </div>
        )}
      </div>
   
      {/* Modal de recherche */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1002] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Recherche par Coordonnées</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setSearchType('latlon')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchType === 'latlon'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lat/Lon (WGS84)
                </button>
                <button
                  onClick={() => setSearchType('laborde')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchType === 'laborde'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Laborde (XY)
                </button>
              </div>
              {searchType === 'latlon' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: -18.8792"
                      value={searchLat}
                      onChange={(e) => setSearchLat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 47.5079"
                      value={searchLon}
                      onChange={(e) => setSearchLon(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Coordonnée X (Laborde)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 450000"
                      value={searchX}
                      onChange={(e) => setSearchX(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Coordonnée Y (Laborde)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 850000"
                      value={searchY}
                      onChange={(e) => setSearchY(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleSearch}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Rechercher
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}