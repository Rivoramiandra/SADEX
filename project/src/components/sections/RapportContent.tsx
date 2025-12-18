import { X, Plus, Calendar, Clock, MapPin, Users, FileText, CheckSquare, Map as MapIcon, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import proj4 from 'proj4';

interface FormulaireDescenteProps {
  onClose: () => void;
  onSubmit: (data: DescenteFormData) => void;
  initialData?: DescenteFormData;
  locations?: LocationData[];
}

interface DescenteFormData {
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous?: string;
  heure_rendez_vous?: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  type_verbalisateur?: string;
  nom_verbalisateur?: string;
  personne_r?: string;
  nom_personne_r?: string;
  contact_r?: string;
  adresse_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  localisation?: string;
  superficie?: number;
  x_coord?: number;
  y_coord?: number;
  infraction?: string[];
  actions?: string[];
  modele_pv?: string;
  reference?: string;
  dossier_a_fournir?: string[];
  geom?: any;
  polygon_points?: PolygonPoint[];
  geometry_type?: 'polygon';
}

interface PolygonPoint {
  latitude: number;
  longitude: number;
  x_lambert?: number;
  y_lambert?: number;
  order: number;
}

interface LocationData {
  fkt: string;
  comm: string;
  dist: string;
}

interface FokontanyData {
  id_fkt: string;
  fkt: string;
  firaisana: string;
  distrika: string;
}

// Définition des systèmes de coordonnées
const lambertMadagascar = '+proj=lcc +lat_1=-18.9 +lat_2=-18.9 +lat_0=-18.9 +lon_0=46.43722916666667 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

const convertLambertToWGS84 = (x: number, y: number): { lat: number, lng: number } => {
  try {
    const result = proj4(lambertMadagascar, wgs84, [x, y]);
    return {
      lat: result[1],
      lng: result[0]
    };
  } catch (error) {
    console.error('Erreur de conversion de coordonnées:', error);
    return {
      lat: -18.8792,
      lng: 47.5079
    };
  }
};

const convertWGS84ToLambert = (lng: number, lat: number): { x: number, y: number } => {
  try {
    const result = proj4(wgs84, lambertMadagascar, [lng, lat]);
    return {
      x: Math.round(result[0]),
      y: Math.round(result[1])
    };
  } catch (error) {
    console.error('Erreur de conversion inverse de coordonnées:', error);
    return {
      x: 0,
      y: 0
    };
  }
};

const actionOptions = [
  'Depôt Convocation(PV)',
  'Depôt AIT',
  'Non respect',
  'Immobilisation MR'
];
const constatOptions = [
  'Remblai Illicite',
  'Construction sur Remblai Illicite',
  'Remblai Illicite recent',
  'Cellage'
];
const piecesOption = [
  'CSJ',
  'Plan topo(Scr labord)',
  'delimitation surface terrain remblayée',
  'PU(srat,dlat) avec allignement',
  'Procuration',
  'Acte de vente',
  'PC',
  'PR'
];

const calculateGeodesicArea = (latLngs: L.LatLng[]) => {
  const pointsCount = latLngs.length;
  let area = 0.0;
  const d2r = Math.PI / 180;
  if (pointsCount > 2) {
    for (let i = 0; i < pointsCount; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[(i + 1) % pointsCount];
      area += (p2.lng - p1.lng) * d2r *
              (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r)) / 2.0;
    }
    area = area * 6378137.0 * 6378137.0 / 2.0;
  }
  return Math.abs(area);
};

export default function FormulaireDescente({ 
  onClose, 
  onSubmit, 
  initialData,
  locations = []
}: FormulaireDescenteProps) {
  const [formData, setFormData] = useState<DescenteFormData>(initialData || {
    actions: [],
    infraction: [],
    dossier_a_fournir: [],
    polygon_points: [],
    geometry_type: 'polygon'
  });
  
  const [fokontanyData, setFokontanyData] = useState<FokontanyData[]>([]);
  const [filteredFokontany, setFilteredFokontany] = useState<FokontanyData[]>([]);
  const [showFokontanyDropdown, setShowFokontanyDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>(initialData?.polygon_points || []);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [polygonLayer, setPolygonLayer] = useState<L.Polygon | null>(null);
  const [coordinateMarker, setCoordinateMarker] = useState<L.Marker | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const locationLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const fokontanyRef = useRef<HTMLDivElement>(null);
  const coordinateMarkerRef = useRef<L.Marker | null>(null);

  // Charger les données des fokontany depuis l'API
  useEffect(() => {
    const fetchFokontanyData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:3000/api/fokontany');
        if (!response.ok) {
          throw new Error('Failed to fetch fokontany data');
        }
        const data: FokontanyData[] = await response.json();
        setFokontanyData(data);
        setFilteredFokontany(data);
        
        if (initialData?.fokontany) {
          const fokontanyInfo = data.find(item => item.fkt === initialData.fokontany);
          if (fokontanyInfo) {
            setFormData(prev => ({
              ...prev,
              district: fokontanyInfo.distrika,
              commune: fokontanyInfo.firaisana,
              fokontany: fokontanyInfo.fkt
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching fokontany data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFokontanyData();
  }, [initialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fokontanyRef.current && !fokontanyRef.current.contains(event.target as Node)) {
        setShowFokontanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fonction pour gérer les changements dans les champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericValue = name === 'x_coord' || name === 'y_coord' || name === 'superficie' ? 
      (value === '' ? undefined : Number(value)) : value;

    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));

    // Si x_coord ou y_coord changent, mettre à jour la carte
    if (name === 'x_coord' || name === 'y_coord') {
      // Attendre un court instant pour que les deux valeurs soient mises à jour
      setTimeout(() => {
        if (formData.x_coord && formData.y_coord) {
          updateMapFromCoordinates(formData.x_coord, formData.y_coord);
        }
      }, 100);
    }
  };

  // Fonction pour mettre à jour la carte à partir des coordonnées x_coord, y_coord
  const updateMapFromCoordinates = (x?: number, y?: number) => {
    if (!mapRef.current) return;

    const xCoord = x || formData.x_coord;
    const yCoord = y || formData.y_coord;
    
    if (!xCoord || !yCoord) return;

    try {
      const coords = convertLambertToWGS84(xCoord, yCoord);
      
      // Centrer la carte sur la nouvelle position
      mapRef.current.setView([coords.lat, coords.lng], 15);
      
      // Supprimer l'ancien marqueur s'il existe
      if (coordinateMarkerRef.current && mapRef.current.hasLayer(coordinateMarkerRef.current)) {
        coordinateMarkerRef.current.remove();
        coordinateMarkerRef.current = null;
      }
      
      // Créer un marqueur personnalisé pour les coordonnées
      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              top: -10px;
              left: 50%;
              transform: translateX(-50%);
              background: #ef4444;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
            ">
              Coord.
            </div>
          </div>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });
      
      // Ajouter un nouveau marqueur
      const marker = L.marker([coords.lat, coords.lng], { 
        icon: markerIcon 
      }).bindTooltip(`Coordonnées: X=${xCoord}, Y=${yCoord}<br>Lat=${coords.lat.toFixed(6)}, Lng=${coords.lng.toFixed(6)}`, {
        permanent: false,
        direction: 'top'
      });
      
      marker.addTo(mapRef.current);
      coordinateMarkerRef.current = marker;
      
      // Mettre à jour le formulaire avec la géométrie du point
      setFormData(prev => ({
        ...prev,
        geom: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat]
        }
      }));
      
      console.log('Carte centrée sur:', coords.lat, coords.lng);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte:', error);
    }
  };

  // Fonction pour extraire les points d'un polygone
  const extractPolygonPoints = (layer: L.Layer) => {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs();
      if (Array.isArray(latlngs) && latlngs.length > 0) {
        const points: PolygonPoint[] = [];
        
        const mainRing = latlngs[0] as L.LatLng[];
        
        mainRing.forEach((point: L.LatLng, index: number) => {
          const lambertCoords = convertWGS84ToLambert(point.lng, point.lat);
          points.push({
            latitude: parseFloat(point.lat.toFixed(6)),
            longitude: parseFloat(point.lng.toFixed(6)),
            x_lambert: lambertCoords.x,
            y_lambert: lambertCoords.y,
            order: index + 1
          });
        });
        
        setPolygonPoints(points);
        setFormData(prev => ({
          ...prev,
          polygon_points: points,
          geometry_type: 'polygon'
        }));
      }
    }
  };

  const handleCheckboxChange = (name: keyof DescenteFormData, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = (prev[name] as string[]) || [];
      let newArray: string[];
      
      if (checked) {
        newArray = [...currentArray, value];
      } else {
        newArray = currentArray.filter(item => item !== value);
      }
      
      return {
        ...prev,
        [name]: newArray
      };
    });
  };

  // Recherche de fokontany
  const handleFokontanySearch = (value: string) => {
    setSearchTerm(value);
    
    if (value.trim() === '') {
      setFilteredFokontany(fokontanyData);
    } else {
      const searchLower = value.toLowerCase();
      const filtered = fokontanyData.filter(item => 
        item.fkt.toLowerCase().includes(searchLower) ||
        item.firaisana.toLowerCase().includes(searchLower) ||
        item.distrika.toLowerCase().includes(searchLower)
      );
      setFilteredFokontany(filtered);
    }
  };

  const handleFokontanySelect = (fokontany: FokontanyData) => {
    setFormData(prev => ({
      ...prev,
      fokontany: fokontany.fkt,
      commune: fokontany.firaisana,
      district: fokontany.distrika
    }));
    
    setSearchTerm(fokontany.fkt);
    setShowFokontanyDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier qu'un polygone a été tracé
    if (polygonPoints.length === 0) {
      alert('Veuillez tracer un polygone sur la carte avant de soumettre le formulaire.');
      return;
    }
    
    // Vérifier que le polygone a au moins 3 points
    if (polygonPoints.length < 3) {
      alert('Le polygone doit avoir au moins 3 points pour former une surface.');
      return;
    }
    
    // Convertir les coordonnées avant soumission
    let finalData = { ...formData };
    
    // Si des coordonnées WGS84 sont présentes dans geom, les convertir en Lambert
    if (formData.geom && formData.geom.coordinates) {
      if (formData.geom.type === 'Point') {
        const [lng, lat] = formData.geom.coordinates;
        const lambertCoords = convertWGS84ToLambert(lng, lat);
        finalData.x_coord = lambertCoords.x;
        finalData.y_coord = lambertCoords.y;
      }
    }
    
    // Ajouter les points du polygone
    finalData.polygon_points = polygonPoints;
    finalData.geometry_type = 'polygon';
    
    onSubmit(finalData);
  };

  // Gérer la localisation
  const handleLocate = () => {
    if (!mapRef.current) return;

    mapRef.current.locate({ 
      setView: true, 
      maxZoom: 17,
      enableHighAccuracy: true 
    });
  };

  // Fonction pour afficher le polygone sur la carte
  const displayPolygonOnMap = (points: PolygonPoint[]) => {
    if (!mapRef.current || points.length < 3) return;
    
    // Créer les coordonnées LatLng pour le polygone
    const latlngs = points.map(point => L.latLng(point.latitude, point.longitude));
    
    // Supprimer l'ancien polygone s'il existe
    if (polygonLayer && mapRef.current.hasLayer(polygonLayer)) {
      mapRef.current.removeLayer(polygonLayer);
    }
    
    // Créer un nouveau polygone
    const newPolygon = L.polygon(latlngs, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 3
    });
    
    // Ajouter le polygone à la carte
    newPolygon.addTo(mapRef.current);
    
    // Centrer la carte sur le polygone
    mapRef.current.fitBounds(newPolygon.getBounds());
    
    // Stocker la référence
    setPolygonLayer(newPolygon);
    
    // Calculer la superficie
    const area = calculateGeodesicArea(latlngs);
    
    // Calculer le centroïde
    let sumLat = 0, sumLng = 0;
    latlngs.forEach(ll => {
      sumLat += ll.lat;
      sumLng += ll.lng;
    });
    const count = latlngs.length;
    const centroidLat = sumLat / count;
    const centroidLng = sumLng / count;
    const lambertCoords = convertWGS84ToLambert(centroidLng, centroidLat);
    
    // Mettre à jour les données du formulaire
    setFormData(prev => ({
      ...prev,
      x_coord: lambertCoords.x,
      y_coord: lambertCoords.y,
      superficie: Math.round(area),
      geom: newPolygon.toGeoJSON().geometry,
      geometry_type: 'polygon'
    }));
  };

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialiser la carte
    mapRef.current = L.map(mapContainerRef.current).setView([-18.8792, 47.5079], 15);

    // Ajouter les couches de base
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });

    const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: 'Imagery © <a href="https://maps.google.com">Google Maps</a>',
      maxZoom: 19
    });

    satellite.addTo(mapRef.current);

    // Ajouter le contrôle des couches
    L.control.layers({
      "Vue standard 🗺️": osm,
      "Vue satellite 🌍": satellite
    }).addTo(mapRef.current);

    // Initialiser le groupe de dessin pour les polygones
    drawnItemsRef.current = new L.FeatureGroup();
    mapRef.current.addLayer(drawnItemsRef.current);

    // Initialiser le groupe pour la localisation (séparé)
    locationLayerRef.current = new L.LayerGroup();
    mapRef.current.addLayer(locationLayerRef.current);

    // CONFIGURATION SIMPLIFIÉE POUR POLYGONES - SANS LIMITATION DE POINTS
    // @ts-ignore
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          // Configuration minimale pour permettre un nombre illimité de points
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 3
          },
          // PAS de maximumPoints, showArea, etc. qui pourraient limiter le dessin
        },
        // DÉSACTIVER TOUS LES AUTRES OUTILS SAUF POLYGONE
        polyline: false,
        marker: false, // Désactivé pour forcer les polygones seulement
        circle: false,
        rectangle: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true
      }
    });
    
    // @ts-ignore
    mapRef.current.addControl(drawControl);

    // Gérer les événements de dessin
    // @ts-ignore
    mapRef.current.on(L.Draw.Event.CREATED, (e: any) => {
      const type = e.layerType;
      // @ts-ignore
      const layer = e.layer;
      
      // Vérifier que c'est bien un polygone
      if (type === 'polygon') {
        // Supprimer seulement les polygones précédents
        drawnItemsRef.current.clearLayers();
        
        drawnItemsRef.current.addLayer(layer);
        
        const geojson = layer.toGeoJSON();
        const latlngs: L.LatLng[] = layer.getLatLngs()[0] as L.LatLng[];
        
        // Calculer le centroïde et la superficie
        let sumLat = 0, sumLng = 0;
        latlngs.forEach((ll: L.LatLng) => {
          sumLat += ll.lat;
          sumLng += ll.lng;
        });
        const count = latlngs.length;
        const centroidLat = sumLat / count;
        const centroidLng = sumLng / count;
        const area = calculateGeodesicArea(latlngs);
        const lambertCoords = convertWGS84ToLambert(centroidLng, centroidLat);
        
        // Extraire les points du polygone
        extractPolygonPoints(layer);
        
        // Mettre à jour les données du formulaire
        setFormData(prev => ({
          ...prev,
          geom: geojson.geometry,
          x_coord: lambertCoords.x,
          y_coord: lambertCoords.y,
          superficie: Math.round(area),
          geometry_type: 'polygon'
        }));
        
        // Afficher le polygone de manière permanente
        displayPolygonOnMap(polygonPoints);
      }
    });

    // Gérer l'événement locationfound
    mapRef.current.on('locationfound', (e: L.LocationEvent) => {
      // Enregistrer la position de l'utilisateur
      setUserLocation(e.latlng);
      
      // Centrer la carte sur la position
      mapRef.current?.setView(e.latlng, 17);
      
      // Effacer l'ancien marqueur de position
      locationLayerRef.current.clearLayers();
      
      // Créer un marqueur de position personnalisé (léger)
      const locationIcon = L.divIcon({
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            position: relative;
          ">
          </div>
        `,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      const locationMarker = L.marker(e.latlng, { icon: locationIcon })
        .bindTooltip("📍 Votre position actuelle");
      
      locationLayerRef.current.addLayer(locationMarker);
      
      // Mettre à jour les coordonnées dans le formulaire
      const lambertCoords = convertWGS84ToLambert(e.latlng.lng, e.latlng.lat);
      
      setFormData(prev => ({
        ...prev,
        x_coord: lambertCoords.x,
        y_coord: lambertCoords.y,
        geometry_type: 'polygon'
      }));
    });

    // Gérer les erreurs de géolocalisation
    mapRef.current.on('locationerror', (e: any) => {
      console.error('Erreur de géolocalisation:', e.message);
      alert('Impossible de déterminer votre position. Vérifiez que la géolocalisation est activée.');
    });

    // Si données initiales avec coordonnées Lambert, convertir pour la carte
    if (initialData?.x_coord && initialData?.y_coord) {
      const coords = convertLambertToWGS84(initialData.x_coord, initialData.y_coord);
      mapRef.current.setView([coords.lat, coords.lng], 15);
      
      // Ajouter un marqueur pour les coordonnées initiales
      updateMapFromCoordinates(initialData.x_coord, initialData.y_coord);
    } 
    // Si données initiales avec polygon_points, les afficher
    else if (initialData?.polygon_points && initialData.polygon_points.length > 0) {
      // Afficher le polygone à partir des points
      displayPolygonOnMap(initialData.polygon_points);
    }
    else if (initialData?.geom) {
      const geoLayer = L.geoJSON(initialData.geom);
      const layers = geoLayer.getLayers();
      if (layers.length > 0) {
        const initialLayer = layers[0];
        drawnItemsRef.current.addLayer(initialLayer);
        if (mapRef.current) {
          try {
            mapRef.current.fitBounds(initialLayer.getBounds());
          } catch (err) {
            if (initialLayer instanceof L.Marker) {
              mapRef.current.setView(initialLayer.getLatLng(), 15);
            } else if (initialLayer instanceof L.Circle) {
              mapRef.current.setView(initialLayer.getLatLng(), 15);
            }
          }
        }
        // Extraire les points si c'est un polygone
        if (initialLayer instanceof L.Polygon) {
          extractPolygonPoints(initialLayer);
          const latlngs: L.LatLng[] = initialLayer.getLatLngs()[0] as L.LatLng[];
          const area = calculateGeodesicArea(latlngs);
          let sumLat = 0, sumLng = 0;
          latlngs.forEach((ll: L.LatLng) => {
            sumLat += ll.lat;
            sumLng += ll.lng;
          });
          const count = latlngs.length;
          const centroidLat = sumLat / count;
          const centroidLng = sumLng / count;
          const lambertCoords = convertWGS84ToLambert(centroidLng, centroidLat);
          setFormData(prev => ({
            ...prev,
            x_coord: lambertCoords.x,
            y_coord: lambertCoords.y,
            superficie: Math.round(area),
            geometry_type: 'polygon'
          }));
          
          // Stocker la référence du polygone
          setPolygonLayer(initialLayer as L.Polygon);
        }
      }
    }

    // Événement pour l'édition des polygones
    mapRef.current.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Polygon) {
          extractPolygonPoints(layer);
          const latlngs: L.LatLng[] = layer.getLatLngs()[0] as L.LatLng[];
          const area = calculateGeodesicArea(latlngs);
          setFormData(prev => ({
            ...prev,
            superficie: Math.round(area)
          }));
          
          // Mettre à jour le polygone permanent
          setPolygonLayer(layer as L.Polygon);
        }
      });
    });

    // Événement pour la suppression des polygones
    mapRef.current.on(L.Draw.Event.DELETED, (e: any) => {
      const layers = e.layers;
      let polygonDeleted = false;
      
      layers.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Polygon) {
          polygonDeleted = true;
        }
      });
      
      if (polygonDeleted) {
        setPolygonPoints([]);
        setFormData(prev => ({
          ...prev,
          polygon_points: [],
          superficie: undefined,
          geom: undefined
        }));
        
        // Supprimer le polygone permanent
        if (polygonLayer && mapRef.current && mapRef.current.hasLayer(polygonLayer)) {
          mapRef.current.removeLayer(polygonLayer);
          setPolygonLayer(null);
        }
      }
    });

    // Nettoyer à la destruction
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialData]);

  // Mettre à jour la carte quand x_coord ou y_coord changent via useEffect séparé
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.x_coord && formData.y_coord && mapRef.current) {
        updateMapFromCoordinates();
      }
    }, 500); // Délai de 500ms pour éviter des mises à jour trop fréquentes

    return () => clearTimeout(timer);
  }, [formData.x_coord, formData.y_coord]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {initialData ? 'Modifier la Descente' : 'Nouvelle Descente'}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          title="Fermer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 🗓️ Date & Références */}
        <div className="form-section bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h5 className="text-lg font-semibold text-blue-600 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date & Références
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date Descente *
              </label>
              <input
                type="date"
                name="date_descente"
                value={formData.date_descente || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heure Descente
              </label>
              <input
                type="time"
                name="heure_descente"
                value={formData.heure_descente || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type verbalisateur
              </label>
              <select
                name="type_verbalisateur"
                value={formData.type_verbalisateur || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choisir --</option>
                <option value="pat">PAT</option>
                <option value="fifafi">FIFAFI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom verbalisateur
              </label>
              <input
                type="text"
                name="nom_verbalisateur"
                value={formData.nom_verbalisateur || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom verbalisateur"
              />
            </div>

            {(!formData.type_verbalisateur || formData.type_verbalisateur === 'pat') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Numéro PV PAT
                </label>
                <input
                  type="text"
                  name="n_pv_pat"
                  value={formData.n_pv_pat || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro PV PAT"
                />
              </div>
            )}

            {(!formData.type_verbalisateur || formData.type_verbalisateur === 'fifafi') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Numéro PV FIFAFI
                </label>
                <input
                  type="text"
                  name="n_fifafi"
                  value={formData.n_fifafi || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro PV FIFAFI"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Modèle PV
              </label>
              <input
                type="text"
                name="modele_pv"
                value={formData.modele_pv || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Modèle PV"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Référence
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Référence"
              />
            </div>
          </div>
        </div>

        {/* 👥 Actions & Infractions */}
        <div className="form-section bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h5 className="text-lg font-semibold text-blue-600 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Actions & Infractions
          </h5>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Actions
            </label>
            <div className="flex flex-wrap gap-3">
              {actionOptions.map((act) => (
                <div key={act} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`actions-${act}`}
                    checked={formData.actions?.includes(act) || false}
                    onChange={(e) => handleCheckboxChange('actions', act, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`actions-${act}`} className="ml-2 text-sm text-slate-700">
                    {act}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Infraction / Constats
            </label>
            <div className="flex flex-wrap gap-3">
              {constatOptions.map((c) => (
                <div key={c} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`infraction-${c}`}
                    checked={formData.infraction?.includes(c) || false}
                    onChange={(e) => handleCheckboxChange('infraction', c, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`infraction-${c}`} className="ml-2 text-sm text-slate-700">
                    {c}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🧍 Personne & Localisation */}
        <div className="form-section bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h5 className="text-lg font-semibold text-blue-600 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Personne & Localisation
          </h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Personne verbalisée
              </label>
              <select
                name="personne_r"
                value={formData.personne_r || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choisir --</option>
                <option value="Propriétaire">Propriétaire</option>
                <option value="Représentant">Représentant</option>
              </select>
            </div>
          </div>

          {(formData.personne_r === 'Propriétaire' || formData.personne_r === 'Représentant') && (
            <div className="mb-6">
              <h6 className="text-md font-semibold text-slate-800 mb-4">Détails du {formData.personne_r}</h6>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="nom_personne_r"
                    value={formData.nom_personne_r || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="adresse_r"
                    value={formData.adresse_r || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact
                  </label>
                  <input
                    type="text"
                    name="contact_r"
                    value={formData.contact_r || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contact"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recherche de fokontany améliorée */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-1 md:col-span-3" ref={fokontanyRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rechercher un Fokontany *
              </label>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm || formData.fokontany || ''}
                    onChange={(e) => {
                      handleFokontanySearch(e.target.value);
                      setSearchTerm(e.target.value);
                      if (e.target.value === '') {
                        setFormData(prev => ({
                          ...prev,
                          fokontany: '',
                          commune: '',
                          district: ''
                        }));
                      }
                    }}
                    onFocus={() => setShowFokontanyDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Commencez à taper pour rechercher un fokontany..."
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    ) : (
                      <Search className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
                
                {showFokontanyDropdown && filteredFokontany.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-slate-200">
                      <div className="flex items-center px-2 py-1 bg-slate-50 rounded">
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => handleFokontanySearch(e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-sm"
                          placeholder="Rechercher par nom, commune ou district..."
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {filteredFokontany.map((item) => (
                        <button
                          key={item.id_fkt}
                          type="button"
                          onClick={() => handleFokontanySelect(item)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium">{item.fkt}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Commune: {item.firaisana} • District: {item.distrika}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Le district et la commune seront automatiquement remplis après sélection
              </p>
            </div>

            {/* District (auto-rempli) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                District
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.district || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg text-slate-700"
                  placeholder="Sélectionnez d'abord un fokontany"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckSquare className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-rempli</p>
            </div>

            {/* Commune (auto-remplie) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Commune
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.commune || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg text-slate-700"
                  placeholder="Sélectionnez d'abord un fokontany"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckSquare className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-remplie</p>
            </div>

            {/* Fokontany final */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fokontany sélectionné
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.fokontany || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg text-slate-700 font-medium"
                  placeholder="Aucun fokontany sélectionné"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {formData.fokontany ? (
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-slate-400">▼</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées Lambert Madagascar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée X (Lambert) *
              </label>
              <input
                type="number"
                step="any"
                name="x_coord"
                value={formData.x_coord || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 521688"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Coordonnée Lambert Madagascar (mètres)</p>
              <p className="text-xs text-blue-600 mt-1">La carte se mettra à jour automatiquement</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée Y (Lambert) *
              </label>
              <input
                type="number"
                step="any"
                name="y_coord"
                value={formData.y_coord || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 798900"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Coordonnée Lambert Madagascar (mètres)</p>
              <p className="text-xs text-blue-600 mt-1">La carte se mettra à jour automatiquement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Superficie (m²)
              </label>
              <input
                type="number"
                step="any"
                name="superficie"
                value={formData.superficie || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Superficie"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description localisation
            </label>
            <textarea
              name="localisation"
              value={formData.localisation || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description de la localisation"
              rows={3}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📍 Carte interactive - Tracez un polygone
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={handleLocate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-sm"
              >
                <MapIcon className="w-4 h-4" />
                Voir ma position
              </button>
              <button
                type="button"
                onClick={() => updateMapFromCoordinates()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 shadow-sm"
              >
                📍 Centrer sur coordonnées
              </button>
            </div>
            
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-blue-500 mt-0.5">💡</div>
                <div>
                  <p className="text-sm text-blue-700 font-medium mb-1">Comment utiliser la carte :</p>
                  <ol className="text-xs text-blue-600 list-decimal pl-5 space-y-1">
                    <li>Entrez les coordonnées X et Y (Lambert) ci-dessus pour centrer automatiquement la carte</li>
                    <li>Cliquez sur l'outil <span className="font-semibold">polygone</span> (icône en forme de triangle) dans la barre d'outils</li>
                    <li>Cliquez sur la carte pour placer chaque sommet de votre polygone</li>
                    <li>Vous pouvez ajouter autant de points que nécessaire</li>
                    <li>Pour fermer le polygone : double-cliquez ou cliquez sur le premier point</li>
                    <li>La superficie et les coordonnées seront automatiquement calculées</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div 
              ref={mapContainerRef} 
              id="map" 
              className="h-[400px] border border-slate-300 rounded-lg"
            />
            
            <div className="mt-3 space-y-2">
              {polygonPoints.length > 0 ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">✅ Polygone tracé avec succès</span>
                  </div>
                  <div className="text-sm text-green-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Sommets :</span> {polygonPoints.length} points
                    </div>
                    <div>
                      <span className="font-medium">Superficie :</span> {formData.superficie?.toLocaleString()} m²
                    </div>
                    <div>
                      <span className="font-medium">Centre X :</span> {formData.x_coord}
                    </div>
                    <div>
                      <span className="font-medium">Centre Y :</span> {formData.y_coord}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-green-500">
                    <span className="font-medium">Points du polygone :</span> {polygonPoints.map(p => `(${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)})`).join(' → ')}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-700 font-medium">⚠️ Aucun polygone tracé</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    Veuillez utiliser l'outil polygone pour tracer votre zone sur la carte.
                  </p>
                </div>
              )}
              
              {userLocation && (
                <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg inline-block">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-600">
                      📍 Position détectée : {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}

              {formData.x_coord && formData.y_coord && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-lg inline-block">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-600">
                      📍 Coordonnées saisies : X={formData.x_coord}, Y={formData.y_coord}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📅 RDV & Pièces */}
        <div className="form-section bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h5 className="text-lg font-semibold text-blue-600 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            RDV & Pièces à fournir
          </h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date Rendez-vous
              </label>
              <input
                type="date"
                name="date_rendez_vous"
                value={formData.date_rendez_vous || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heure Rendez-vous
              </label>
              <input
                type="time"
                name="heure_rendez_vous"
                value={formData.heure_rendez_vous || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Dossier / Pièces à fournir
            </label>
            <div className="flex flex-wrap gap-3">
              {piecesOption.map((piece) => (
                <div key={piece} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`dossier-${piece}`}
                    checked={formData.dossier_a_fournir?.includes(piece) || false}
                    onChange={(e) => handleCheckboxChange('dossier_a_fournir', piece, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`dossier-${piece}`} className="ml-2 text-sm text-slate-700">
                    {piece}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={polygonPoints.length === 0}
            className={`px-6 py-2 text-white rounded-lg transition-all font-medium flex items-center gap-2 ${
              polygonPoints.length === 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            {polygonPoints.length === 0 ? 'Tracez un polygone d\'abord' : (initialData ? 'Mettre à jour' : '✅ Enregistrer la descente')}
          </button>
        </div>
      </form>
    </div>
  );
}