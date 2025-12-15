import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Building,
  MapPinned,
  Landmark,
  Phone,
  Home,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
  GeoJSON
} from "react-leaflet";
import L from "leaflet";
import proj4 from "proj4";
import "leaflet/dist/leaflet.css";

// --- DÉFINITIONS DES ICÔNES AVEC COULEURS ROUGE-JAUNE-BLEU-VERT ---

// Rouge vif pour "En attente" (danger)
const descenteIconRouge = new L.DivIcon({
  className: "custom-descente-icon-rouge",
  html: '<div style="width:14px;height:14px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Jaune vif pour "FT créé" (première étape)
const descenteIconJaune = new L.DivIcon({
  className: "custom-descente-icon-jaune",
  html: '<div style="width:14px;height:14px;background-color:#eab308;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Bleu vif pour "Avis émis" (étape intermédiaire)
const descenteIconBleu = new L.DivIcon({
  className: "custom-descente-icon-bleu",
  html: '<div style="width:14px;height:14px;background-color:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Vert vif pour "Paiement effectué" (étape finale)
const descenteIconVert = new L.DivIcon({
  className: "custom-descente-icon-vert",
  html: '<div style="width:14px;height:14px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.7);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Icône pour le résultat de recherche
const searchIcon = new L.DivIcon({
  className: "custom-search-icon",
  html: '<div style="width:16px;height:16px;background-color:#a855f7;border=2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

// --- Composant ShapefileLayer ---
const ShapefileLayer = () => {
  const [shapefileData, setShapefileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShapefile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Début du chargement du Shapefile...');
        const response = await fetch('http://localhost:3000/api/shapefile/limites');
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Shapefile chargé depuis API:', data);
        
        // Convertir le format de votre API en GeoJSON standard
        const geojson = {
          type: "FeatureCollection",
          features: data.map(item => ({
            type: "Feature",
            properties: {
              id: item.id,
              commune: item.commune,
              gid: item.id
            },
            geometry: item.geom
          }))
        };
        
        setShapefileData(geojson);
      } catch (err) {
        console.error('❌ Erreur chargement Shapefile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShapefile();
  }, []);

  // Fonction pour convertir les coordonnées Laborde vers WGS84
  const convertGeojsonCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return coords;
    
    // Pour MultiLineString: [[[x,y], [x,y], ...], [[x,y], ...]]
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && typeof coords[0][0][0] === 'number') {
      return coords.map(line => 
        line.map(point => {
          try {
            // Convertir Laborde (mètres) vers WGS84 (degrés)
            const [lat, lng] = convertLabordeToWGS84(point[0], point[1]);
            return [lng, lat]; // GeoJSON attend [lng, lat]
          } catch (error) {
            console.error('❌ Erreur conversion point:', point, error);
            return point;
          }
        })
      );
    }
    
    return coords;
  };

  // Convertir toutes les coordonnées du GeoJSON avec useMemo
  const convertedShapefileData = useMemo(() => {
    if (!shapefileData) return null;
    
    const converted = {
      ...shapefileData,
      features: shapefileData.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: convertGeojsonCoordinates(feature.geometry.coordinates)
        }
      }))
    };
    
    return converted;
  }, [shapefileData]);

  // Si chargement, afficher un indicateur
  if (loading) {
    return (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1001] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        📡 Chargement des limites communales...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1001] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        ⚠️ Erreur Shapefile: {error}
      </div>
    );
  }

  if (!convertedShapefileData) {
    return null;
  }

  if (!convertedShapefileData.features || convertedShapefileData.features.length === 0) {
    return null;
  }

  // Style pour MultiLineString
  const styleLine = (feature) => {
    return {
      weight: 3,
      opacity: 0.8,
      color: '#ff0000',
      dashArray: '5, 5'
    };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.commune) {
      const popupContent = `
        <div style="padding: 8px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">
            ${feature.properties.commune}
          </h3>
          <div style="font-size: 12px; color: #475569;">
            <div><strong>ID:</strong> ${feature.properties.id || feature.properties.gid || 'N/A'}</div>
            <div><strong>Type:</strong> ${feature.geometry?.type}</div>
          </div>
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      // Effet hover
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 5,
            opacity: 1,
            color: '#ff3333'
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(styleLine(feature));
        }
      });
    }
  };

  return (
    <GeoJSON
      key="communes-layer"
      data={convertedShapefileData}
      style={styleLine}
      onEachFeature={onEachFeature}
    />
  );
};

// --- Composant CadastreLayer ---
const CadastreLayer = () => {
  const [cadastreData, setCadastreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCadastre = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Début du chargement des données cadastrales...');
        const response = await fetch('http://localhost:3000/api/cadastre/');
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCadastreData(data);
      } catch (err) {
        console.error('❌ Erreur chargement cadastre:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCadastre();
  }, []);

  // Fonction pour convertir les coordonnées des polygones cadastraux
  const convertCadastreCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return coords;
    
    // Pour MultiPolygon: [[[[x,y], [x,y], ...], [[x,y], ...]]]
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
      return coords.map(polygon => 
        polygon.map(ring => 
          ring.map(point => {
            try {
              const [lat, lng] = convertLabordeToWGS84(point[0], point[1]);
              return [lng, lat];
            } catch (error) {
              console.error('❌ Erreur conversion point cadastre:', point, error);
              return point;
            }
          })
        )
      );
    }
    
    return coords;
  };

  // Convertir toutes les coordonnées avec useMemo
  const convertedCadastreData = useMemo(() => {
    if (!cadastreData) return null;
    
    const converted = {
      ...cadastreData,
      features: cadastreData.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: convertCadastreCoordinates(feature.geometry.coordinates)
        }
      }))
    };
    
    return converted;
  }, [cadastreData]);

  // Si chargement, afficher un indicateur
  if (loading) {
    return (
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-[1001] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        📡 Chargement des parcelles cadastrales...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-[1001] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        ⚠️ Erreur Cadastre: {error}
      </div>
    );
  }

  if (!convertedCadastreData) {
    return null;
  }

  if (!convertedCadastreData.features || convertedCadastreData.features.length === 0) {
    return null;
  }

  // Style pour les parcelles cadastrales
  const styleParcelle = (feature) => {
    const surface = feature.properties.surface || 0;
    let fillColor = '#4ade80';
    
    if (surface > 1000) fillColor = '#fbbf24';
    if (surface > 5000) fillColor = '#f87171';
    
    return {
      weight: 1,
      opacity: 0.8,
      color: '#1e40af',
      fillColor: fillColor,
      fillOpacity: 0.4,
      dashArray: '3'
    };
  };

  const onEachParcelle = (feature, layer) => {
    if (feature.properties) {
      const { nom_sectio, section, parcelle, surface } = feature.properties;
      
      const popupContent = `
        <div style="padding: 8px; max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">
            Parcelle ${parcelle} - Section ${section}
          </h3>
          <div style="font-size: 12px; color: #475569;">
            <div><strong>Section:</strong> ${section}</div>
            <div><strong>Parcelle:</strong> ${parcelle}</div>
            <div><strong>Nom:</strong> ${nom_sectio || 'Non spécifié'}</div>
            <div><strong>Surface:</strong> ${surface ? surface.toFixed(2) + ' m²' : 'Non spécifié'}</div>
            <div><strong>ID:</strong> ${feature.id || feature.properties.id || 'N/A'}</div>
          </div>
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      // Effet hover
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            opacity: 1,
            color: '#3b82f6',
            fillOpacity: 0.6
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(styleParcelle(feature));
        },
        click: (e) => {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            const map = layer._map;
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      });
    }
  };

  return (
    <GeoJSON
      key="cadastre-layer"
      data={convertedCadastreData}
      style={styleParcelle}
      onEachFeature={onEachParcelle}
    />
  );
};

// --- Composant TitreRequisitionLayer ---
const TitreRequisitionLayer = () => {
  const [titresData, setTitresData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTitres = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Début du chargement des titres réquisition...');
        const response = await fetch('http://localhost:3000/api/titre-requisition');
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Convertir le format de l'API en GeoJSON standard
        const geojson = {
          type: "FeatureCollection",
          features: data.map(item => ({
            type: "Feature",
            properties: {
              gid: item.gid,
              titre: item.titre,
              properiete: item.properiete,
              sur_plan: item.sur_plan,
              titre_r: item.titre_r,
              partie: item.partie,
              feuille: item.feuille,
              parcelle: item.parcelle,
              aire_calcu: item.aire_calcu,
              tolerance: item.tolerance
            },
            geometry: item.geom
          }))
        };
        
        setTitresData(geojson);
      } catch (err) {
        console.error('❌ Erreur chargement titres réquisition:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTitres();
  }, []);

  // Fonction pour convertir les coordonnées des titres réquisition
  const convertTitresCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return coords;
    
    // Pour MultiPolygon: [[[[x,y], [x,y], ...], [[x,y], ...]]]
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
      return coords.map(polygon => 
        polygon.map(ring => 
          ring.map(point => {
            try {
              const [lat, lng] = convertLabordeToWGS84(point[0], point[1]);
              return [lng, lat];
            } catch (error) {
              console.error('❌ Erreur conversion point titre:', point, error);
              return point;
            }
          })
        )
      );
    }
    
    return coords;
  };

  // Convertir toutes les coordonnées avec useMemo
  const convertedTitresData = useMemo(() => {
    if (!titresData) return null;
    
    const converted = {
      ...titresData,
      features: titresData.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: convertTitresCoordinates(feature.geometry.coordinates)
        }
      }))
    };
    
    return converted;
  }, [titresData]);

  // Si chargement, afficher un indicateur
  if (loading) {
    return (
      <div className="absolute top-36 left-1/2 transform -translate-x-1/2 z-[1001] bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        📡 Chargement des titres réquisition...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-36 left-1/2 transform -translate-x-1/2 z-[1001] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        ⚠️ Erreur Titres Réquisition: {error}
      </div>
    );
  }

  if (!convertedTitresData) {
    return null;
  }

  if (!convertedTitresData.features || convertedTitresData.features.length === 0) {
    return null;
  }

  // Style pour les titres réquisition
  const styleTitre = (feature) => {
    const tolerance = parseFloat(feature.properties.tolerance) || 0;
    let fillColor = '#4ade80';
    
    if (tolerance > 50) fillColor = '#fbbf24';
    if (tolerance > 100) fillColor = '#f87171';
    
    return {
      weight: 2,
      opacity: 0.9,
      color: '#9333ea',
      fillColor: fillColor,
      fillOpacity: 0.5,
      dashArray: '5, 3'
    };
  };

  const onEachTitre = (feature, layer) => {
    if (feature.properties) {
      const { titre, properiete, titre_r, parcelle, aire_calcu, tolerance } = feature.properties;
      
      const popupContent = `
        <div style="padding: 8px; max-width: 350px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b; font-size: 14px; border-bottom: 2px solid #9333ea; padding-bottom: 4px;">
            📋 ${titre} - ${properiete}
          </h3>
          <div style="font-size: 12px; color: #475569;">
            <div style="margin-bottom: 4px;">
              <strong style="color: #9333ea;">Titre Référence:</strong> 
              <div style="background: #f3e8ff; padding: 2px 6px; border-radius: 3px; margin-top: 2px; font-family: monospace;">
                ${titre_r}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0;">
              <div>
                <strong>Parcelle:</strong>
                <div>${parcelle || 'N/A'}</div>
              </div>
              <div>
                <strong>Surface:</strong>
                <div>${parseFloat(aire_calcu).toFixed(2)} m²</div>
              </div>
            </div>
            <div style="margin-top: 8px;">
              <strong>Tolérance:</strong>
              <div style="display: inline-block; background: ${tolerance > 100 ? '#fecaca' : tolerance > 50 ? '#fef3c7' : '#d1fae5'}; 
                        color: ${tolerance > 100 ? '#991b1b' : tolerance > 50 ? '#92400e' : '#065f46'}; 
                        padding: 2px 8px; border-radius: 12px; font-weight: bold; margin-left: 8px;">
                ${parseFloat(tolerance).toFixed(2)}%
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
              <strong>ID:</strong> ${feature.properties.gid}
              ${feature.properties.partie ? `<br/><strong>Partie:</strong> ${feature.properties.partie}` : ''}
              ${feature.properties.feuille ? `<br/><strong>Feuille:</strong> ${feature.properties.feuille}` : ''}
            </div>
          </div>
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      // Effet hover
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 4,
            opacity: 1,
            color: '#7c3aed',
            fillOpacity: 0.7,
            dashArray: 'none'
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(styleTitre(feature));
        },
        click: (e) => {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            const map = layer._map;
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      });
    }
  };

  return (
    <GeoJSON
      key="titres-requisition-layer"
      data={convertedTitresData}
      style={styleTitre}
      onEachFeature={onEachTitre}
    />
  );
};

// --- Fonctions Utilitaires ---

// Fonction pour déterminer l'icône en fonction des relations FT, Avis, Paiement
const getDescenteIcon = (descente: any) => {
  const { details } = descente;
  
  if (details?.paiement_id) {
    return descenteIconVert;
  }
  
  if (details?.avis_id) {
    return descenteIconBleu;
  }
  
  if (details?.ft_id) {
    return descenteIconJaune;
  }
  
  return descenteIconRouge;
};

// Component pour ajuster la vue de la carte aux marqueurs
const FitBounds = ({ data }: { data: any[] }) => {
  const map = useMap();
  useEffect(() => {
    const coords = data
      .filter(d => d.lat !== undefined && d.lng !== undefined && !isNaN(d.lat) && !isNaN(d.lng))
      .map(d => [d.lat, d.lng] as [number, number]);
    if (coords.length) {
      const bounds = L.latLngBounds(coords);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [data, map]);
  return null;
};

// Définition projection EPSG:8441 (Laborde Madagascar)
try {
  proj4.defs(
    "EPSG:8441",
    "+proj=omerc +lat_0=-18.9 +lonc=46.43722916666667 +alpha=18.9 +k=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs"
  );
} catch (e) {
  console.error("Erreur enregistrement EPSG:8441:", e);
}

// Fonction pour convertir Laborde vers WGS84
const convertLabordeToWGS84 = (x: number, y: number): [number, number] => {
  try {
    const result = proj4("EPSG:8441", "EPSG:4326", [x, y]);
    return [result[1], result[0]];
  } catch (error) {
    console.error("Erreur conversion Laborde:", error);
    throw new Error("Erreur lors de la conversion des coordonnées");
  }
};

// Fonction pour convertir WGS84 vers Laborde
const convertWGS84ToLaborde = (lat: number, lng: number): [number, number] => {
  try {
    const result = proj4("EPSG:4326", "EPSG:8441", [lng, lat]);
    return [result[0], result[1]];
  } catch (error) {
    console.error("Erreur conversion WGS84 vers Laborde:", error);
    throw new Error("Erreur lors de la conversion des coordonnées");
  }
};

// Fonction pour vérifier si des coordonnées sont en Laborde (valeurs en mètres)
const isLabordeCoordinates = (x: number, y: number): boolean => {
  return x > 1000 && y > 1000;
};

// Fonction pour vérifier si des coordonnées sont en WGS84 (valeurs en degrés)
const isWGS84Coordinates = (lat: number, lng: number): boolean => {
  return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
};

// Fonction pour afficher les coordonnées de façon sécurisée
const safeCoordinateDisplay = (coord: number): string => {
  if (coord === undefined || coord === null || isNaN(coord) || !isFinite(coord)) {
    return "N/A";
  }
  return coord.toFixed(6);
};

// --- Composant Principal ---

export default function CartographieContent() {
  const [descentes, setDescentes] = useState<any[]>([]);
  const [filteredDescentes, setFilteredDescentes] = useState<any[]>([]);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showListPanel, setShowListPanel] = useState(false);
  const [searchType, setSearchType] = useState<'latlon' | 'laborde'>('latlon');
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [searchX, setSearchX] = useState("");
  const [searchY, setSearchY] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchMarker, setSearchMarker] = useState<[number, number] | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedDescente, setSelectedDescente] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [coordinateIssues, setCoordinateIssues] = useState<string[]>([]);
  
  const mapRef = useRef<L.Map | null>(null);

  // Filtres pour les couches
  const [layers, setLayers] = useState([
    { name: 'Points de descente', active: true, color: 'orange', type: 'descentes' },
    { name: 'Limites communales', active: true, color: 'blue', type: 'shapefile' },
    { name: 'Parcelles cadastrales', active: false, color: 'green', type: 'cadastre' },
    { name: 'Titres réquisition', active: false, color: 'purple', type: 'titres' },
    { name: 'Zones inondables', active: false, color: 'blue', type: 'zone' },
    { name: 'Permis de construction', active: false, color: 'green', type: 'zone' },
    { name: 'Infrastructure critique', active: false, color: 'red', type: 'zone' },
  ]);

  // Filtres pour les couleurs de descentes
  const [filtreCouleurs, setFiltreCouleurs] = useState({
    rouge: true,
    jaune: true,
    bleu: true,
    vert: true
  });

  // Fonction pour déterminer la couleur d'une descente
  const getDescenteCouleur = (descente: any) => {
    const { details } = descente;
    
    if (details?.paiement_id) return 'vert';
    if (details?.avis_id) return 'bleu';
    if (details?.ft_id) return 'jaune';
    return 'rouge';
  };

  // Fonction pour déterminer le statut affiché
  const getDescenteStatut = (descente: any) => {
    const { details } = descente;
    
    if (details?.paiement_id) return 'Paiement effectué';
    if (details?.avis_id) return 'Avis de paiement émis';
    if (details?.ft_id) return 'FT créé';
    return 'En attente';
  };

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
        setCoordinateIssues([]);
        
        const resDescentes = await fetch("http://localhost:3000/api/descentes/carte/descentes");
        
        if (!resDescentes.ok) {
          throw new Error(`Erreur HTTP: ${resDescentes.status}`);
        }
        
        const response = await resDescentes.json();
        
        if (response.success && Array.isArray(response.data)) {
          const processedDescentes = response.data.map((item) => {
            const issues: string[] = [];
            let lat = item.lat;
            let lng = item.lng;
            let labordeX = item.laborde_x;
            let labordeY = item.laborde_y;
            
            if (isLabordeCoordinates(lat, lng) && (!labordeX || !labordeY)) {
              labordeX = lng;
              labordeY = lat;
              issues.push("Inversion coordonnées détectée");
            }
            
            if (labordeX && labordeY) {
              try {
                [lat, lng] = convertLabordeToWGS84(labordeX, labordeY);
              } catch (error) {
                issues.push(`Erreur conversion Laborde→WGS84: ${error.message}`);
              }
            }
            
            if (!isWGS84Coordinates(lat, lng)) {
              issues.push(`Coordonnées WGS84 hors plage normale (lat:${lat}, lng:${lng})`);
            }
            
            if (issues.length > 0) {
              setCoordinateIssues(prev => [...prev, `Descente ${item.id}: ${issues.join(', ')}`]);
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
              lat: lat,
              lng: lng,
              laborde_x: labordeX,
              laborde_y: labordeY,
              details: item.details || {
                ft_id: null,
                avis_id: null,
                paiement_id: null,
                statut_paiement: null
              },
              coordinate_issues: issues
            };
          });
          
          const allDescentes = processedDescentes.filter(d => 
            d.lat !== undefined && d.lng !== undefined && 
            !isNaN(d.lat) && !isNaN(d.lng)
          );
          
          setDescentes(allDescentes);
          setFilteredDescentes(allDescentes);
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

  // Filtrer les descentes selon les couleurs sélectionnées
  useEffect(() => {
    const descentesLayer = layers.find(l => l.name === 'Points de descente');
    
    if (!descentesLayer?.active) {
      setFilteredDescentes([]);
      return;
    }

    const filtered = descentes.filter(descente => {
      const couleur = getDescenteCouleur(descente);
      return filtreCouleurs[couleur as keyof typeof filtreCouleurs];
    });

    setFilteredDescentes(filtered);
  }, [layers, filtreCouleurs, descentes]);

  // Fonction pour centrer la carte sur une descente
  const focusOnDescente = (descente: any) => {
    if (mapRef.current && descente.lat && descente.lng && !isNaN(descente.lat) && !isNaN(descente.lng)) {
      mapRef.current.setView([descente.lat, descente.lng], 16);
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
      let lat: number, lng: number;

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

        [lat, lng] = convertLabordeToWGS84(x, y);
      }

      const points = [...filteredDescentes.map(d => ({ ...d, type: 'descente' as const }))];
      
      let closestPoint = null;
      let minDistance = Infinity;
      
      points.forEach(point => {
        if (point.lat && point.lng && !isNaN(point.lat) && !isNaN(point.lng)) {
          const distance = Math.sqrt(Math.pow(point.lat - lat, 2) + Math.pow(point.lng - lng, 2));
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

  // Formater une date
  const formatDate = (dateString: string) => {
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

  // Formater une heure
  const formatHeure = (heureString: string) => {
    if (!heureString) return "";
    return heureString;
  };

  return (
    <div className="h-[91vh] flex flex-col bg-slate-50">
      {/* Contenu principal: Carte + Panneaux */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Carte */}
        <div className={`transition-all duration-300 relative ${
          showLayersPanel || showListPanel ? 'w-full lg:w-2/3' : 'w-full'
        }`}>
          <div className="bg-white rounded-lg h-full overflow-hidden relative">
            
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-slate-600">Chargement des descentes...</p>
                  {coordinateIssues.length > 0 && (
                    <div className="mt-2 text-xs text-yellow-600 max-w-xs">
                      {coordinateIssues.length} avertissement(s) sur les coordonnées
                    </div>
                  )}
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

                {/* Couche Shapefile (limites communales) */}
                {layers.find(l => l.name === 'Limites communales')?.active && (
                  <ShapefileLayer />
                )}

                {/* Couche Cadastrale (parcelles) */}
                {layers.find(l => l.name === 'Parcelles cadastrales')?.active && (
                  <CadastreLayer />
                )}

                {/* Couche Titres Réquisition */}
                {layers.find(l => l.name === 'Titres réquisition')?.active && (
                  <TitreRequisitionLayer />
                )}

                {/* FitBounds seulement si on a des coordonnées valides */}
                {filteredDescentes.length > 0 && (
                  <FitBounds data={filteredDescentes.filter(d => 
                    d.lat && d.lng && !isNaN(d.lat) && !isNaN(d.lng)
                  )} />
                )}

                {/* Markers des descentes */}
                {filteredDescentes
                  .filter(d => d.lat !== undefined && d.lng !== undefined && !isNaN(d.lat) && !isNaN(d.lng))
                  .map((d, i) => (
                  <Marker 
                    key={i} 
                    position={[d.lat, d.lng]} 
                    icon={getDescenteIcon(d)}
                    eventHandlers={{
                      click: () => setSelectedDescente(d)
                    }}
                  >
                    <Popup>
                      <div className="space-y-3 min-w-[320px] max-h-[70vh] overflow-y-auto p-1">
                        {/* Badge d'état */}
                        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-block mb-2 ${
                          getDescenteCouleur(d) === 'vert' ? 'bg-green-100 text-green-800' :
                          getDescenteCouleur(d) === 'bleu' ? 'bg-blue-100 text-blue-800' :
                          getDescenteCouleur(d) === 'jaune' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getDescenteStatut(d)}
                        </div>
                        
                        {/* En-tête */}
                        <div className="border-b pb-3">
                          <h3 className="font-bold text-lg text-slate-800">
                            Descente {d.reference || `#${d.id}`}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {d.date_descente && (
                              <>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(d.date_descente)}
                                {d.heure_descente && ` à ${formatHeure(d.heure_descente)}`}
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
                                <div className={`w-3 h-3 rounded-full ${d.details?.ft_id ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                                <span className="text-slate-600">FT créé:</span>
                              </div>
                              <span className={`font-medium ${d.details?.ft_id ? 'text-green-600' : 'text-red-600'}`}>
                                {d.details?.ft_id ? '✓ Fini' : '⨯ Non fini'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${d.details?.avis_id ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                <span className="text-slate-600">Avis de paiement:</span>
                              </div>
                              <span className={`font-medium ${d.details?.avis_id ? 'text-green-600' : 'text-red-600'}`}>
                                {d.details?.avis_id ? '✓ Fini' : '⨯ Non fini'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${d.details?.paiement_id ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-slate-600">Paiement:</span>
                              </div>
                              <span className={`font-medium ${d.details?.paiement_id ? 'text-green-600' : 'text-red-600'}`}>
                                {d.details?.paiement_id ? '✓ Fini' : '⨯ Non fini'}
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
                              {d.n_pv_pat && (
                                <div>
                                  <span className="font-medium">N° PV/PAT:</span>
                                  <div className="text-slate-600">{d.n_pv_pat}</div>
                                </div>
                              )}
                              {d.n_fifafi && (
                                <div>
                                  <span className="font-medium">N° FIFAFI:</span>
                                  <div className="text-slate-600">{d.n_fifafi}</div>
                                </div>
                              )}
                              {d.ref_om && (
                                <div>
                                  <span className="font-medium">Ref OM:</span>
                                  <div className="text-slate-600">{d.ref_om}</div>
                                </div>
                              )}
                              {d.ref_rapport && (
                                <div>
                                  <span className="font-medium">Ref Rapport:</span>
                                  <div className="text-slate-600">{d.ref_rapport}</div>
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
                              <div><span className="font-medium">Localité:</span> {d.localisation || 'Non spécifié'}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {d.district && (
                                  <div>
                                    <span className="font-medium">District:</span>
                                    <div className="text-slate-600">{d.district}</div>
                                  </div>
                                )}
                                {d.commune && (
                                  <div>
                                    <span className="font-medium">Commune:</span>
                                    <div className="text-slate-600">{d.commune}</div>
                                  </div>
                                )}
                                {d.fokontany && (
                                  <div>
                                    <span className="font-medium">Fokontany:</span>
                                    <div className="text-slate-600">{d.fokontany}</div>
                                  </div>
                                )}
                                {d.superficie && (
                                  <div>
                                    <span className="font-medium">Superficie:</span>
                                    <div className="text-slate-600">{d.superficie}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Coordonnées */}
                          <div>
                            <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
                              <Globe className="w-4 h-4" /> Coordonnées
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-medium">WGS84 (Lat/Lon):</span>
                                <div className="text-slate-600">
                                  Lat: {safeCoordinateDisplay(d.lat)}<br/>
                                  Lon: {safeCoordinateDisplay(d.lng)}
                                </div>
                              </div>
                              {d.laborde_x && d.laborde_y ? (
                                <div>
                                  <span className="font-medium">Laborde (mètres):</span>
                                  <div className="text-slate-600">
                                    X: {safeCoordinateDisplay(d.laborde_x)}<br/>
                                    Y: {safeCoordinateDisplay(d.laborde_y)}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    Système projeté EPSG:8441
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-medium">Laborde:</span>
                                  <div className="text-slate-600 italic text-[10px]">
                                    Non disponible
                                  </div>
                                </div>
                              )}
                            </div>
                            {d.coordinate_issues && d.coordinate_issues.length > 0 && (
                              <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                <span className="font-medium">⚠️ Note:</span> {d.coordinate_issues.join(', ')}
                              </div>
                            )}
                          </div>
                          
                          {/* Personnes concernées */}
                          <div>
                            <h4 className="font-semibold text-slate-700 text-sm mb-1 flex items-center gap-1">
                              <User className="w-4 h-4" /> Personnes concernées
                            </h4>
                            <div className="text-sm space-y-1">
                              {d.nom_verbalisateur && (
                                <div>
                                  <span className="font-medium">Verbalisateur:</span>
                                  <div className="text-slate-600">{d.nom_verbalisateur}</div>
                                  {d.type_verbalisateur && (
                                    <div className="text-xs text-slate-500">({d.type_verbalisateur})</div>
                                  )}
                                </div>
                              )}
                              {d.nom_personne_r && (
                                <div>
                                  <span className="font-medium">Personne R:</span>
                                  <div className="text-slate-600">{d.nom_personne_r}</div>
                                  {d.personne_r && (
                                    <div className="text-xs text-slate-500">({d.personne_r})</div>
                                  )}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                {d.contact_r && (
                                  <div>
                                    <span className="font-medium flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> Contact:
                                    </span>
                                    <div className="text-slate-600">{d.contact_r}</div>
                                  </div>
                                )}
                                {d.adresse_r && (
                                  <div>
                                    <span className="font-medium">Adresse:</span>
                                    <div className="text-slate-600">{d.adresse_r}</div>
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
                                  {Array.isArray(d.infraction) 
                                    ? d.infraction.map((inf: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-1 mb-1">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                          <span>{inf}</span>
                                        </div>
                                      ))
                                    : <div className="flex items-start gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                        <span>{d.infraction}</span>
                                      </div>
                                  }
                                </div>
                              </div>
                              {d.actions && (
                                <div>
                                  <span className="font-medium">Actions:</span>
                                  <div className="text-slate-600 mt-1">
                                    {Array.isArray(d.actions)
                                      ? d.actions.map((action: string, idx: number) => (
                                          <div key={idx} className="flex items-start gap-1 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                            <span>{action}</span>
                                          </div>
                                        ))
                                      : <div className="flex items-start gap-1">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                          <span>{d.actions}</span>
                                        </div>
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Rendez-vous */}
                          {d.date_rendez_vous && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                              <h4 className="font-semibold text-yellow-700 text-sm mb-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> Rendez-vous fixé
                              </h4>
                              <div className="text-sm text-yellow-600">
                                {formatDate(d.date_rendez_vous)}
                                {d.heure_rendez_vous && ` à ${formatHeure(d.heure_rendez_vous)}`}
                              </div>
                            </div>
                          )}
                          
                          {/* Pièces à fournir */}
                          {d.dossier_a_fournir && (
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <h4 className="font-semibold text-blue-700 text-sm mb-1">📄 Pièces à fournir</h4>
                              <ul className="text-xs text-blue-600 list-disc pl-4">
                                {Array.isArray(d.dossier_a_fournir) 
                                  ? d.dossier_a_fournir.map((piece: string, idx: number) => (
                                      <li key={idx}>{piece}</li>
                                    ))
                                  : <li>{d.dossier_a_fournir}</li>
                                }
                              </ul>
                            </div>
                          )}
                          
                          {/* Informations techniques */}
                          <div className="border-t pt-3">
                            <h4 className="font-semibold text-slate-700 text-sm mb-1">📋 Informations techniques</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              {d.modele_pv && (
                                <div>
                                  <span className="font-medium">Modèle PV:</span>
                                  <div className="text-slate-600">{d.modele_pv}</div>
                                </div>
                              )}
                              <div>
                                <span className="font-medium">ID Descente:</span>
                                <div className="text-slate-600">{d.id}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bouton d'action */}
                        <div className="pt-3 border-t">
                          <a 
                            href={`/descentes/${d.id}`} 
                            className="inline-block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
                          >
                            Voir les détails complets
                          </a>
                        </div>
                      </div>
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

            {/* Boutons d'action: Filtres, Liste et Recherche */}
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
                onClick={() => setShowListPanel(!showListPanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-colors ${
                  showListPanel 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">Liste</span>
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

            {/* Légende */}
            <div className={`absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-[220px] transition-all duration-300 ${
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
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Progression Descente</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-600">En attente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-slate-600">FT créé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-slate-600">Avis émis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-xs text-slate-600">Paiement fait</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-1">Titres Réquisition</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-xs text-slate-600">Titres réquisition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4ade80' }}></div>
                      <span className="text-xs text-slate-600">Tolérance normale (≤100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }}></div>
                      <span className="text-xs text-slate-600">Tolérance élevée</span>
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
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Localité:</span>
                    <span className="text-slate-800">{searchResult.localisation || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Commune:</span>
                    <span className="text-slate-800">{searchResult.commune || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Verbalisateur:</span>
                    <span className="text-slate-800">{searchResult.nom_verbalisateur || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Infraction:</span>
                    <span className="text-slate-800">{searchResult.infraction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Latitude:</span>
                    <span className="text-slate-800">{safeCoordinateDisplay(searchResult.lat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Longitude:</span>
                    <span className="text-slate-800">{safeCoordinateDisplay(searchResult.lng)}</span>
                  </div>
                  {searchResult.laborde_x && (
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Coordonnées Laborde:</span>
                      <span className="text-slate-800">
                        {safeCoordinateDisplay(searchResult.laborde_x)}, {safeCoordinateDisplay(searchResult.laborde_y)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avertissement sur les problèmes de coordonnées */}
            {coordinateIssues.length > 0 && (
              <div className="absolute bottom-20 left-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-3 z-[1000] max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    Avertissements coordonnées
                  </h4>
                  <button 
                    onClick={() => setCoordinateIssues([])}
                    className="text-yellow-600 hover:text-yellow-800 text-sm"
                  >
                    Ignorer
                  </button>
                </div>
                <div className="text-xs text-yellow-700 max-h-24 overflow-y-auto">
                  <div className="mb-2">⚠️ {coordinateIssues.length} descente(s) avec coordonnées non standards</div>
                  <div className="text-[10px] text-yellow-600">
                    (Toutes les descentes sont affichées malgré les avertissements)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panneau latéral des filtres */}
        {showLayersPanel && (
          <div className="w-full lg:w-1/4 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4 lg:p-6 space-y-6">
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
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">Couches de la Carte</h3>
                <div className="space-y-3">
                  {layers.map((layer, index) => (
                    <label key={index} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={layer.active}
                        onChange={(e) => {
                          const newLayers = [...layers];
                          newLayers[index].active = e.target.checked;
                          setLayers(newLayers);
                        }}
                        className={`w-4 h-4 rounded border-slate-300 text-${layer.color}-500 focus:ring-${layer.color}-500`}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-3 h-3 rounded-full bg-${layer.color}-500`} />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{layer.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtres par statut */}
              {layers.find(l => l.name === 'Points de descente')?.active && (
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-3">Filtrer par Progression</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtreCouleurs.rouge}
                        onChange={(e) => setFiltreCouleurs({...filtreCouleurs, rouge: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm text-slate-700">En attente</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {descentesByColor.rouge}
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtreCouleurs.jaune}
                        onChange={(e) => setFiltreCouleurs({...filtreCouleurs, jaune: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span className="text-sm text-slate-700">FT créé</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {descentesByColor.jaune}
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtreCouleurs.bleu}
                        onChange={(e) => setFiltreCouleurs({...filtreCouleurs, bleu: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-slate-700">Avis émis</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {descentesByColor.bleu}
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtreCouleurs.vert}
                        onChange={(e) => setFiltreCouleurs({...filtreCouleurs, vert: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm text-slate-700">Paiement fait</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {descentesByColor.vert}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Statistiques */}
              <div className="bg-slate-50 rounded-lg p-4 mt-4 border-t border-slate-200">
                <h3 className="font-bold text-slate-900 mb-3">Statistiques</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Descentes totales</span>
                    <span className="font-semibold text-slate-900">{descentes.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Descentes visibles</span>
                    <span className="font-semibold text-slate-900">{filteredDescentes.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">En attente</span>
                    <span className="font-semibold text-slate-900">{descentesByColor.rouge}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">FT créés</span>
                    <span className="font-semibold text-slate-900">{descentesByColor.jaune}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Avis émis</span>
                    <span className="font-semibold text-slate-900">{descentesByColor.bleu}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Paiements faits</span>
                    <span className="font-semibold text-slate-900">{descentesByColor.vert}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Zoom maximum</span>
                    <span className="font-semibold text-slate-900">{isSatelliteView ? '22 (Satellite)' : '20 (Carte)'}</span>
                  </div>
                  
                  {/* Information Shapefile */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-slate-600">Limites communales</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      layers.find(l => l.name === 'Limites communales')?.active 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {layers.find(l => l.name === 'Limites communales')?.active ? 'Activé' : 'Désactivé'}
                    </span>
                  </div>
                  
                  {/* Information Cadastre */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-slate-600">Parcelles cadastrales</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      layers.find(l => l.name === 'Parcelles cadastrales')?.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {layers.find(l => l.name === 'Parcelles cadastrales')?.active ? 'Activé' : 'Désactivé'}
                    </span>
                  </div>
                  
                  {/* Information Titres Réquisition */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-slate-600">Titres réquisition</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      layers.find(l => l.name === 'Titres réquisition')?.active 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {layers.find(l => l.name === 'Titres réquisition')?.active ? 'Activé' : 'Désactivé'}
                    </span>
                  </div>
                  
                  {coordinateIssues.length > 0 && (
                    <div className="flex justify-between items-center text-yellow-600">
                      <span className="text-sm">Avertissements coordonnées</span>
                      <span className="font-semibold">{coordinateIssues.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panneau latéral de liste des descentes */}
        {showListPanel && (
          <div className="w-full lg:w-1/4 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-slate-700" />
                  <h2 className="text-lg font-bold text-slate-900">Liste des Descentes</h2>
                </div>
                <button
                  onClick={() => setShowListPanel(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-slate-600 text-sm">Chargement...</p>
                </div>
              ) : descentes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">Aucune descente trouvée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {descentes.map(descente => (
                    <div 
                      key={descente.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedDescente?.id === descente.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                      }`}
                      onClick={() => focusOnDescente(descente)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">
                            {descente.reference || `Descente #${descente.id}`}
                          </h4>
                          <p className="text-sm text-slate-600 truncate">{descente.localisation}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              getDescenteCouleur(descente) === 'vert' ? 'bg-green-100 text-green-800' :
                              getDescenteCouleur(descente) === 'bleu' ? 'bg-blue-100 text-blue-800' :
                              getDescenteCouleur(descente) === 'jaune' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {getDescenteStatut(descente)}
                            </span>
                            {descente.date_descente && (
                              <span className="text-xs text-slate-500">
                                {formatDate(descente.date_descente)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          getDescenteCouleur(descente) === 'vert' ? 'bg-green-500' :
                          getDescenteCouleur(descente) === 'bleu' ? 'bg-blue-500' :
                          getDescenteCouleur(descente) === 'jaune' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                      </div>
                      <div className="text-xs text-slate-500 mt-2 grid grid-cols-2 gap-x-2">
                        <div><span className="font-medium">Commune:</span> {descente.commune || '-'}</div>
                        <div><span className="font-medium">Verbalisateur:</span> {descente.nom_verbalisateur?.substring(0, 10) || '-'}</div>
                        <div className="col-span-2"><span className="font-medium">Infraction:</span> {descente.infraction?.toString().substring(0, 40)}...</div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>FT: {descente.details?.ft_id ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>Avis: {descente.details?.avis_id ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>Paiement: {descente.details?.paiement_id ? '✓' : '✗'}</span>
                        </div>
                      </div>
                      {descente.coordinate_issues && descente.coordinate_issues.length > 0 && (
                        <div className="mt-1 text-xs text-yellow-600 bg-yellow-50 p-1 rounded">
                          ⚠️ Coordonnées non standards
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          focusOnDescente(descente);
                        }}
                        className="mt-2 w-full text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 px-2 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Centrer sur la carte
                      </button>
                    </div>
                  ))}
                </div>
              )}
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