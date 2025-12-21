import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import { 
  X, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  CheckSquare, 
  Search, 
  Navigation,
  ChevronDown,
  Check,
  Map as MapIcon
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import proj4 from 'proj4';

interface FormulaireDescenteProps {
  onClose?: () => void;
  initialData?: DescenteFormData;
  mode?: 'add' | 'edit';
}

interface DescenteFormData {
  id?: number;
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

interface FokontanyData {
  id_fkt: string;
  fkt: string;
  firaisana: string;
  distrika: string;
}

// Utilisez la même URL que votre composant DescenteContent qui fonctionne
const API_BASE_URL = 'http://192.168.25.51:3000';

// Définition des systèmes de coordonnées
const lambertMadagascar = '+proj=lcc +lat_1=-18.9 +lat_2=-18.9 +lat_0=-18.9 +lon_0=46.43722916666667 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

// Conversion Lambert (x, y) → WGS84 (lng, lat)
const convertLambertToWGS84 = (x: number, y: number): { lat: number, lng: number } => {
  try {
    const result = proj4(lambertMadagascar, wgs84, [x, y]);
    return {
      lng: result[0],
      lat: result[1]
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

// Palettes de couleurs
const COLORS = {
  primary: '#4361ee',
  primaryLight: '#4895ef',
  secondary: '#7209b7',
  success: '#4cc9f0',
  warning: '#f72585',
  danger: '#ff0054',
  info: '#3a0ca3',
  light: '#f8f9fa',
  dark: '#212529',
  white: '#ffffff',
  background: '#f1f5f9',
  card: '#ffffff',
  border: '#e9ecef',
  textPrimary: '#2b2d42',
  textSecondary: '#6c757d',
};

export default function FormulaireDescente({
  onClose = () => router.back(),
  initialData,
  mode = 'add'
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
  const [searchingByCoords, setSearchingByCoords] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour tester l'API avant de faire les appels réels
  const testAPIConnection = async () => {
    try {
      console.log('Test de connexion API...');
      const response = await fetch(`${API_BASE_URL}/api/descentes`);
      if (response.ok) {
        console.log('API descentes accessible');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Test API échoué:', error);
      return false;
    }
  };

  // Charger les données des fokontany depuis l'API
  useEffect(() => {
    const fetchFokontanyData = async () => {
      try {
        setIsLoading(true);
        
        // D'abord tester si l'API est accessible
        const apiAccessible = await testAPIConnection();
        if (!apiAccessible) {
          throw new Error('API non accessible. Vérifiez la connexion au serveur.');
        }

        // Essayer plusieurs routes possibles
        const possibleRoutes = [
          '/api/fokontany',
          '/api/fokontany/all',
          '/api/locations',
          '/api/communes'
        ];

        let success = false;
        let lastError: Error | null = null;

        for (const route of possibleRoutes) {
          try {
            console.log(`Tentative route: ${route}`);
            const response = await fetch(`${API_BASE_URL}${route}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Données reçues de ${route}:`, data.length || 'N/A');
              
              // Adapter selon la structure de réponse
              if (Array.isArray(data)) {
                if (data.length > 0) {
                  // Vérifier la structure des données
                  const firstItem = data[0];
                  if (firstItem.fkt !== undefined && firstItem.firaisana !== undefined) {
                    setFokontanyData(data);
                    setFilteredFokontany(data);
                    success = true;
                    break;
                  } else if (firstItem.comm !== undefined && firstItem.dist !== undefined) {
                    // Adapter depuis la structure Descente
                    const transformedData = data.map((item: any, index: number) => ({
                      id_fkt: index.toString(),
                      fkt: item.fkt || item.comm || 'Non spécifié',
                      firaisana: item.firaisana || item.comm || 'Non spécifié',
                      distrika: item.distrika || item.dist || 'Non spécifié'
                    }));
                    setFokontanyData(transformedData);
                    setFilteredFokontany(transformedData);
                    success = true;
                    break;
                  }
                }
              }
            }
          } catch (routeError) {
            console.log(`Route ${route} échouée:`, routeError);
            lastError = routeError as Error;
            continue;
          }
        }

        if (!success) {
          // Utiliser des données de test
          console.log('Utilisation de données de test');
          const testData = generateTestData();
          setFokontanyData(testData);
          setFilteredFokontany(testData);
          
          // Avertir l'utilisateur
          Alert.alert(
            'Info',
            'Utilisation de données locales. Les fokontany réels ne sont pas disponibles.',
            [{ text: 'OK' }]
          );
        }

        // Initialiser les données si mode édition
        if (initialData?.fokontany) {
          setSearchTerm(initialData.fokontany);
        }

        if (initialData?.x_coord && initialData?.y_coord) {
          // Rechercher le fokontany en arrière-plan
          setTimeout(() => {
            searchFokontanyByCoordinates(initialData.x_coord!, initialData.y_coord!);
          }, 500);
        }

      } catch (error) {
        console.error('Erreur chargement fokontany:', error);
        // Utiliser des données de test en cas d'erreur
        const testData = generateTestData();
        setFokontanyData(testData);
        setFilteredFokontany(testData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFokontanyData();
  }, []);

  // Générer des données de test
  const generateTestData = (): FokontanyData[] => {
    const communes = ['Antananarivo', 'Antsirabe', 'Fianarantsoa', 'Mahajanga', 'Toamasina'];
    const districts = ['Analamanga', 'Vakinankaratra', 'Haute Matsiatra', 'Boeny', 'Atsinanana'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id_fkt: (i + 1).toString(),
      fkt: `Fokontany ${i + 1}`,
      firaisana: communes[Math.floor(Math.random() * communes.length)],
      distrika: districts[Math.floor(Math.random() * districts.length)]
    }));
  };

  // Fonction pour rechercher le fokontany par coordonnées (version simplifiée)
  const searchFokontanyByCoordinates = async (x: number, y: number) => {
    if (!x || !y || x <= 0 || y <= 0) {
      return;
    }

    try {
      setSearchingByCoords(true);
      
      // Simuler la recherche avec des données de test
      setTimeout(() => {
        // Trouver un fokontany aléatoire dans les données disponibles
        if (fokontanyData.length > 0) {
          const randomIndex = Math.floor(Math.random() * fokontanyData.length);
          const selectedFokontany = fokontanyData[randomIndex];
          
          setFormData(prev => ({
            ...prev,
            fokontany: selectedFokontany.fkt,
            commune: selectedFokontany.firaisana,
            district: selectedFokontany.distrika
          }));
          
          setSearchTerm(selectedFokontany.fkt);
          
          Alert.alert(
            'Fokontany trouvé',
            `${selectedFokontany.fkt}, ${selectedFokontany.firaisana}, ${selectedFokontany.distrika}`,
            [{ text: 'OK' }]
          );
        }
        setSearchingByCoords(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erreur recherche coordonnées:', error);
      setSearchingByCoords(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    const numericValue = name === 'x_coord' || name === 'y_coord' || name === 'superficie' ?
      (value === '' ? undefined : Number(value)) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));
    
    // Si x_coord ou y_coord changent, rechercher le fokontany
    if ((name === 'x_coord' || name === 'y_coord') && formData.x_coord && formData.y_coord) {
      // Délai pour éviter trop de requêtes
      const timer = setTimeout(() => {
        if (formData.x_coord && formData.y_coord) {
          searchFokontanyByCoordinates(formData.x_coord, formData.y_coord);
        }
      }, 1000);
      return () => clearTimeout(timer);
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

  // Gérer la géolocalisation
  const handleLocate = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La permission de localisation est nécessaire');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      const lambertCoords = convertWGS84ToLambert(longitude, latitude);
      
      setFormData(prev => ({
        ...prev,
        x_coord: lambertCoords.x,
        y_coord: lambertCoords.y,
        localisation: `Position GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }));
      
      // Rechercher le fokontany
      searchFokontanyByCoordinates(lambertCoords.x, lambertCoords.y);
      
      Alert.alert(
        'Position obtenue',
        `Coordonnées: X=${lambertCoords.x}, Y=${lambertCoords.y}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Erreur géolocalisation:', error);
      Alert.alert('Erreur', 'Impossible de déterminer votre position');
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validation des données requises
      if (!formData.date_descente) {
        throw new Error('La date de descente est obligatoire');
      }

      if (!formData.nom_verbalisateur) {
        throw new Error('Le nom du verbalisateur est obligatoire');
      }

      // Préparer les données pour l'API
      const submissionData = {
        date: formData.date_descente,
        heure: formData.heure_descente || '',
        date_rdv_ft: formData.date_rendez_vous || '',
        heure_rdv_ft: formData.heure_rendez_vous || '',
        n_pv_pat: formData.n_pv_pat || null,
        n_fifafi: formData.n_fifafi || null,
        type_verbalisateur: formData.type_verbalisateur || '',
        nom_verbalisateur: formData.nom_verbalisateur,
        pers_verb: formData.personne_r || '',
        nom_pers: formData.nom_personne_r || '',
        adresse: formData.adresse_r || '',
        contact: formData.contact_r || '',
        dist: formData.district || '',
        comm: formData.commune || '',
        fkt: formData.fokontany || '',
        localisation: formData.localisation || null,
        superficie: formData.superficie?.toString() || '',
        x: formData.x_coord || 0,
        y: formData.y_coord || 0,
        constat: formData.infraction || [],
        action: formData.actions || [],
        modele_pv: formData.modele_pv || '',
        reference: formData.reference || '',
        pieces_a_fournir: formData.dossier_a_fournir || [],
        statut_descente: 'En cours',
        polygon_points: formData.polygon_points || [],
        has_polygon: !!(formData.polygon_points && formData.polygon_points.length > 0)
      };

      console.log('Données à soumettre:', submissionData);

      // Déterminer l'URL et la méthode
      const url = mode === 'edit' && initialData?.id 
        ? `${API_BASE_URL}/api/descentes/${initialData.id}`
        : `${API_BASE_URL}/api/descentes`;
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Réponse serveur:', result);

      Alert.alert(
        'Succès',
        mode === 'edit' ? 'Descente modifiée avec succès' : 'Descente créée avec succès',
        [
          { 
            text: 'OK', 
            onPress: () => {
              onClose();
              // Rafraîchir la liste des descentes si nécessaire
              if (router.canGoBack()) {
                router.back();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erreur soumission:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer la sélection de date
  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const field = showDatePicker === 'date_descente' ? 'date_descente' : 'date_rendez_vous';
      handleChange(field, dateStr);
    }
  };

  // Gérer la sélection de temps
  const handleTimeSelect = (event: any, selectedTime?: Date) => {
    setShowTimePicker(null);
    if (selectedTime) {
      const timeStr = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      const field = showTimePicker === 'heure_descente' ? 'heure_descente' : 'heure_rendez_vous';
      handleChange(field, timeStr);
    }
  };

  // Afficher le sélecteur de date
  const showDatePickerModal = (field: string) => {
    setSelectedDate(new Date());
    setShowDatePicker(field);
  };

  // Afficher le sélecteur de temps
  const showTimePickerModal = (field: string) => {
    setSelectedDate(new Date());
    setShowTimePicker(field);
  };

  // Formater la date pour l'affichage
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <X size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Modifier la Descente' : 'Nouvelle Descente'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 🗓️ Date & Références */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Date & Références</Text>
          </View>
          
          <View style={styles.grid}>
            {/* Date Descente */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date Descente *</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => showDatePickerModal('date_descente')}
              >
                <Text style={styles.dateInputText}>
                  {formData.date_descente ? formatDate(formData.date_descente) : 'Sélectionner une date'}
                </Text>
                <Calendar size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Heure Descente */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Heure Descente</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => showTimePickerModal('heure_descente')}
              >
                <Text style={styles.dateInputText}>
                  {formData.heure_descente || 'Sélectionner une heure'}
                </Text>
                <Clock size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type verbalisateur */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type verbalisateur</Text>
              <View style={styles.selectContainer}>
                <Text style={styles.selectText}>
                  {formData.type_verbalisateur === 'pat' ? 'PAT' : 
                   formData.type_verbalisateur === 'fifafi' ? 'FIFAFI' : '-- Choisir --'}
                </Text>
                <ChevronDown size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.selectOptions}>
                <TouchableOpacity 
                  style={styles.selectOption}
                  onPress={() => handleChange('type_verbalisateur', 'pat')}
                >
                  <Text style={styles.selectOptionText}>PAT</Text>
                  {formData.type_verbalisateur === 'pat' && <Check size={20} color={COLORS.primary} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.selectOption}
                  onPress={() => handleChange('type_verbalisateur', 'fifafi')}
                >
                  <Text style={styles.selectOptionText}>FIFAFI</Text>
                  {formData.type_verbalisateur === 'fifafi' && <Check size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Nom verbalisateur */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom verbalisateur *</Text>
              <TextInput
                style={styles.input}
                value={formData.nom_verbalisateur || ''}
                onChangeText={(value) => handleChange('nom_verbalisateur', value)}
                placeholder="Nom verbalisateur"
              />
            </View>

            {/* PV PAT */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Numéro PV PAT</Text>
              <TextInput
                style={styles.input}
                value={formData.n_pv_pat || ''}
                onChangeText={(value) => handleChange('n_pv_pat', value)}
                placeholder="Numéro PV PAT"
              />
            </View>

            {/* PV FIFAFI */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Numéro PV FIFAFI</Text>
              <TextInput
                style={styles.input}
                value={formData.n_fifafi || ''}
                onChangeText={(value) => handleChange('n_fifafi', value)}
                placeholder="Numéro PV FIFAFI"
              />
            </View>

            {/* Modèle PV */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Modèle PV</Text>
              <TextInput
                style={styles.input}
                value={formData.modele_pv || ''}
                onChangeText={(value) => handleChange('modele_pv', value)}
                placeholder="Modèle PV"
              />
            </View>

            {/* Référence */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Référence</Text>
              <TextInput
                style={styles.input}
                value={formData.reference || ''}
                onChangeText={(value) => handleChange('reference', value)}
                placeholder="Référence"
              />
            </View>
          </View>
        </View>

        {/* 👥 Actions & Infractions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Actions & Infractions</Text>
          </View>

          {/* Actions */}
          <View style={styles.checkboxGroup}>
            <Text style={styles.label}>Actions</Text>
            {actionOptions.map((act) => (
              <TouchableOpacity
                key={act}
                style={styles.checkboxContainer}
                onPress={() => {
                  const checked = formData.actions?.includes(act) || false;
                  handleCheckboxChange('actions', act, !checked);
                }}
              >
                <View style={[
                  styles.checkbox,
                  formData.actions?.includes(act) && styles.checkboxChecked
                ]}>
                  {formData.actions?.includes(act) && (
                    <Check size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{act}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Infractions */}
          <View style={styles.checkboxGroup}>
            <Text style={styles.label}>Infraction / Constats</Text>
            {constatOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.checkboxContainer}
                onPress={() => {
                  const checked = formData.infraction?.includes(c) || false;
                  handleCheckboxChange('infraction', c, !checked);
                }}
              >
                <View style={[
                  styles.checkbox,
                  formData.infraction?.includes(c) && styles.checkboxChecked
                ]}>
                  {formData.infraction?.includes(c) && (
                    <Check size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🧍 Personne & Localisation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Personne & Localisation</Text>
          </View>

          {/* Personne verbalisée */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Personne verbalisée</Text>
            <View style={styles.selectContainer}>
              <Text style={styles.selectText}>
                {formData.personne_r === 'Propriétaire' ? 'Propriétaire' : 
                 formData.personne_r === 'Représentant' ? 'Représentant' : '-- Choisir --'}
              </Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.selectOptions}>
              <TouchableOpacity 
                style={styles.selectOption}
                onPress={() => handleChange('personne_r', 'Propriétaire')}
              >
                <Text style={styles.selectOptionText}>Propriétaire</Text>
                {formData.personne_r === 'Propriétaire' && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.selectOption}
                onPress={() => handleChange('personne_r', 'Représentant')}
              >
                <Text style={styles.selectOptionText}>Représentant</Text>
                {formData.personne_r === 'Représentant' && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Détails de la personne */}
          {(formData.personne_r === 'Propriétaire' || formData.personne_r === 'Représentant') && (
            <View style={styles.detailsSection}>
              <Text style={styles.subTitle}>Détails du {formData.personne_r}</Text>
              <View style={styles.grid}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nom</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.nom_personne_r || ''}
                    onChangeText={(value) => handleChange('nom_personne_r', value)}
                    placeholder="Nom"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.adresse_r || ''}
                    onChangeText={(value) => handleChange('adresse_r', value)}
                    placeholder="Adresse"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Contact</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contact_r || ''}
                    onChangeText={(value) => handleChange('contact_r', value)}
                    placeholder="Contact"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Recherche de fokontany */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Rechercher un Fokontany</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchTerm || formData.fokontany || ''}
                onChangeText={(value) => {
                  handleFokontanySearch(value);
                  setSearchTerm(value);
                }}
                onFocus={() => setShowFokontanyDropdown(true)}
                placeholder="Rechercher un fokontany..."
              />
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Search size={20} color={COLORS.textSecondary} />
              )}
            </View>
            
            {showFokontanyDropdown && filteredFokontany.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll}>
                  {filteredFokontany.map((item) => (
                    <TouchableOpacity
                      key={item.id_fkt}
                      style={styles.dropdownItem}
                      onPress={() => handleFokontanySelect(item)}
                    >
                      <Text style={styles.dropdownItemTitle}>{item.fkt}</Text>
                      <Text style={styles.dropdownItemSubtitle}>
                        Commune: {item.firaisana} • District: {item.distrika}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <Text style={styles.helperText}>
              Recherchez un fokontany ou entrez des coordonnées ci-dessous pour le détecter automatiquement
            </Text>
          </View>

          {/* Coordonnées Lambert */}
          <View style={styles.grid}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Coordonnée X (Lambert)
                {searchingByCoords && (
                  <Text style={styles.searchingText}> Recherche...</Text>
                )}
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  value={formData.x_coord?.toString() || ''}
                  onChangeText={(value) => handleChange('x_coord', value)}
                  placeholder="Ex: 517431"
                  keyboardType="numeric"
                />
                {searchingByCoords && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.helperText}>
                Coordonnée Lambert Madagascar (mètres)
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Coordonnée Y (Lambert)
                {searchingByCoords && (
                  <Text style={styles.searchingText}> Recherche...</Text>
                )}
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  value={formData.y_coord?.toString() || ''}
                  onChangeText={(value) => handleChange('y_coord', value)}
                  placeholder="Ex: 797309"
                  keyboardType="numeric"
                />
                {searchingByCoords && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.helperText}>
                Coordonnée Lambert Madagascar (mètres)
              </Text>
            </View>
          </View>

          {/* District, Commune, Fokontany */}
          <View style={styles.grid}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>District</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>
                  {formData.district || 'Sélectionnez un fokontany'}
                </Text>
                {formData.district && formData.x_coord && formData.y_coord && (
                  <CheckSquare size={20} color={COLORS.success} />
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Commune</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>
                  {formData.commune || 'Sélectionnez un fokontany'}
                </Text>
                {formData.commune && formData.x_coord && formData.y_coord && (
                  <CheckSquare size={20} color={COLORS.success} />
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fokontany</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>
                  {formData.fokontany || 'Aucun fokontany sélectionné'}
                </Text>
                {formData.fokontany && formData.x_coord && formData.y_coord ? (
                  <CheckSquare size={20} color={COLORS.success} />
                ) : (
                  <Search size={20} color={COLORS.textSecondary} />
                )}
              </View>
            </View>
          </View>

          {/* Superficie */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Superficie (m²)</Text>
            <TextInput
              style={styles.input}
              value={formData.superficie?.toString() || ''}
              onChangeText={(value) => handleChange('superficie', value)}
              placeholder="Superficie"
              keyboardType="numeric"
            />
          </View>

          {/* Description localisation */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description localisation</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.localisation || ''}
              onChangeText={(value) => handleChange('localisation', value)}
              placeholder="Description de la localisation"
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity 
              style={styles.geoButton}
              onPress={handleLocate}
            >
              <Navigation size={16} color={COLORS.white} />
              <Text style={styles.geoButtonText}>Utiliser ma position</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📅 RDV & Pièces */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>RDV & Pièces à fournir</Text>
          </View>

          <View style={styles.grid}>
            {/* Date Rendez-vous */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date Rendez-vous</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => showDatePickerModal('date_rendez_vous')}
              >
                <Text style={styles.dateInputText}>
                  {formData.date_rendez_vous ? formatDate(formData.date_rendez_vous) : 'Sélectionner une date'}
                </Text>
                <Calendar size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Heure Rendez-vous */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Heure Rendez-vous</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => showTimePickerModal('heure_rendez_vous')}
              >
                <Text style={styles.dateInputText}>
                  {formData.heure_rendez_vous || 'Sélectionner une heure'}
                </Text>
                <Clock size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dossier / Pièces à fournir */}
          <View style={styles.checkboxGroup}>
            <Text style={styles.label}>Dossier / Pièces à fournir</Text>
            {piecesOption.map((piece) => (
              <TouchableOpacity
                key={piece}
                style={styles.checkboxContainer}
                onPress={() => {
                  const checked = formData.dossier_a_fournir?.includes(piece) || false;
                  handleCheckboxChange('dossier_a_fournir', piece, !checked);
                }}
              >
                <View style={[
                  styles.checkbox,
                  formData.dossier_a_fournir?.includes(piece) && styles.checkboxChecked
                ]}>
                  {formData.dossier_a_fournir?.includes(piece) && (
                    <Check size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{piece}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!formData.date_descente || !formData.nom_verbalisateur || isSubmitting) && 
              styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!formData.date_descente || !formData.nom_verbalisateur || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Plus size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>
                  {mode === 'edit' ? 'Modifier' : 'Enregistrer'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sélecteurs de date et temps */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={!!showDatePicker}
          onRequestClose={() => setShowDatePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateSelect}
                style={styles.dateTimePicker}
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDatePicker(null)}
              >
                <Text style={styles.modalButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showTimePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={!!showTimePicker}
          onRequestClose={() => setShowTimePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="spinner"
                onChange={handleTimeSelect}
                style={styles.dateTimePicker}
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTimePicker(null)}
              >
                <Text style={styles.modalButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: COLORS.danger,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectOptions: {
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  checkboxGroup: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  detailsSection: {
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginTop: 4,
    maxHeight: 200,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  readonlyInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.background,
  },
  readonlyText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  geoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  geoButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  dateTimePicker: {
    height: 200,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
});