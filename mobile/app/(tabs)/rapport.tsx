import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  Linking,
  RefreshControl,
  Animated,
  StatusBar
} from 'react-native';
import { router } from 'expo-router'; // Changé de useNavigation à router
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';


const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Palettes de couleurs modernes
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
  gradientStart: '#4361ee',
  gradientEnd: '#3a0ca3'
};

// Tailles de police responsive
const FONT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
};

const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800'
};

// Interface Descente
interface Descente {
  id?: number;
  date: string;
  heure: string;
  date_rdv_ft: string;
  heure_rdv_ft: string;
  n_pv_pat: string | null;
  n_fifafi: string | null;
  type_verbalisateur: string;
  nom_verbalisateur: string;
  pers_verb: string;
  nom_pers: string;
  adresse: string;
  contact: string;
  dist: string;
  comm: string;
  fkt: string;
  localisation: string | null;
  superficie: string;
  x: number;
  y: number;
  constat: string[];
  action: string[];
  modele_pv: string;
  reference: string;
  pieces_a_fournir: string[];
  statut_descente: string;
  polygon_geojson: any | null;
  has_polygon: boolean;
  polygon_points?: Array<{longitude: number, latitude: number, order: number}>;
}

// Composant Card moderne avec animations
const ModernCard = ({ children, style }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.modernCard,
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {children}
    </Animated.View>
  );
};

// Badge avec style moderne
const ModernBadge = ({ text, color, icon }: any) => (
  <View style={[styles.modernBadge, { backgroundColor: `${color}20` }]}>
    {icon && <Icon name={icon} size={12} color={color} style={styles.badgeIcon} />}
    <Text style={[styles.modernBadgeText, { color }]}>{text}</Text>
  </View>
);

// Composant Loading moderne
const ModernLoading = () => (
  <View style={styles.modernLoadingContainer}>
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  </View>
);

// Barre de recherche moderne avec bouton + au-dessus
const ModernSearchBar = ({ value, onChangeText, onClear, onAddPress }: any) => (
  <View style={styles.searchContainer}>
    {/* Bouton + flottant au-dessus de la recherche */}
    <View style={styles.topAddButtonContainer}>
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={onAddPress}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
    
    {/* Barre de recherche */}
    <View style={styles.modernSearchContainer}>
      <Icon name="magnify" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.modernSearchInput}
        placeholder="Rechercher..."
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Icon name="close-circle" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

// Statistiques modernes réduites
const ModernStats = ({ stats }: any) => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    style={styles.modernStatsContainer}
    contentContainerStyle={styles.statsContent}
  >
    {stats.map((stat: any, index: number) => (
      <ModernCard key={index} style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.statIconContainer, { backgroundColor: stat.color }]}>
            <Icon name={stat.icon} size={18} color={COLORS.white} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      </ModernCard>
    ))}
  </ScrollView>
);

// Composant principal
export default function DescenteContent() {
  const [descentes, setDescentes] = useState<Descente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDescente, setSelectedDescente] = useState<Descente | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchDescentes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.25.51:3000/api/descentes');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      const dataWithIds = data.map((item: Descente, index: number) => ({
        ...item,
        id: index + 1
      }));
      
      setDescentes(dataWithIds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDescentes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDescentes();
  };

  const handleViewDetails = (descente: Descente) => {
    setSelectedDescente(descente);
    setShowModal(true);
  };

  // Fonction pour naviguer vers le formulaire (ajout)
  const handleAddDescente = () => {
    router.push({
      pathname: '/(tabs)/formdescente',
      params: { mode: 'add' }
    });
  };

  // Fonction pour naviguer vers le formulaire (édition)
  const handleEdit = (descente: Descente) => {
    router.push({
      pathname: '/(tabs)/formdescente',
      params: { 
        mode: 'edit',
        id: descente.id,
        descenteData: JSON.stringify(descente)
      }
    });
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cette descente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://192.168.25.51:3000/api/descentes/${id}`, {
                method: 'DELETE'
              });
              
              if (response.ok) {
                fetchDescentes();
                Alert.alert('Succès', 'Descente supprimée');
              }
            } catch (err) {
              Alert.alert('Erreur', 'Erreur lors de la suppression');
            }
          }
        }
      ]
    );
  };

  // Filtrage amélioré
  const filteredDescentes = useMemo(() => {
    let filtered = descentes.filter(descente => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        (descente.n_pv_pat?.toLowerCase() || '').includes(searchLower) ||
        (descente.n_fifafi?.toLowerCase() || '').includes(searchLower) ||
        (descente.nom_verbalisateur?.toLowerCase() || '').includes(searchLower) ||
        (descente.comm?.toLowerCase() || '').includes(searchLower) ||
        (descente.reference?.toLowerCase() || '').includes(searchLower)
      );
    });

    // Filtres supplémentaires
    if (activeFilter === 'with_pv') {
      filtered = filtered.filter(d => d.n_pv_pat && d.n_pv_pat !== '-');
    } else if (activeFilter === 'with_polygon') {
      filtered = filtered.filter(d => d.has_polygon);
    }

    return filtered;
  }, [descentes, searchTerm, activeFilter]);

  // Statistiques
  const stats = [
    { 
      label: 'Total', 
      value: descentes.length, 
      icon: 'clipboard-text',
      color: COLORS.primary
    },
    { 
      label: 'Avec PV', 
      value: descentes.filter(d => d.n_pv_pat && d.n_pv_pat !== '-').length, 
      icon: 'file-document',
      color: COLORS.success
    },
    { 
      label: 'Avec Polygone', 
      value: descentes.filter(d => d.has_polygon).length, 
      icon: 'map-marker',
      color: COLORS.secondary
    },
    { 
      label: 'En cours', 
      value: descentes.filter(d => d.statut_descente === 'En cours').length, 
      icon: 'clock',
      color: COLORS.warning
    }
  ];

  // Rendu d'un élément de la liste
  const renderDescenteItem = ({ item, index }: { item: Descente, index: number }) => {
    const descenteId = item.id || index + 1;
    const statusColor = item.statut_descente === 'Fini' ? COLORS.success : 
                       item.statut_descente === 'En cours' ? COLORS.warning : COLORS.textSecondary;

    return (
      <ModernCard style={styles.descenteItem}>
        {/* En-tête de la carte */}
        <View style={styles.itemHeader}>
          <View style={styles.itemIdContainer}>
            <Icon name="clipboard-text" size={16} color={COLORS.white} />
            <Text style={styles.itemId}>DS-{descenteId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.statut_descente || 'Non défini'}
            </Text>
          </View>
        </View>

        {/* Corps de la carte */}
        <View style={styles.itemBody}>
          {/* Informations principales */}
          <View style={styles.mainInfo}>
            <Text style={styles.verbalisateurName} numberOfLines={1}>
              {item.nom_verbalisateur || 'Non spécifié'}
            </Text>
            <Text style={styles.communeText} numberOfLines={1}>
              {item.comm || 'Non spécifié'} • {item.dist || 'Non spécifié'}
            </Text>
          </View>

          {/* Dates et heures */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Icon name="calendar" size={14} color={COLORS.textSecondary} />
              <Text style={styles.dateTimeText}>
                {formatDate(item.date)}
              </Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Icon name="clock" size={14} color={COLORS.textSecondary} />
              <Text style={styles.dateTimeText}>
                {formatTime(item.heure)}
              </Text>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {item.n_pv_pat && item.n_pv_pat !== '-' && (
              <ModernBadge 
                text={`PV: ${item.n_pv_pat}`} 
                color={COLORS.primary}
                icon="file-document"
              />
            )}
            {item.n_fifafi && item.n_fifafi !== '-' && (
              <ModernBadge 
                text={`FIFAFI: ${item.n_fifafi}`} 
                color={COLORS.success}
                icon="file-sign"
              />
            )}
            {item.has_polygon && (
              <ModernBadge 
                text="Polygone" 
                color={COLORS.secondary}
                icon="vector-polygon"
              />
            )}
          </View>

          {/* Infraction */}
          <Text style={styles.infractionPreview} numberOfLines={2}>
            {item.constat?.join(', ') || 'Aucune infraction spécifiée'}
          </Text>

          {/* Actions */}
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleViewDetails(item)}
              activeOpacity={0.7}
            >
              <Icon name="eye" size={18} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Voir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEdit(item)}
              activeOpacity={0.7}
            >
              <Icon name="pencil" size={18} color={COLORS.info} />
              <Text style={styles.actionButtonText}>Éditer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(descenteId)}
              activeOpacity={0.7}
            >
              <Icon name="trash-can-outline" size={18} color={COLORS.danger} />
              <Text style={styles.actionButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModernCard>
    );
  };

  // Filtres rapides
  const renderFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
      contentContainerStyle={styles.filtersContent}
    >
      {[
        { key: 'all', label: 'Toutes', icon: 'view-list' },
        { key: 'with_pv', label: 'Avec PV', icon: 'file-document' },
        { key: 'with_polygon', label: 'Avec Polygone', icon: 'map-marker' },
        { key: 'ongoing', label: 'En cours', icon: 'clock' }
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            activeFilter === filter.key && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(filter.key)}
          activeOpacity={0.7}
        >
          <Icon 
            name={filter.icon} 
            size={16} 
            color={activeFilter === filter.key ? COLORS.white : COLORS.textSecondary} 
          />
          <Text style={[
            styles.filterText,
            activeFilter === filter.key && styles.filterTextActive
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading && !refreshing) {
    return <ModernLoading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Barre de recherche avec bouton + */}
        <ModernSearchBar 
          value={searchTerm}
          onChangeText={setSearchTerm}
          onClear={() => setSearchTerm('')}
          onAddPress={handleAddDescente} // Utilisez la nouvelle fonction
        />

        {/* Statistiques */}
        <ModernStats stats={stats} />

        {/* Filtres rapides */}
        {renderFilters()}

        {/* Liste */}
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={60} color={COLORS.danger} />
            <Text style={styles.errorTitle}>Erreur</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchDescentes}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDescentes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={70} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchTerm ? 'Aucun résultat' : 'Aucune descente'}
            </Text>
            <Text style={styles.emptyMessage}>
              {searchTerm 
                ? 'Essayez d\'autres termes de recherche'
                : 'Commencez par créer votre première descente'
              }
            </Text>
            {!searchTerm && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleAddDescente} // Utilisez la même fonction
                activeOpacity={0.8}
              >
                <Icon name="plus" size={18} color={COLORS.white} />
                <Text style={styles.createButtonText}>Nouvelle descente</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>
              {filteredDescentes.length} descente{filteredDescentes.length > 1 ? 's' : ''}
            </Text>
            {filteredDescentes.map((item, index) => (
              <View key={`descente-${item.id || index}`}>
                {renderDescenteItem({ item, index })}
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* Modal de détails */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedDescente && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleSection}>
                    <Text style={styles.modalTitle}>Détails de la descente</Text>
                    <Text style={styles.modalSubtitle}>
                      DS-{selectedDescente.id} • {selectedDescente.reference}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowModal(false)}
                  >
                    <Icon name="close" size={26} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  {/* Sections de détails... */}
                  {/* (Même structure que précédemment mais avec les nouveaux styles) */}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Fermer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => {
                      setShowModal(false);
                      handleEdit(selectedDescente);
                    }}
                  >
                    <Icon name="pencil" size={18} color={COLORS.white} />
                    <Text style={styles.modalButtonPrimaryText}>Modifier</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Fonctions utilitaires
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR');
  } catch {
    return dateString;
  }
};

const formatTime = (timeString?: string) => {
  if (!timeString) return '-';
  return timeString;
};

const displayValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

// Styles (restent les mêmes)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Conteneur pour la barre de recherche et bouton +
  searchContainer: {
    marginTop: Platform.OS === 'ios' ? 10 : 20,
  },
  // Bouton + au-dessus de la recherche
  topAddButtonContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  floatingAddButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  clearButton: {
    padding: 4,
  },
  modernStatsContainer: {
    marginBottom: 16,
  },
  statsContent: {
    paddingHorizontal: 10,
    gap: 10,
  },
  // Statistiques réduites
  statCard: {
    width: 120,
    height: 120,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.extraBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  modernCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  descenteItem: {
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.primary,
  },
  itemIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemId: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  itemBody: {
    padding: 14,
  },
  mainInfo: {
    marginBottom: 14,
  },
  verbalisateurName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  communeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  modernBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  badgeIcon: {
    marginRight: 2,
  },
  modernBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  infractionPreview: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 14,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginHorizontal: 3,
  },
  viewButton: {
    backgroundColor: '#eef2ff',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.danger,
    marginTop: 14,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  modernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  listTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    gap: 10,
  },
  modalButtonPrimaryText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
  },
});