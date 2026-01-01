import { X, Plus, Calendar, Clock, MapPin, Users, FileText, CheckSquare, Map as MapIcon, Search, Navigation } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
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
interface ReverseGeocodeResult {
  display_name?: string;
  address?: {
    road?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
  };
}
// Définition des systèmes de coordonnées alignée avec le PHP (utilisation de omerc pour EPSG:8441)
const lambertMadagascar = '+proj=omerc +lat_0=-18.9 +lonc=46.43722916666667 +alpha=18.9 +k=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
// Configuration proj4 pour EPSG:8441 comme dans le PHP
proj4.defs("EPSG:8441", lambertMadagascar);
// Conversion Lambert (x, y) → WGS84 (lng, lat)
const convertLambertToWGS84 = (x: number, y: number): { lat: number, lng: number } => {
  try {
    const result = proj4(lambertMadagascar, wgs84, [x, y]);
    return {
      lng: result[0], // longitude
      lat: result[1] // latitude
    };
  } catch (error) {
    console.error('Erreur de conversion de coordonnées:', error);
    return {
      lat: -18.8792,
      lng: 47.5079
    };
  }
};
// Conversion WGS84 (lng, lat) → Lambert (x, y)
const convertWGS84ToLambert = (lng: number, lat: number): { x: number, y: number } => {
  try {
    const result = proj4(wgs84, lambertMadagascar, [lng, lat]);
    return {
      x: Math.round(result[0]), // x Lambert
      y: Math.round(result[1]) // y Lambert
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
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [polygonLayer, setPolygonLayer] = useState<L.Polygon | null>(null);
  const [coordMarker, setCoordMarker] = useState<L.Marker | null>(null);
  const [searchingByCoords, setSearchingByCoords] = useState(false);
  const [lastSearchedCoords, setLastSearchedCoords] = useState<{x: number | undefined, y: number | undefined}>({
    x: initialData?.x_coord,
    y: initialData?.y_coord
  });
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const locationLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const fokontanyRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markerLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
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
            setSearchTerm(fokontanyInfo.fkt);
          }
        }
      
        if (initialData?.polygon_points) {
          setPolygonPoints(initialData.polygon_points);
        }
      
        // Rechercher le fokontany si des coordonnées initiales existent
        if (initialData?.x_coord && initialData?.y_coord) {
          searchFokontanyByCoordinates(initialData.x_coord, initialData.y_coord);
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
  // Fonction de géocodage inverse avec OSM
  const reverseGeocodeWithOSM = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      setReverseGeocoding(true);
    
      // Utiliser le service Nominatim d'OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr',
            'User-Agent': 'YourAppName/1.0'
          }
        }
      );
    
      if (!response.ok) {
        throw new Error('Erreur de géocodage inverse');
      }
    
      const data: ReverseGeocodeResult = await response.json();
    
      let locationDescription = '';
    
      if (data.display_name) {
        locationDescription = data.display_name;
      } else if (data.address) {
        const address = data.address;
        const parts = [
          address.road,
          address.quarter,
          address.suburb,
          address.village,
          address.town,
          address.city,
          address.municipality,
          address.state
        ].filter(Boolean);
      
        locationDescription = parts.join(', ');
      }
    
      return locationDescription || 'Adresse non spécifiée';
    } catch (error) {
      console.error('Erreur de géocodage inverse:', error);
      return '';
    } finally {
      setReverseGeocoding(false);
    }
  }, []);
  // Fonction pour rechercher le fokontany par coordonnées
  const searchFokontanyByCoordinates = useCallback(async (x: number, y: number) => {
    // Éviter les recherches inutiles si les coordonnées n'ont pas changé
    if (lastSearchedCoords.x === x && lastSearchedCoords.y === y) {
      return;
    }
  
    // Vérifier que les coordonnées sont valides
    if (!x || !y || x <= 0 || y <= 0) {
      return;
    }
  
    try {
      setSearchingByCoords(true);
      setLastSearchedCoords({ x, y });
    
      // DEBUG: Log des coordonnées envoyées
      console.log('Recherche fokontany avec coordonnées:', { x, y });
    
      // Appel à l'API avec les coordonnées
      const response = await fetch(
        `http://localhost:3000/api/fokontany?x=${x}&y=${y}`
      );
    
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche par coordonnées');
      }
    
      const result = await response.json();
    
      // DEBUG: Log du résultat
      console.log('Résultat de recherche:', result);
    
      if (result.success && result.data) {
        // Mettre à jour les champs du formulaire
        setFormData(prev => ({
          ...prev,
          fokontany: result.data.fokontany,
          commune: result.data.commune,
          district: result.data.district
        }));
      
        // Mettre à jour le champ de recherche
        setSearchTerm(result.data.fokontany);
      
        // Convertir les coordonnées INPUT pour afficher sur la carte
        const coords = convertLambertToWGS84(x, y);
      
        // Centrer la carte sur les coordonnées INPUT
        if (mapRef.current) {
          mapRef.current.setView([coords.lat, coords.lng], 16);
        }
      
        // Ajouter/Mettre à jour le marqueur pour les coordonnées INPUT
        updateCoordMarker(coords.lat, coords.lng, 'Point de référence');
      
        // Géocodage inverse pour obtenir l'adresse basée sur INPUT
        const locationDescription = await reverseGeocodeWithOSM(coords.lat, coords.lng);
      
        // Mettre à jour la description de localisation
        if (locationDescription) {
          setFormData(prev => ({
            ...prev,
            localisation: locationDescription
          }));
        }
      
        // Gérer le centre du fokontany si disponible (ajouter un marqueur, mais ne pas centrer)
        if (result.data.centre_lambert) {
          try {
            // Extraire les coordonnées du champ centre_lambert
            const match = result.data.centre_lambert.match(/POINT\(([^ ]+) ([^)]+)\)/);
            if (match && match.length === 3) {
              const centreX = parseFloat(match[1]);
              const centreY = parseFloat(match[2]);
            
              // DEBUG: Log des coordonnées du centre
              console.log('Coordonnées centre extraites:', { centreX, centreY });
            
              // Convertir en WGS84
              const centreCoords = convertLambertToWGS84(centreX, centreY);
            
              // DEBUG: Log des coordonnées converties
              console.log('Coordonnées centre converties WGS84:', centreCoords);
            
              // Ajouter un marqueur pour le centre du fokontany (sans centrer la carte)
              if (mapRef.current) {
                const centerIcon = L.divIcon({
                  html: `
                    <div style="
                      width: 20px;
                      height: 20px;
                      background: #3b82f6;
                      border: 3px solid white;
                      border-radius: 50%;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  className: '',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });
              
                L.marker([centreCoords.lat, centreCoords.lng], { icon: centerIcon })
                  .addTo(mapRef.current)
                  .bindPopup(`Centre du Fokontany: ${result.data.fokontany}`);
              }
            }
          } catch (error) {
            console.error('Erreur lors du traitement des coordonnées du centre:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche par coordonnées:', error);
      // Réinitialiser les champs si la recherche échoue
      if (error.message.includes('Erreur') || error.message.includes('Failed')) {
        setFormData(prev => ({
          ...prev,
          fokontany: '',
          commune: '',
          district: ''
        }));
        setSearchTerm('');
      }
    } finally {
      setSearchingByCoords(false);
    }
  }, [lastSearchedCoords, reverseGeocodeWithOSM]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericValue = name === 'x_coord' || name === 'y_coord' || name === 'superficie' ?
      (value === '' ? undefined : Number(value)) : value;
    const newFormData = {
      ...formData,
      [name]: numericValue
    };
  
    setFormData(newFormData);
    // Si x_coord ou y_coord changent, mettre à jour la carte ET rechercher le fokontany
    if (name === 'x_coord' || name === 'y_coord') {
      // Annuler le timeout précédent s'il existe
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    
      // Mettre à jour la carte immédiatement
      if (newFormData.x_coord && newFormData.y_coord) {
        updateMapFromCoordinates();
      
        // Rechercher automatiquement le fokontany (avec un délai pour éviter trop de requêtes)
        searchTimeoutRef.current = setTimeout(() => {
          if (newFormData.x_coord && newFormData.y_coord) {
            searchFokontanyByCoordinates(newFormData.x_coord, newFormData.y_coord);
          }
        }, 800); // Délai de 800ms pour éviter les requêtes à chaque frappe
      }
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
  // Fonction pour ajouter/retirer le marqueur de coordonnées
  const updateCoordMarker = (lat: number, lng: number, title: string = 'Point des coordonnées') => {
    if (!mapRef.current) return;
    // Supprimer l'ancien marqueur s'il existe
    markerLayerRef.current.clearLayers();
  
    // Créer une icône personnalisée pour le point
    const pointIcon = L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #10b981;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      className: 'coord-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  
    // Créer le marqueur
    const marker = L.marker([lat, lng], {
      icon: pointIcon,
      draggable: true,
      autoPan: true
    }).bindTooltip(`
      <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div>Lat: ${lat.toFixed(6)}</div>
      <div>Lng: ${lng.toFixed(6)}</div>
      <div style="font-size: 11px; color: #666; margin-top: 4px;">Glissez pour ajuster</div>
    `);
  
    // Ajouter au layer de marqueurs
    marker.addTo(markerLayerRef.current);
  
    // Gérer le drag du marqueur
    marker.on('dragend', async (e: L.LeafletEvent) => {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
    
      // Mettre à jour les coordonnées Lambert
      const lambertCoords = convertWGS84ToLambert(position.lng, position.lat);
    
      // Mettre à jour le formulaire
      setFormData(prev => ({
        ...prev,
        x_coord: lambertCoords.x,
        y_coord: lambertCoords.y
      }));
    
      // Rechercher le fokontany pour les nouvelles coordonnées
      if (lambertCoords.x && lambertCoords.y) {
        await searchFokontanyByCoordinates(lambertCoords.x, lambertCoords.y);
      }
    
      // Géocodage inverse pour l'adresse
      const locationDescription = await reverseGeocodeWithOSM(position.lat, position.lng);
      if (locationDescription) {
        setFormData(prev => ({
          ...prev,
          localisation: locationDescription
        }));
      }
    });
  
    setCoordMarker(marker);
  };
  // Mettre à jour la carte à partir des coordonnées x_coord, y_coord
  const updateMapFromCoordinates = () => {
    if (!mapRef.current || !formData.x_coord || !formData.y_coord) return;
    try {
      const coords = convertLambertToWGS84(formData.x_coord, formData.y_coord);
    
      // Centrer la carte sur la nouvelle position
      mapRef.current.setView([coords.lat, coords.lng], 16);
    
      // Ajouter/mettre à jour le marqueur de coordonnées
      updateCoordMarker(coords.lat, coords.lng, 'Point de référence des coordonnées');
    
      // Mettre à jour le formulaire
      setFormData(prev => ({
        ...prev,
        geom: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat]
        },
        geometry_type: 'polygon'
      }));
    
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte:', error);
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
  
    // Réinitialiser les coordonnées si on sélectionne manuellement un fokontany
    setFormData(prev => ({
      ...prev,
      x_coord: undefined,
      y_coord: undefined
    }));
  
    // Supprimer le marqueur de coordonnées
    markerLayerRef.current.clearLayers();
    setCoordMarker(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
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
  
    // Vérifier que les coordonnées sont présentes
    if (!formData.x_coord || !formData.y_coord) {
      alert('Veuillez entrer des coordonnées valides.');
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
  
    // Si pas de localisation, essayer de géocoder
    if (!finalData.localisation && finalData.x_coord && finalData.y_coord) {
      try {
        const coords = convertLambertToWGS84(finalData.x_coord, finalData.y_coord);
        const locationDescription = await reverseGeocodeWithOSM(coords.lat, coords.lng);
        if (locationDescription) {
          finalData.localisation = locationDescription;
        }
      } catch (error) {
        console.error('Erreur lors du géocodage final:', error);
      }
    }
  
    onSubmit(finalData);
  };
  // Gérer la localisation
  const handleLocate = () => {
    if (!mapRef.current) return;
    mapRef.current.locate({
      setView: true,
      maxZoom: 17,
      enableHighAccuracy: true,
      timeout: 10000
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
  
    // Ajouter le marqueur au centre du polygone
    updateCoordMarker(centroidLat, centroidLng, 'Centre du polygone');
  
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
      maxZoom: 22
    });
    const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: 'Imagery © <a href="https://maps.google.com">Google Maps</a>',
      maxZoom: 22
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
    // Initialiser le groupe pour les marqueurs de coordonnées
    markerLayerRef.current = new L.LayerGroup();
    mapRef.current.addLayer(markerLayerRef.current);
    // Configuration pour le dessin de polygones
    // @ts-ignore
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 3
          },
        },
        polyline: false,
        marker: false,
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
    mapRef.current.on(L.Draw.Event.CREATED, async (e: any) => {
      const type = e.layerType;
      // @ts-ignore
      const layer = e.layer;
    
      if (type === 'polygon') {
        drawnItemsRef.current.clearLayers();
        drawnItemsRef.current.addLayer(layer);
      
        const geojson = layer.toGeoJSON();
        const latlngs: L.LatLng[] = layer.getLatLngs()[0] as L.LatLng[];
      
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
      
        extractPolygonPoints(layer);
      
        // Géocodage inverse pour l'adresse
        const locationDescription = await reverseGeocodeWithOSM(centroidLat, centroidLng);
      
        setFormData(prev => ({
          ...prev,
          geom: geojson.geometry,
          x_coord: lambertCoords.x,
          y_coord: lambertCoords.y,
          superficie: Math.round(area),
          geometry_type: 'polygon',
          localisation: locationDescription || prev.localisation
        }));
      
        // Rechercher le fokontany pour ces coordonnées
        if (lambertCoords.x && lambertCoords.y) {
          await searchFokontanyByCoordinates(lambertCoords.x, lambertCoords.y);
        }
      
        displayPolygonOnMap(polygonPoints);
      }
    });
    // Gérer l'événement locationfound
    mapRef.current.on('locationfound', async (e: L.LocationEvent) => {
      const { lat, lng } = e.latlng;
      setUserLocation(e.latlng);
      mapRef.current?.setView([lat, lng], 17);
      locationLayerRef.current.clearLayers();
    
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
    
      const locationMarker = L.marker([lat, lng], { icon: locationIcon })
        .bindTooltip("📍 Votre position actuelle");
    
      locationLayerRef.current.addLayer(locationMarker);
    
      const lambertCoords = convertWGS84ToLambert(lng, lat);
    
      // Géocodage inverse pour l'adresse
      const locationDescription = await reverseGeocodeWithOSM(lat, lng);
    
      setFormData(prev => ({
        ...prev,
        x_coord: lambertCoords.x,
        y_coord: lambertCoords.y,
        localisation: locationDescription || prev.localisation,
        geometry_type: 'polygon'
      }));
    
      // Ajouter le marqueur de coordonnées
      updateCoordMarker(lat, lng, 'Votre position');
    
      // Rechercher le fokontany pour cette position
      if (lambertCoords.x && lambertCoords.y) {
        await searchFokontanyByCoordinates(lambertCoords.x, lambertCoords.y);
      }
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
      updateCoordMarker(coords.lat, coords.lng, 'Point initial');
    }
    else if (initialData?.polygon_points && initialData.polygon_points.length > 0) {
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
          setPolygonLayer(initialLayer as L.Polygon);
          updateCoordMarker(centroidLat, centroidLng, 'Centre du polygone');
        }
      }
    }
    // Événement pour l'édition des polygones
    mapRef.current.on(L.Draw.Event.EDITED, async (e: any) => {
      const layers = e.layers;
      layers.eachLayer(async (layer: L.Layer) => {
        if (layer instanceof L.Polygon) {
          extractPolygonPoints(layer);
          const latlngs: L.LatLng[] = layer.getLatLngs()[0] as L.LatLng[];
          const area = calculateGeodesicArea(latlngs);
        
          // Mettre à jour les coordonnées du centre
          let sumLat = 0, sumLng = 0;
          latlngs.forEach((ll: L.LatLng) => {
            sumLat += ll.lat;
            sumLng += ll.lng;
          });
          const count = latlngs.length;
          const centroidLat = sumLat / count;
          const centroidLng = sumLng / count;
        
          const lambertCoords = convertWGS84ToLambert(centroidLng, centroidLat);
        
          // Géocodage inverse pour l'adresse
          const locationDescription = await reverseGeocodeWithOSM(centroidLat, centroidLng);
        
          setFormData(prev => ({
            ...prev,
            superficie: Math.round(area),
            x_coord: lambertCoords.x,
            y_coord: lambertCoords.y,
            localisation: locationDescription || prev.localisation
          }));
        
          // Mettre à jour le marqueur
          updateCoordMarker(centroidLat, centroidLng, 'Centre du polygone');
        
          // Rechercher le fokontany pour les nouvelles coordonnées
          if (lambertCoords.x && lambertCoords.y) {
            await searchFokontanyByCoordinates(lambertCoords.x, lambertCoords.y);
          }
        
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
          geom: undefined,
          x_coord: undefined,
          y_coord: undefined
        }));
      
        if (polygonLayer && mapRef.current && mapRef.current.hasLayer(polygonLayer)) {
          mapRef.current.removeLayer(polygonLayer);
          setPolygonLayer(null);
        }
      
        // Supprimer le marqueur de coordonnées
        markerLayerRef.current.clearLayers();
        setCoordMarker(null);
      }
    });
    // Nettoyer à la destruction
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [initialData]);
  // Mettre à jour la carte quand x_coord ou y_coord changent
  useEffect(() => {
    if (formData.x_coord && formData.y_coord && mapRef.current) {
      updateMapFromCoordinates();
    }
  }, [formData.x_coord, formData.y_coord]);
  // Fonction pour géocoder manuellement
  const handleGeocodeLocation = async () => {
    if (!formData.x_coord || !formData.y_coord) {
      alert('Veuillez d\'abord entrer des coordonnées');
      return;
    }
    try {
      const coords = convertLambertToWGS84(formData.x_coord, formData.y_coord);
      const locationDescription = await reverseGeocodeWithOSM(coords.lat, coords.lng);
    
      if (locationDescription) {
        setFormData(prev => ({
          ...prev,
          localisation: locationDescription
        }));
      } else {
        alert('Impossible de trouver l\'adresse pour ces coordonnées');
      }
    } catch (error) {
      console.error('Erreur lors du géocodage:', error);
      alert('Erreur lors de la recherche de l\'adresse');
    }
  };
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
                Référence O.M
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
                Rechercher un Fokontany
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
                          district: '',
                          x_coord: undefined,
                          y_coord: undefined
                        }));
                        markerLayerRef.current.clearLayers();
                      }
                    }}
                    onFocus={() => setShowFokontanyDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Commencez à taper pour rechercher un fokontany..."
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
 
            </div>
          </div>
          {/* Coordonnées Lambert Madagascar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée X (Lambert)
                {searchingByCoords && (
                  <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                    Recherche...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  name="x_coord"
                  value={formData.x_coord || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Ex: 517431"
                />
                {searchingByCoords && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée Y (Lambert)
                {searchingByCoords && (
                  <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                    Recherche...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  name="y_coord"
                  value={formData.y_coord || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Ex: 797309"
                />
                {searchingByCoords && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* District, Commune, Fokontany (auto-détectés) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                District
                {formData.district && formData.x_coord && formData.y_coord && (
                  <span className="ml-2 inline-flex items-center text-xs text-green-600">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Auto-détecté
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.district || ''}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formData.district && formData.x_coord && formData.y_coord
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                  placeholder="Sélectionnez un fokontany ou entrez des coordonnées"
                />
                {formData.district && formData.x_coord && formData.y_coord && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formData.district && formData.x_coord && formData.y_coord
                  ? ''
                  : 'Auto-rempli'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Commune
                {formData.commune && formData.x_coord && formData.y_coord && (
                  <span className="ml-2 inline-flex items-center text-xs text-green-600">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Auto-détectée
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.commune || ''}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formData.commune && formData.x_coord && formData.y_coord
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                  placeholder="Sélectionnez un fokontany ou entrez des coordonnées"
                />
                {formData.commune && formData.x_coord && formData.y_coord && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formData.commune && formData.x_coord && formData.y_coord
                  ? ''
                  : 'Auto-remplie'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fokontany
                {formData.fokontany && formData.x_coord && formData.y_coord && (
                  <span className="ml-2 inline-flex items-center text-xs text-green-600">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Auto-détecté
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.fokontany || ''}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg font-medium ${
                    formData.fokontany && formData.x_coord && formData.y_coord
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                  placeholder="Aucun fokontany sélectionné"
                />
                {formData.fokontany && formData.x_coord && formData.y_coord ? (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formData.fokontany && formData.x_coord && formData.y_coord
                  ? ''
                  : 'Sélectionnez ou entrez des coordonnées'}
              </p>
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
              {reverseGeocoding && (
                <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                  Recherche OSM...
                </span>
              )}
            </label>
            <div className="flex gap-2 mb-2">
              <textarea
                name="localisation"
                value={formData.localisation || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description de la localisation (remplie automatiquement par OSM)"
                rows={3}
              />
            
            </div>
          </div>
          <div className="mt-6">
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
                onClick={updateMapFromCoordinates}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 shadow-sm"
              >
                 Centrer sur coordonnées
              </button>
              {coordMarker && (
                <button
                  type="button"
                  onClick={() => {
                    if (coordMarker) {
                      const position = coordMarker.getLatLng();
                      updateCoordMarker(position.lat, position.lng, 'Point de référence');
                    }
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2 shadow-sm"
                >
                  🔄 Recentrer sur point
                </button>
              )}
            </div>
          
          
            <div
              ref={mapContainerRef}
              id="map"
              className="h-[600px] border border-slate-300 rounded-lg"
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
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-700 font-medium">⚠️ Aucun polygone tracé</span>
                  </div>
                </div>
              )}
            
              {coordMarker && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-emerald-700 font-medium">📍 Point de référence actif</span>
                  </div>
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
            disabled={polygonPoints.length === 0 || !formData.x_coord || !formData.y_coord}
            className={`px-6 py-2 text-white rounded-lg transition-all font-medium flex items-center gap-2 ${
              polygonPoints.length === 0 || !formData.x_coord || !formData.y_coord
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            {polygonPoints.length === 0
              ? 'Tracez un polygone d\'abord'
              : !formData.x_coord || !formData.y_coord
                ? 'Coordonnées manquantes'
                : initialData
                  ? 'Mettre à jour'
                  : '✅ Enregistrer la descente'
            }
          </button>
        </div>
      </form>
    </div>
  );
}