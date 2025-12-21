import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Switch,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  Image
} from "react-native";
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import axios from 'axios';
import proj4 from 'proj4';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// Configuration - REMPLACEZ AVEC VOTRE IP
const API_BASE_URL = 'http://192.168.25.51:3000';

// Définition des couleurs
const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',
  light: '#f8fafc',
  dark: '#1e293b',
  white: '#ffffff',
  background: '#f1f5f9',
  polygonRed: '#dc2626',
  polygonYellow: '#d97706',
  polygonBlue: '#1d4ed8',
  polygonGreen: '#059669',
  cadastre: '#7c3aed',
  limits: '#0284c7',
  titres: '#16a34a',
  requisition: '#ea580c'
};

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
const convertLabordeToWGS84 = (x, y) => {
  try {
    if (!x || !y || isNaN(x) || isNaN(y)) return null;
   
    const result = proj4("EPSG:8441", "EPSG:4326", [parseFloat(x), parseFloat(y)]);
   
    const lat = result[1];
    const lng = result[0];
   
    if (lat < -26 || lat > -12 || lng < 43 || lng > 51) {
      console.warn(`Coordonnées hors de Madagascar: lat=${lat}, lng=${lng}`);
      return null;
    }
   
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error("Erreur conversion Laborde:", error);
    return null;
  }
};

const isLabordeCoordinates = (x, y) => {
  if (!x || !y || isNaN(x) || isNaN(y)) return false;
  return x > 100000 && x < 1000000 && y > 100000 && y < 1000000;
};

const getDescenteCouleur = (descente) => {
  const { details } = descente;
  if (details?.paiement_id) return 'vert';
  if (details?.avis_id) return 'bleu';
  if (details?.ft_id) return 'jaune';
  return 'rouge';
};

const getDescenteStatut = (descente) => {
  const { details } = descente;
  if (details?.paiement_id) return 'Paiement effectué';
  if (details?.avis_id) return 'Avis de paiement émis';
  if (details?.ft_id) return 'FT créé';
  return 'En attente';
};

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

const calculatePolygonCenter = (polygon) => {
  if (!polygon || polygon.type !== 'Polygon') return null;
 
  const coordinates = polygon.coordinates[0];
  if (!coordinates || coordinates.length === 0) return null;
 
  let sumLat = 0;
  let sumLng = 0;
 
  coordinates.forEach(coord => {
    sumLng += coord[0];
    sumLat += coord[1];
  });
 
  return {
    latitude: sumLat / coordinates.length,
    longitude: sumLng / coordinates.length
  };
};

// --- Composant DetailedPopup ---
const DetailedPopup = ({ descente, onClose }) => {
  const couleur = getDescenteCouleur(descente);
  const statut = getDescenteStatut(descente);
  
  const getStatusColor = () => {
    switch(couleur) {
      case 'vert': return COLORS.success;
      case 'bleu': return COLORS.info;
      case 'jaune': return COLORS.warning;
      default: return COLORS.danger;
    }
  };

  const getStatusIcon = () => {
    switch(couleur) {
      case 'vert': return 'check-circle';
      case 'bleu': return 'information';
      case 'jaune': return 'alert';
      default: return 'alert-circle';
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.popupContainer}>
          <ScrollView style={styles.popupScroll}>
            {/* En-tête */}
            <View style={styles.popupHeader}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupTitle}>
                    Descente {descente.reference || `#${descente.id}`}
                  </Text>
                  {descente.date_descente && (
                    <View style={styles.dateRow}>
                      <Icon name="calendar" size={14} color={COLORS.secondary} />
                      <Text style={styles.dateText}>
                        {formatDate(descente.date_descente)}
                        {descente.heure_descente && ` à ${descente.heure_descente}`}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={COLORS.dark} />
                </TouchableOpacity>
              </View>
              
              {/* Badge d'état */}
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
                <Icon 
                  name={getStatusIcon()} 
                  size={16} 
                  color={getStatusColor()} 
                  style={styles.statusIcon}
                />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {statut}
                </Text>
              </View>
            </View>

            {/* Coordonnées */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="target" size={18} color={COLORS.info} />
                <Text style={styles.sectionTitle}>Coordonnées</Text>
                {descente.has_polygon && (
                  <View style={styles.polygonBadge}>
                    <Text style={styles.polygonBadgeText}>(Centre du polygone)</Text>
                  </View>
                )}
              </View>
              <View style={styles.coordinateBox}>
                <Text style={styles.coordinateLabel}>WGS84:</Text>
                <Text style={styles.coordinateValue}>
                  Lat: {descente.displayLat?.toFixed(6) || 'N/A'}{'\n'}
                  Lon: {descente.displayLng?.toFixed(6) || 'N/A'}
                </Text>
                {descente.laborde_x && descente.laborde_y && (
                  <>
                    <Text style={[styles.coordinateLabel, { marginTop: 8 }]}>Laborde:</Text>
                    <Text style={styles.coordinateValue}>
                      X: {parseFloat(descente.laborde_x).toFixed(2)}{'\n'}
                      Y: {parseFloat(descente.laborde_y).toFixed(2)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Informations principales */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="map-marker-radius" size={18} color={COLORS.dark} />
                <Text style={styles.sectionTitle}>Localisation</Text>
              </View>
              
              {descente.localisation && (
                <View style={styles.infoRow}>
                  <Icon name="map-marker" size={16} color={COLORS.secondary} />
                  <Text style={styles.infoText}>{descente.localisation || "Non spécifié"}</Text>
                </View>
              )}

              <View style={styles.gridContainer}>
                {descente.district && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>District</Text>
                    <Text style={styles.gridValue}>{descente.district}</Text>
                  </View>
                )}
                {descente.commune && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Commune</Text>
                    <Text style={styles.gridValue}>{descente.commune}</Text>
                  </View>
                )}
                {descente.fokontany && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Fokontany</Text>
                    <Text style={styles.gridValue}>{descente.fokontany}</Text>
                  </View>
                )}
                {descente.superficie && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Superficie</Text>
                    <Text style={styles.gridValue}>{descente.superficie}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* État des étapes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="check-circle" size={18} color={COLORS.success} />
                <Text style={styles.sectionTitle}>État des étapes</Text>
              </View>
              
              <View style={styles.stepsContainer}>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot, 
                    { backgroundColor: descente.details?.ft_id ? COLORS.warning : '#d1d5db' }
                  ]} />
                  <Text style={styles.stepText}>FT créé</Text>
                  <Text style={[
                    styles.stepStatus,
                    { color: descente.details?.ft_id ? COLORS.success : COLORS.danger }
                  ]}>
                    {descente.details?.ft_id ? '✓ Fini' : '⨯ Non fini'}
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot, 
                    { backgroundColor: descente.details?.avis_id ? COLORS.info : '#d1d5db' }
                  ]} />
                  <Text style={styles.stepText}>Avis de paiement</Text>
                  <Text style={[
                    styles.stepStatus,
                    { color: descente.details?.avis_id ? COLORS.success : COLORS.danger }
                  ]}>
                    {descente.details?.avis_id ? '✓ Fini' : '⨯ Non fini'}
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot, 
                    { backgroundColor: descente.details?.paiement_id ? COLORS.success : '#d1d5db' }
                  ]} />
                  <Text style={styles.stepText}>Paiement</Text>
                  <Text style={[
                    styles.stepStatus,
                    { color: descente.details?.paiement_id ? COLORS.success : COLORS.danger }
                  ]}>
                    {descente.details?.paiement_id ? '✓ Fini' : '⨯ Non fini'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Références */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="pound" size={18} color={COLORS.dark} />
                <Text style={styles.sectionTitle}>Références</Text>
              </View>
              
              <View style={styles.gridContainer}>
                {descente.n_pv_pat && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>N° PV/PAT</Text>
                    <Text style={styles.gridValue}>{descente.n_pv_pat}</Text>
                  </View>
                )}
                {descente.n_fifafi && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>N° FIFAFI</Text>
                    <Text style={styles.gridValue}>{descente.n_fifafi}</Text>
                  </View>
                )}
                {descente.ref_om && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Ref OM</Text>
                    <Text style={styles.gridValue}>{descente.ref_om}</Text>
                  </View>
                )}
                {descente.ref_rapport && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Ref Rapport</Text>
                    <Text style={styles.gridValue}>{descente.ref_rapport}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Infractions */}
            {descente.infraction && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="file-document" size={18} color={COLORS.danger} />
                  <Text style={styles.sectionTitle}>Infraction</Text>
                </View>
                <View style={styles.infractionBox}>
                  <Text style={styles.infractionText}>
                    {Array.isArray(descente.infraction) 
                      ? descente.infraction.join(', ')
                      : descente.infraction
                    }
                  </Text>
                </View>
              </View>
            )}

            {/* Bouton d'action */}
            <TouchableOpacity style={styles.detailsButton}>
              <Icon name="open-in-new" size={18} color={COLORS.white} />
              <Text style={styles.detailsButtonText}>Voir les détails complets</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// --- Composant Legend ---
const Legend = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendHeader}>
        <Text style={styles.legendTitle}>Légende</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={20} color={COLORS.dark} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.legendContent}>
        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Points de Descente</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.legendText}>En attente</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>FT créé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.info }]} />
            <Text style={styles.legendText}>Avis émis</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Paiement fait</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Polygones de Descente</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.polygonRed }]} />
            <Text style={styles.legendText}>En attente</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.polygonYellow }]} />
            <Text style={styles.legendText}>FT créé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.polygonBlue }]} />
            <Text style={styles.legendText}>Avis émis</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.polygonGreen }]} />
            <Text style={styles.legendText}>Paiement fait</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Points dans Polygone</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316', borderWidth: 3, borderColor: COLORS.white }]} />
            <Text style={styles.legendText}>Point de descente (centre)</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Limites Administratives</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDashedLine, { borderColor: COLORS.limits }]} />
            <Text style={styles.legendText}>Limites communales</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Titres Fonciers</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.titres }]} />
            <Text style={styles.legendText}>Titres fonciers</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Parcelles Cadastrales</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDashedLine, { borderColor: COLORS.cadastre }]} />
            <Text style={styles.legendText}>Parcelles cadastrales</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSectionTitle}>Titres de Réquisition</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDashedLine, { borderColor: COLORS.requisition, borderDashLength: 12 }]} />
            <Text style={styles.legendText}>Titres de réquisition</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// --- Composant SearchModal ---
const SearchModal = ({ visible, onClose, onSearch, searchType, setSearchType, searchValues, setSearchValues }) => {
  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.searchModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recherche par Coordonnées</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchTypeSelector}>
            <TouchableOpacity 
              style={[
                styles.searchTypeButton,
                searchType === 'latlon' && styles.searchTypeButtonActive
              ]}
              onPress={() => setSearchType('latlon')}
            >
              <Text style={[
                styles.searchTypeText,
                searchType === 'latlon' && styles.searchTypeTextActive
              ]}>Lat/Lon</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.searchTypeButton,
                searchType === 'laborde' && styles.searchTypeButtonActive
              ]}
              onPress={() => setSearchType('laborde')}
            >
              <Text style={[
                styles.searchTypeText,
                searchType === 'laborde' && styles.searchTypeTextActive
              ]}>Laborde</Text>
            </TouchableOpacity>
          </View>
          
          {searchType === 'latlon' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Latitude (ex: -18.8792)"
                value={searchValues.lat}
                onChangeText={(text) => setSearchValues({ ...searchValues, lat: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Longitude (ex: 47.5079)"
                value={searchValues.lon}
                onChangeText={(text) => setSearchValues({ ...searchValues, lon: text })}
                keyboardType="numeric"
              />
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Coordonnée X (ex: 450000)"
                value={searchValues.x}
                onChangeText={(text) => setSearchValues({ ...searchValues, x: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Coordonnée Y (ex: 850000)"
                value={searchValues.y}
                onChangeText={(text) => setSearchValues({ ...searchValues, y: text })}
                keyboardType="numeric"
              />
            </>
          )}
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={onSearch}
            >
              <Text style={styles.searchButtonText}>Rechercher</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Composant Principal ---
export default function CartographieContent() {
  const [descentes, setDescentes] = useState([]);
  const [filteredDescentes, setFilteredDescentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState({
    latitude: -18.8792,
    longitude: 47.5079,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });
  const [selectedDescente, setSelectedDescente] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [searchType, setSearchType] = useState('latlon');
  const [searchValues, setSearchValues] = useState({
    lat: '',
    lon: '',
    x: '',
    y: ''
  });
  const [searchMarker, setSearchMarker] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  
  // Filtres
  const [layers, setLayers] = useState([
    { name: 'Points de descente', active: true, color: COLORS.primary, type: 'descentes' },
    { name: 'Polygones de descente', active: false, color: COLORS.danger, type: 'polygons' },
    { name: 'Limites communales', active: false, color: COLORS.limits, type: 'shapefile' },
    { name: 'Titres fonciers', active: false, color: COLORS.titres, type: 'titres' },
    { name: 'Parcelles cadastrales', active: false, color: COLORS.cadastre, type: 'cadastre' },
    { name: 'Titres de réquisition', active: false, color: COLORS.requisition, type: 'titres-requisition' },
  ]);
  
  const [filtreCouleurs, setFiltreCouleurs] = useState({
    rouge: true,
    jaune: true,
    bleu: true,
    vert: true
  });

  const mapRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Tentative de connexion à:', `${API_BASE_URL}/api/descentes/carte/descentes`);
      
      const response = await axios.get(`${API_BASE_URL}/api/descentes/carte/descentes`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Réponse reçue:', response.status);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const processedDescentes = response.data.data.map((item) => {
          const hasLaborde = isLabordeCoordinates(item.laborde_x, item.laborde_y);
          
          let displayLat, displayLng;
          let hasValidCoordinates;
          
          // Vérifier si on a un polygone
          if (item.polygon_geojson && item.polygon_geojson.type === 'Polygon') {
            const center = calculatePolygonCenter(item.polygon_geojson);
            if (center) {
              displayLat = center.latitude;
              displayLng = center.longitude;
              hasValidCoordinates = true;
            }
          } else {
            // Pas de polygone, utiliser les coordonnées
            if (hasLaborde) {
              const converted = convertLabordeToWGS84(item.laborde_x, item.laborde_y);
              if (converted) {
                displayLat = converted.latitude;
                displayLng = converted.longitude;
              } else {
                displayLat = parseFloat(item.lat);
                displayLng = parseFloat(item.lng);
              }
            } else {
              displayLat = parseFloat(item.lat);
              displayLng = parseFloat(item.lng);
            }
            hasValidCoordinates = !isNaN(displayLat) && !isNaN(displayLng);
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
            
            // Coordonnées
            lat: item.lat,
            lng: item.lng,
            laborde_x: item.laborde_x,
            laborde_y: item.laborde_y,
            displayLat,
            displayLng,
            hasValidCoordinates,
            
            // Polygone
            polygon_geojson: item.polygon_geojson || null,
            has_polygon: !!item.polygon_geojson,
            
            details: item.details || {
              ft_id: null,
              avis_id: null,
              paiement_id: null,
              statut_paiement: null
            }
          };
        }).filter(d => d.hasValidCoordinates);
        
        console.log(`${processedDescentes.length} descentes valides chargées`);
        
        setDescentes(processedDescentes);
        setFilteredDescentes(processedDescentes);
        
        // Ajuster la carte
        if (processedDescentes.length > 0) {
          fitToCoordinates(processedDescentes);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      let errorMessage = 'Erreur inconnue';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout - Le serveur ne répond pas';
      } else if (error.response) {
        errorMessage = `Erreur serveur: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Impossible de joindre le serveur';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      Alert.alert(
        'Erreur de connexion',
        errorMessage,
        [
          { text: 'OK' },
          { text: 'Réessayer', onPress: fetchData }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const fitToCoordinates = (descentesList) => {
    if (!descentesList.length || !mapRef.current) return;

    const coordinates = descentesList
      .filter(d => d.displayLat && d.displayLng)
      .map(d => ({
        latitude: d.displayLat,
        longitude: d.displayLng
      }));

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  };

  const handleSearch = () => {
    try {
      let latitude, longitude;
      
      if (searchType === 'latlon') {
        latitude = parseFloat(searchValues.lat);
        longitude = parseFloat(searchValues.lon);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          Alert.alert('Erreur', 'Coordonnées Lat/Lon invalides');
          return;
        }
      } else {
        const x = parseFloat(searchValues.x);
        const y = parseFloat(searchValues.y);
        
        if (isNaN(x) || isNaN(y)) {
          Alert.alert('Erreur', 'Coordonnées Laborde invalides');
          return;
        }
        
        const converted = convertLabordeToWGS84(x, y);
        if (!converted) {
          Alert.alert('Erreur', 'Conversion Laborde échouée');
          return;
        }
        
        latitude = converted.latitude;
        longitude = converted.longitude;
      }
      
      // Rechercher la descente la plus proche
      let closestDescente = null;
      let minDistance = Infinity;
      
      filteredDescentes.forEach(descente => {
        if (descente.displayLat && descente.displayLng) {
          const distance = Math.sqrt(
            Math.pow(descente.displayLat - latitude, 2) +
            Math.pow(descente.displayLng - longitude, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestDescente = descente;
          }
        }
      });
      
      const tolerance = 0.01;
      
      if (closestDescente && minDistance < tolerance) {
        setSearchResult(closestDescente);
        setSelectedDescente(closestDescente);
      }
      
      setSearchMarker({ latitude, longitude });
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
      setShowSearch(false);
      
    } catch (error) {
      console.error('Erreur recherche:', error);
      Alert.alert('Erreur', 'Erreur lors de la recherche');
    }
  };

  const renderDescenteMarker = (descente) => {
    if (!descente.displayLat || !descente.displayLng) return null;
    
    const couleur = getDescenteCouleur(descente);
    const iconColor = couleur === 'rouge' ? COLORS.danger :
                     couleur === 'jaune' ? COLORS.warning :
                     couleur === 'bleu' ? COLORS.info : COLORS.success;
    
    // Si c'est une descente avec polygone, utiliser une icône spéciale
    const isPolygonDescente = descente.has_polygon && layers.find(l => l.name === 'Polygones de descente')?.active;
    
    return (
      <Marker
        key={`descente-${descente.id}`}
        coordinate={{
          latitude: descente.displayLat,
          longitude: descente.displayLng
        }}
        onPress={() => setSelectedDescente(descente)}
      >
        <View style={styles.markerContainer}>
          <View style={[
            styles.markerDot,
            { 
              backgroundColor: isPolygonDescente ? '#f97316' : iconColor,
              borderWidth: isPolygonDescente ? 3 : 2,
              borderColor: COLORS.white,
              width: isPolygonDescente ? 24 : 20,
              height: isPolygonDescente ? 24 : 20,
            }
          ]} />
        </View>
      </Marker>
    );
  };

  const renderPolygon = (descente) => {
    if (!descente.polygon_geojson || descente.polygon_geojson.type !== 'Polygon') return null;
    
    const couleur = getDescenteCouleur(descente);
    const polygonColor = couleur === 'rouge' ? COLORS.polygonRed :
                        couleur === 'jaune' ? COLORS.polygonYellow :
                        couleur === 'bleu' ? COLORS.polygonBlue : COLORS.polygonGreen;
    
    const coordinates = descente.polygon_geojson.coordinates[0];
    const polygonCoords = coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    return (
      <Polygon
        key={`polygon-${descente.id}`}
        coordinates={polygonCoords}
        strokeColor={polygonColor}
        fillColor={`${polygonColor}20`}
        strokeWidth={2}
        tappable={true}
        onPress={() => setSelectedDescente(descente)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        mapType={isSatelliteView ? 'satellite' : 'standard'}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsScale={true}
        showsCompass={true}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        onRegionChangeComplete={setRegion}
      >
        {/* Couches de carte */}
        {layers.find(l => l.name === 'Polygones de descente')?.active &&
          descentes.filter(d => d.has_polygon).map(renderPolygon)}
        
        {/* Points de descente */}
        {layers.find(l => l.name === 'Points de descente')?.active &&
          filteredDescentes.map(renderDescenteMarker)}
        
        {/* Marqueur de recherche */}
        {searchMarker && (
          <Marker coordinate={searchMarker}>
            <View style={styles.searchMarker}>
              <Icon name="magnify" size={20} color={COLORS.white} />
            </View>
          </Marker>
        )}
      </MapView>

      

      {/* Boutons d'action */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowSearch(true)}
        >
          <Icon name="magnify" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => fitToCoordinates(filteredDescentes)}
        >
          <Icon name="target" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowLegend(true)}
        >
          <Icon name="information" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={fetchData}
        >
          <Icon name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIsSatelliteView(!isSatelliteView)}
        >
          <Icon name={isSatelliteView ? "map" : "satellite"} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement des descentes...</Text>
            <Text style={styles.loadingSubText}>{API_BASE_URL}</Text>
          </View>
        </View>
      )}

      {/* Panneau des filtres */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <ScrollView>
            <View style={styles.filtersHeader}>
              <View style={styles.filtersTitleRow}>
                <Icon name="filter" size={20} color={COLORS.primary} />
                <Text style={styles.filtersTitle}>Filtres Cartographie</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            {/* Couches */}
            <View style={styles.filtersSection}>
              <Text style={styles.sectionTitle}>Couches cartographiques</Text>
              {layers.map((layer, index) => (
                <View key={layer.name} style={styles.filterRow}>
                  <View style={styles.filterLabel}>
                    <View 
                      style={[styles.layerColor, { backgroundColor: layer.color }]} 
                    />
                    <Text style={styles.filterText}>{layer.name}</Text>
                  </View>
                  <Switch
                    value={layer.active}
                    onValueChange={(value) => {
                      const newLayers = [...layers];
                      newLayers[index].active = value;
                      setLayers(newLayers);
                    }}
                    trackColor={{ false: '#d1d5db', true: layer.color }}
                    thumbColor={COLORS.white}
                  />
                </View>
              ))}
            </View>

            {/* Filtres par état */}
            <View style={styles.filtersSection}>
              <Text style={styles.sectionTitle}>Filtrer par état</Text>
              {Object.entries(filtreCouleurs).map(([couleur, active]) => {
                const color = couleur === 'rouge' ? COLORS.danger :
                             couleur === 'jaune' ? COLORS.warning :
                             couleur === 'bleu' ? COLORS.info : COLORS.success;
                const label = couleur === 'rouge' ? 'En attente' :
                             couleur === 'jaune' ? 'FT créé' :
                             couleur === 'bleu' ? 'Avis émis' : 'Paiement fait';
                const count = descentes.filter(d => getDescenteCouleur(d) === couleur).length;
                
                return (
                  <View key={couleur} style={styles.filterRow}>
                    <View style={styles.filterLabel}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <View>
                        <Text style={styles.filterText}>{label}</Text>
                        <Text style={styles.filterCount}>({count})</Text>
                      </View>
                    </View>
                    <Switch
                      value={active}
                      onValueChange={(value) => {
                        setFiltreCouleurs(prev => ({ ...prev, [couleur]: value }));
                        // Filtrer les descentes
                        const newFiltered = descentes.filter(d => {
                          const dCouleur = getDescenteCouleur(d);
                          return Object.entries({...filtreCouleurs, [couleur]: value})
                            .filter(([_, isActive]) => isActive)
                            .some(([c, _]) => c === dCouleur);
                        });
                        setFilteredDescentes(newFiltered);
                      }}
                      trackColor={{ false: '#d1d5db', true: color }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Modals */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        searchType={searchType}
        setSearchType={setSearchType}
        searchValues={searchValues}
        setSearchValues={setSearchValues}
      />

      <Legend
        visible={showLegend}
        onClose={() => setShowLegend(false)}
      />

      {/* Popup détaillé */}
      {selectedDescente && (
        <DetailedPopup 
          descente={selectedDescente} 
          onClose={() => setSelectedDescente(null)} 
        />
      )}

      {/* Résultat de recherche */}
      {searchResult && (
        <View style={styles.searchResult}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchResultTitle}>Descente Trouvée</Text>
            <TouchableOpacity onPress={() => setSearchResult(null)}>
              <Icon name="close" size={20} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          <Text style={styles.searchResultText}>
            {searchResult.reference || `#${searchResult.id}`} - {searchResult.localisation}
          </Text>
          <Text style={[
            styles.searchResultStatus,
            { color: getDescenteCouleur(searchResult) === 'rouge' ? COLORS.danger :
                    getDescenteCouleur(searchResult) === 'jaune' ? COLORS.warning :
                    getDescenteCouleur(searchResult) === 'bleu' ? COLORS.info : COLORS.success }
          ]}>
            {getDescenteStatut(searchResult)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  headerError: {
    fontSize: 12,
    color: COLORS.danger,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controlsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.dark,
    fontWeight: '500',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  filtersPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    width: width * 0.85,
    maxHeight: height * 0.7,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  filtersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  layerColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  filterCount: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  searchModal: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  searchTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  searchTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  searchTypeText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  searchTypeTextActive: {
    color: COLORS.white,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  searchButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: height * 0.6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  legendContent: {
    padding: 16,
  },
  legendSection: {
    marginBottom: 16,
  },
  legendSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLine: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  legendDashedLine: {
    width: 24,
    height: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  searchResult: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  searchResultText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  searchResultStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  popupContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  popupScroll: {
    maxHeight: '100%',
  },
  popupHeader: {
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  polygonBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  polygonBadgeText: {
    fontSize: 10,
    color: '#9a3412',
  },
  coordinateBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  coordinateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.info,
    marginBottom: 2,
  },
  coordinateValue: {
    fontSize: 12,
    color: '#1e40af',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    minWidth: '45%',
    flex: 1,
  },
  gridLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
  stepsContainer: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.secondary,
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  infractionBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  infractionText: {
    fontSize: 14,
    color: COLORS.danger,
  },
  detailsButton: {
    margin: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
});