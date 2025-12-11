import { X, Plus, Calendar, Clock, MapPin, Users, FileText, CheckSquare, Map as MapIcon } from 'lucide-react';
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
}

interface LocationData {
  fkt: string;
  comm: string;
  dist: string;
}

// Définition des systèmes de coordonnées
// Lambert Madagascar (EPSG:29701)
const lambertMadagascar = '+proj=lcc +lat_1=-18.9 +lat_2=-18.9 +lat_0=-18.9 +lon_0=46.43722916666667 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
// WGS84 (EPSG:4326) - utilisé par Leaflet
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

// Fonction de conversion Lambert Madagascar vers WGS84
const convertLambertToWGS84 = (x: number, y: number): { lat: number, lng: number } => {
  try {
    const result = proj4(lambertMadagascar, wgs84, [x, y]);
    return {
      lat: result[1],
      lng: result[0]
    };
  } catch (error) {
    console.error('Erreur de conversion de coordonnées:', error);
    // Coordonnées par défaut (Antananarivo centre)
    return {
      lat: -18.8792,
      lng: 47.5079
    };
  }
};

// Fonction de conversion WGS84 vers Lambert Madagascar
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

// Options prédéfinies (vous pouvez les récupérer d'une API)
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
    dossier_a_fournir: []
  });
  
  const [filteredCommunes, setFilteredCommunes] = useState<string[]>([]);
  const [filteredFokontany, setFilteredFokontany] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericValue = name === 'x_coord' || name === 'y_coord' || name === 'superficie' ? 
      (value === '' ? undefined : Number(value)) : value;

    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));

    // Si x_coord ou y_coord changent, mettre à jour la carte
    if ((name === 'x_coord' || name === 'y_coord') && formData.x_coord && formData.y_coord) {
      updateMapFromCoordinates();
    }

    // Mise à jour dynamique des communes et fokontany
    if (name === 'district') {
      const communes = [...new Set(locations
        .filter(loc => loc.dist.toLowerCase().includes(value.toLowerCase()))
        .map(loc => loc.comm))];
      setFilteredCommunes(communes);
      setFilteredFokontany([]);
    }
    
    if (name === 'commune') {
      const fokontany = [...new Set(locations
        .filter(loc => loc.comm.toLowerCase().includes(value.toLowerCase()))
        .map(loc => loc.fkt))];
      setFilteredFokontany(fokontany);
    }
  };

  // Mettre à jour la carte à partir des coordonnées x_coord, y_coord
  const updateMapFromCoordinates = () => {
    if (!mapRef.current || !formData.x_coord || !formData.y_coord) return;

    try {
      const coords = convertLambertToWGS84(formData.x_coord, formData.y_coord);
      
      // Effacer les éléments précédents
      drawnItemsRef.current.clearLayers();
      
      // Ajouter un marqueur à la position convertie
      const marker = L.marker([coords.lat, coords.lng]);
      drawnItemsRef.current.addLayer(marker);
      
      // Centrer la carte sur la nouvelle position
      mapRef.current.setView([coords.lat, coords.lng], 15);
      
      // Mettre à jour le formulaire avec les coordonnées WGS84
      setFormData(prev => ({
        ...prev,
        geom: marker.toGeoJSON().geometry
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

  const handleFokontanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      fokontany: value
    }));

    // Recherche automatique du district et commune
    const match = locations.find(loc => 
      loc.fkt.toLowerCase() === value.toLowerCase()
    );
    
    if (match) {
      setFormData(prev => ({
        ...prev,
        commune: match.comm,
        district: match.dist
      }));
      
      const communes = [...new Set(locations
        .filter(l => l.dist === match.dist)
        .map(l => l.comm))];
      setFilteredCommunes(communes);
      
      const fokontany = [...new Set(locations
        .filter(l => l.comm === match.comm)
        .map(l => l.fkt))];
      setFilteredFokontany(fokontany);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertir les coordonnées Lambert avant soumission
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
    
    onSubmit(finalData);
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

    // Initialiser le groupe de dessin
    drawnItemsRef.current = new L.FeatureGroup();
    mapRef.current.addLayer(drawnItemsRef.current);

    // Ajouter le contrôle de dessin
    // @ts-ignore - Les types Leaflet Draw peuvent être incompatibles
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: true,
        polyline: false,
        marker: true,
        circle: false,
        rectangle: false
      },
      edit: {
        featureGroup: drawnItemsRef.current
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
      drawnItemsRef.current.clearLayers();
      drawnItemsRef.current.addLayer(layer);
      
      const geojson = layer.toGeoJSON();
      let newData: Partial<DescenteFormData> = { geom: geojson.geometry };

      if (type === 'marker') {
        const { lat, lng } = layer.getLatLng();
        const lambertCoords = convertWGS84ToLambert(lng, lat);
        newData = { 
          ...newData, 
          x_coord: lambertCoords.x, 
          y_coord: lambertCoords.y, 
          superficie: undefined 
        };
      } else if (type === 'polygon') {
        const latlngs: L.LatLng[] = layer.getLatLngs()[0];
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
        newData = { 
          ...newData, 
          x_coord: lambertCoords.x, 
          y_coord: lambertCoords.y, 
          superficie: Math.round(area) 
        };
      }

      setFormData(prev => ({
        ...prev,
        ...newData
      }));
    });

    // Gérer l'événement locationfound
    mapRef.current.on('locationfound', (e: L.LocationEvent) => {
      drawnItemsRef.current.clearLayers();
      const marker = L.marker(e.latlng);
      drawnItemsRef.current.addLayer(marker);
      marker.bindPopup("📍 Vous êtes ici").openPopup();

      const geojson = marker.toGeoJSON();
      const lambertCoords = convertWGS84ToLambert(e.latlng.lng, e.latlng.lat);
      
      setFormData(prev => ({
        ...prev,
        x_coord: lambertCoords.x,
        y_coord: lambertCoords.y,
        geom: geojson.geometry,
        superficie: undefined
      }));
    });

    // Si données initiales avec coordonnées Lambert, convertir pour la carte
    if (initialData?.x_coord && initialData?.y_coord) {
      const coords = convertLambertToWGS84(initialData.x_coord, initialData.y_coord);
      const marker = L.marker([coords.lat, coords.lng]);
      drawnItemsRef.current.addLayer(marker);
      mapRef.current.setView([coords.lat, coords.lng], 15);
    } 
    // Si données initiales avec geom, l'ajouter à la carte
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
            // Si c'est un point, fitBounds peut échouer, on centre dessus
            if (initialLayer instanceof L.Marker) {
              mapRef.current.setView(initialLayer.getLatLng(), 15);
            }
          }
        }
      }
    }

    // Nettoyer à la destruction
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialData]);

  // Gérer la localisation
  const handleLocate = () => {
    if (!mapRef.current) return;

    mapRef.current.locate({ setView: true, maxZoom: 17 });
  };

  // Mettre à jour la carte quand x_coord ou y_coord changent
  useEffect(() => {
    if (formData.x_coord && formData.y_coord) {
      updateMapFromCoordinates();
    }
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                District
              </label>
              <input
                type="text"
                list="dist-list"
                name="district"
                id="district"
                value={formData.district || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="District"
              />
              <datalist id="dist-list">
                {[...new Set(locations.map(loc => loc.dist))].map(dist => (
                  <option key={dist} value={dist} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Commune
              </label>
              <input
                type="text"
                list="comm-list"
                name="commune"
                id="commune"
                value={formData.commune || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Commune"
              />
              <datalist id="comm-list">
                {filteredCommunes.map(comm => (
                  <option key={comm} value={comm} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fokontany
              </label>
              <input
                type="text"
                list="fkt-list"
                name="fokontany"
                id="fokontany"
                value={formData.fokontany || ''}
                onChange={handleFokontanyChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Fokontany"
              />
              <datalist id="fkt-list">
                {filteredFokontany.map(fkt => (
                  <option key={fkt} value={fkt} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Coordonnées Lambert Madagascar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée X (Lambert)
              </label>
              <input
                type="number"
                step="any"
                name="x_coord"
                value={formData.x_coord || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 521688"
              />
              <p className="text-xs text-slate-500 mt-1">Coordonnée Lambert Madagascar (mètres)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coordonnée Y (Lambert)
              </label>
              <input
                type="number"
                step="any"
                name="y_coord"
                value={formData.y_coord || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 798900"
              />
              <p className="text-xs text-slate-500 mt-1">Coordonnée Lambert Madagascar (mètres)</p>
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
              📍 Carte interactive
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={handleLocate}
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition flex items-center gap-2"
              >
                <MapIcon className="w-4 h-4" />
                Voir ma position
              </button>
              <button
                type="button"
                onClick={updateMapFromCoordinates}
                className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-50 transition flex items-center gap-2"
              >
                📍 Mettre à jour la carte
              </button>
            </div>
            <div 
              ref={mapContainerRef} 
              id="map" 
              className="h-[400px] border border-slate-300 rounded-lg"
            />
            <input type="hidden" name="geom" value={JSON.stringify(formData.geom || '')} />
            <div className="text-xs text-slate-500 mt-2">
              <p>Utilisez les outils de dessin pour définir la localisation. Les coordonnées Lambert seront automatiquement calculées.</p>
              <p>Exemple de coordonnées Lambert Madagascar: X=521688, Y=798900 (centre d'Antananarivo)</p>
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {initialData ? 'Mettre à jour' : '✅ Enregistrer la descente'}
          </button>
        </div>
      </form>
    </div>
  );
}