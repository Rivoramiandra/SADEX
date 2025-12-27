import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, DollarSign, Calendar, CheckCircle, Clock, XCircle,
  FileText, Plus, Filter, Download, Search, 
  ChevronLeft, ChevronRight, MoreVertical,
  Eye, Edit, Trash2, FileSignature,
  AlertCircle, FileWarning, FolderOpen, FolderCheck,
  Check, Save, Archive, FileCheck, Users, MapPin
} from 'lucide-react';
import FaireAp from './FaireAp';

interface FT {
  id: number;
  reference_ft: string;
  date_ft: string;
  heure_ft: string;
  type_convoquee: string;
  nom_convoquee: string;
  statut: string;
  statut_dossier: string;
  conclusion: string;
  iddescente: number;
  idrendezvous: number;
  created_at: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  dossier?: {
    dossiers_fournis: string[];
    dossier_a_fournir: string[];
    statut_dossier: string;
    conclusion: string;
    delai_complement: number;
  };
  dossiers_fournis?: string[];
  dossier_a_fournir?: string[];
  delai_complement?: number;
}

interface AvisPaiement {
  id: number;
  num_ap: string;
  date_ap: string;
  montant: number;
  montant_lettre: string;
  statut_paiement: 'Payé' | 'En attente' | 'Retard';
  methode_paiement: string;
  description: string;
  idft: number;
  iddescente: number;
}

export default function AvisContent() {
  const [fts, setFts] = useState<FT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTermSansAP, setSearchTermSansAP] = useState('');
  const [searchTermAvecAP, setSearchTermAvecAP] = useState('');
  const [pageSansAP, setPageSansAP] = useState(1);
  const [pageAvecAP, setPageAvecAP] = useState(1);
  const [totalPagesSansAP, setTotalPagesSansAP] = useState(1);
  const [totalPagesAvecAP, setTotalPagesAvecAP] = useState(1);
  const [pageSizeSansAP, setPageSizeSansAP] = useState(10);
  const [pageSizeAvecAP, setPageSizeAvecAP] = useState(10);
  const [selectedFt, setSelectedFt] = useState<FT | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateAvisModal, setShowCreateAvisModal] = useState(false);
  const [selectedFtForAvis, setSelectedFtForAvis] = useState<FT | null>(null);
  const [avisList, setAvisList] = useState<AvisPaiement[]>([]);
  const [loadingAvis, setLoadingAvis] = useState(false);
  
  // Récupérer les FT avec statut "Complet" depuis l'API
  const fetchFTsComplets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer tous les FT complets (sans pagination pour avoir tous les résultats)
      const params = new URLSearchParams({
        statut_dossier: 'Complet'  // Filtrer uniquement les dossiers complets
      });
      
      const url = `http://localhost:3000/api/ft?${params.toString()}`;
      console.log('Fetching FT complets from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const ftsData = result.data || [];
        
        // Traiter les données pour extraire les informations des dossiers
        const processedFts = ftsData.map((ft: any) => {
          // Parser le champ dossier s'il est une chaîne
          let dossierObj = ft.dossier;
          if (typeof ft.dossier === 'string') {
            try {
              dossierObj = JSON.parse(ft.dossier);
            } catch (e) {
              dossierObj = {};
            }
          }
          
          return {
            ...ft,
            statut_dossier: ft.statut_dossier || (dossierObj?.statut_dossier || 'Non défini'),
            dossiers_fournis: ft.dossiers_fournis || (dossierObj?.dossiers_fournis || []),
            dossier_a_fournir: ft.dossier_a_fournir || (dossierObj?.dossier_a_fournir || []),
            delai_complement: ft.delai_complement || (dossierObj?.delai_complement || 0)
          };
        });
        
        setFts(processedFts);
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des FT complets:', err);
      setError(err.message);
      setFts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer la liste des avis de paiement existants
  const fetchAvisList = useCallback(async () => {
    try {
      setLoadingAvis(true);
      const response = await fetch('http://localhost:3000/api/avis-de-paiement');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvisList(result.data || []);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des avis de paiement:', error);
    } finally {
      setLoadingAvis(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFTsComplets();
    fetchAvisList();
  }, [fetchFTsComplets, fetchAvisList]);

  // Gérer le délai de recherche pour FT sans AP
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTermSansAP !== '') {
        setPageSansAP(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTermSansAP]);

  // Gérer le délai de recherche pour FT avec AP
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTermAvecAP !== '') {
        setPageAvecAP(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTermAvecAP]);

  // Vérifier si un avis existe déjà pour un FT
  const getAvisForFt = (ftId: number) => {
    return avisList.find(avis => avis.idft === ftId);
  };

  // Réinitialiser les filtres pour FT sans AP
  const resetFiltresSansAP = () => {
    setSearchTermSansAP('');
    setPageSansAP(1);
    setPageSizeSansAP(10);
  };

  // Réinitialiser les filtres pour FT avec AP
  const resetFiltresAvecAP = () => {
    setSearchTermAvecAP('');
    setPageAvecAP(1);
    setPageSizeAvecAP(10);
  };

  // Ouvrir le modal pour créer un avis de paiement
  const handleOpenCreateAvisModal = (ft: FT) => {
    setSelectedFtForAvis(ft);
    setShowCreateAvisModal(true);
  };

  // Fermer le modal et rafraîchir les données après succès
  const handleAvisSuccess = () => {
    fetchAvisList();
    fetchFTsComplets();
    setShowCreateAvisModal(false);
    setSelectedFtForAvis(null);
  };

  // Calculer les statistiques (comptes seulement, pas de montants)
  const calculateStatistics = () => {
    const ftAvecAP = fts.filter(ft => getAvisForFt(ft.id) !== undefined);
    const ftSansAP = fts.filter(ft => getAvisForFt(ft.id) === undefined);
    
    const avisPayes = avisList.filter(avis => avis.statut_paiement === 'Payé');
    const avisEnAttente = avisList.filter(avis => avis.statut_paiement === 'En attente');
    const avisRetard = avisList.filter(avis => avis.statut_paiement === 'Retard');

    return {
      totalFT: fts.length,
      totalAvis: avisList.length,
      ftAvecAP: ftAvecAP.length,
      ftSansAP: ftSansAP.length,
      avisPayes: avisPayes.length,
      avisEnAttente: avisEnAttente.length,
      avisRetard: avisRetard.length
    };
  };

  const stats = calculateStatistics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complet':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Incomplet':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Aucun dossier requis':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPaiementStatusColor = (status: string) => {
    switch (status) {
      case 'Payé':
        return 'bg-green-100 text-green-800';
      case 'En attente':
        return 'bg-orange-100 text-orange-800';
      case 'Retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
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

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const handleViewDetails = (ft: FT) => {
    setSelectedFt(ft);
    setShowDetailsModal(true);
  };

  const handlePageSizeChangeSansAP = (newSize: number) => {
    setPageSizeSansAP(newSize);
    setPageSansAP(1);
  };

  const handlePageSizeChangeAvecAP = (newSize: number) => {
    setPageSizeAvecAP(newSize);
    setPageAvecAP(1);
  };

  // FT sans AP (pour le tableau du haut)
  const ftSansAP = fts.filter(ft => !getAvisForFt(ft.id));
  const filteredFtSansAP = ftSansAP.filter(ft => {
    if (searchTermSansAP.trim()) {
      const searchLower = searchTermSansAP.toLowerCase().trim();
      return (
        ft.reference_ft?.toLowerCase().includes(searchLower) ||
        ft.nom_convoquee?.toLowerCase().includes(searchLower) ||
        ft.nom_personne_r?.toLowerCase().includes(searchLower) ||
        ft.commune?.toLowerCase().includes(searchLower) ||
        ft.fokontany?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // FT avec AP (pour le tableau du bas)
  const ftAvecAP = fts.filter(ft => getAvisForFt(ft.id) !== undefined);
  const filteredFtAvecAP = ftAvecAP.filter(ft => {
    if (searchTermAvecAP.trim()) {
      const searchLower = searchTermAvecAP.toLowerCase().trim();
      return (
        ft.reference_ft?.toLowerCase().includes(searchLower) ||
        ft.nom_convoquee?.toLowerCase().includes(searchLower) ||
        ft.nom_personne_r?.toLowerCase().includes(searchLower) ||
        ft.commune?.toLowerCase().includes(searchLower) ||
        ft.fokontany?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Calculer les indices affichés pour FT sans AP
  const startIndexSansAP = (pageSansAP - 1) * pageSizeSansAP;
  const endIndexSansAP = Math.min(startIndexSansAP + pageSizeSansAP, filteredFtSansAP.length);
  const totalPagesSansAPCalculated = Math.ceil(filteredFtSansAP.length / pageSizeSansAP);

  // Calculer les indices affichés pour FT avec AP
  const startIndexAvecAP = (pageAvecAP - 1) * pageSizeAvecAP;
  const endIndexAvecAP = Math.min(startIndexAvecAP + pageSizeAvecAP, filteredFtAvecAP.length);
  const totalPagesAvecAPCalculated = Math.ceil(filteredFtAvecAP.length / pageSizeAvecAP);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Avis de paiement</h1>
        <p className="text-slate-600">Gestion des paiements et transactions financières</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">FT avec dossier complet</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalFT}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avis de paiement émis</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalAvis}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">FT sans AP</p>
              <p className="text-2xl font-bold text-amber-600">{stats.ftSansAP}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">FT avec AP</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.ftAvecAP}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Receipt className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: FT sans Avis de Paiement (Tableau du haut) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
               Avis de Paiement en cours
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  {stats.ftSansAP}
                </span>
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Procès-verbaux complets nécessitant un avis de paiement
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                onClick={() => {
                  fetchFTsComplets();
                  fetchAvisList();
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Barre de recherche et filtres pour FT sans AP */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher des FT sans AP par référence, nom, commune..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={searchTermSansAP}
                onChange={(e) => setSearchTermSansAP(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={pageSizeSansAP}
                onChange={(e) => handlePageSizeChangeSansAP(Number(e.target.value))}
              >
                <option value="5">5 par page</option>
                <option value="10">10 par page</option>
                <option value="20">20 par page</option>
                <option value="50">50 par page</option>
              </select>

              {searchTermSansAP && (
                <button
                  onClick={resetFiltresSansAP}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Tableau des FT sans AP */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Chargement des FT sans avis de paiement...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 font-medium">Erreur: {error}</p>
              <button 
                onClick={fetchFTsComplets}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Réessayer
              </button>
            </div>
          ) : filteredFtSansAP.length === 0 ? (
            <div className="text-center p-8">
              {searchTermSansAP ? (
                <FileWarning className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              ) : (
                <FolderCheck className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchTermSansAP
                  ? 'Aucun FT sans avis de paiement trouvé' 
                  : 'Tous les FT ont un avis de paiement'}
              </h3>
              <p className="text-slate-500">
                {searchTermSansAP
                  ? 'Aucun FT sans avis de paiement ne correspond à votre recherche.'
                  : 'Tous les procès-verbaux complets ont déjà un avis de paiement associé.'}
              </p>
              {searchTermSansAP && (
                <button
                  onClick={resetFiltresSansAP}
                  className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-amber-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Référence FT
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date/Heure
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Personne convoquée
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Localisation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Statut Dossier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredFtSansAP.slice(startIndexSansAP, endIndexSansAP).map((ft) => (
                      <tr key={ft.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3">
                              <FileSignature className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{ft.reference_ft}</div>
                              <div className="text-xs text-slate-500">DS-{ft.iddescente}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatDate(ft.date_ft)}</div>
                          <div className="text-xs text-slate-500">{formatTime(ft.heure_ft)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{ft.nom_convoquee || ft.nom_personne_r || 'Non spécifié'}</div>
                          <div className="text-xs text-slate-500 capitalize">{ft.type_convoquee || 'Non spécifié'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {ft.commune || 'N/A'} {ft.fokontany && `- ${ft.fokontany}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ft.statut_dossier)}`}>
                            {ft.statut_dossier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(ft)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenCreateAvisModal(ft)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                              title="Créer avis de paiement"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination pour FT sans AP */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  {searchTermSansAP 
                    ? `Affichage de ${startIndexSansAP + 1} à ${endIndexSansAP} sur ${filteredFtSansAP.length} résultats filtrés`
                    : `Affichage de ${startIndexSansAP + 1} à ${endIndexSansAP} sur ${ftSansAP.length} résultats`}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPageSansAP(prev => Math.max(1, prev - 1))}
                    disabled={pageSansAP === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPagesSansAPCalculated) }, (_, i) => {
                    let pageNum;
                    if (totalPagesSansAPCalculated <= 5) {
                      pageNum = i + 1;
                    } else if (pageSansAP <= 3) {
                      pageNum = i + 1;
                    } else if (pageSansAP >= totalPagesSansAPCalculated - 2) {
                      pageNum = totalPagesSansAPCalculated - 4 + i;
                    } else {
                      pageNum = pageSansAP - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPageSansAP(pageNum)}
                        className={`w-10 h-10 rounded-lg border transition-colors ${pageSansAP === pageNum 
                          ? 'bg-amber-500 text-white border-amber-500' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPageSansAP(prev => Math.min(totalPagesSansAPCalculated, prev + 1))}
                    disabled={pageSansAP === totalPagesSansAPCalculated}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: FT avec Avis de Paiement (Tableau du bas) - MODIFIÉ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Avis de paiement émis
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                  {stats.ftAvecAP}
                </span>
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Procès-verbaux complets avec avis de paiement associé
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                onClick={() => {
                  fetchFTsComplets();
                  fetchAvisList();
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Barre de recherche et filtres pour FT avec AP */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher des FT avec AP par référence, nom, commune..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTermAvecAP}
                onChange={(e) => setSearchTermAvecAP(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={pageSizeAvecAP}
                onChange={(e) => handlePageSizeChangeAvecAP(Number(e.target.value))}
              >
                <option value="5">5 par page</option>
                <option value="10">10 par page</option>
                <option value="20">20 par page</option>
                <option value="50">50 par page</option>
              </select>

              {searchTermAvecAP && (
                <button
                  onClick={resetFiltresAvecAP}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Tableau des FT avec AP - NOUVELLE ORGANISATION */}
          {loadingAvis ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Chargement des FT avec avis de paiement...</p>
              </div>
            </div>
          ) : filteredFtAvecAP.length === 0 ? (
            <div className="text-center p-8">
              {searchTermAvecAP ? (
                <FileWarning className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              ) : (
                <Receipt className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchTermAvecAP
                  ? 'Aucun FT avec avis de paiement trouvé' 
                  : 'Aucun FT avec avis de paiement'}
              </h3>
              <p className="text-slate-500">
                {searchTermAvecAP
                  ? 'Aucun FT avec avis de paiement ne correspond à votre recherche.'
                  : 'Créez votre premier avis de paiement à partir d\'un procès-verbal complet.'}
              </p>
              {searchTermAvecAP && (
                <button
                  onClick={resetFiltresAvecAP}
                  className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Référence FT
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Personne convoquée
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Localisation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Avis de Paiement
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date AP
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Montant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredFtAvecAP.slice(startIndexAvecAP, endIndexAvecAP).map((ft) => {
                      const existingAvis = getAvisForFt(ft.id);
                      
                      return (
                        <tr key={ft.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                                <FileSignature className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{ft.reference_ft}</div>
                                <div className="text-xs text-slate-500">
                                  {formatDate(ft.date_ft)} {formatTime(ft.heure_ft)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{ft.nom_convoquee || ft.nom_personne_r || 'Non spécifié'}</div>
                            <div className="text-xs text-slate-500 capitalize">{ft.type_convoquee || 'Non spécifié'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {ft.commune || 'N/A'} {ft.fokontany && `- ${ft.fokontany}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {existingAvis && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <Receipt className="w-3 h-3 text-indigo-600" />
                                  <span className="text-xs font-medium text-indigo-700">{existingAvis.num_ap}</span>
                                </div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPaiementStatusColor(existingAvis.statut_paiement)}`}>
                                  {existingAvis.statut_paiement === 'Payé' ? (
                                    <CheckCircle className="w-2.5 h-2.5" />
                                  ) : existingAvis.statut_paiement === 'En attente' ? (
                                    <Clock className="w-2.5 h-2.5" />
                                  ) : (
                                    <XCircle className="w-2.5 h-2.5" />
                                  )}
                                  {existingAvis.statut_paiement}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {existingAvis && (
                              <div className="text-sm text-slate-900">
                                {formatDate(existingAvis.date_ap)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {existingAvis && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-semibold text-slate-900">
                                  {formatMontant(existingAvis.montant)} Ar
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(ft)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Voir détails du FT"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                             
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination pour FT avec AP */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  {searchTermAvecAP 
                    ? `Affichage de ${startIndexAvecAP + 1} à ${endIndexAvecAP} sur ${filteredFtAvecAP.length} résultats filtrés`
                    : `Affichage de ${startIndexAvecAP + 1} à ${endIndexAvecAP} sur ${ftAvecAP.length} résultats`}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPageAvecAP(prev => Math.max(1, prev - 1))}
                    disabled={pageAvecAP === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPagesAvecAPCalculated) }, (_, i) => {
                    let pageNum;
                    if (totalPagesAvecAPCalculated <= 5) {
                      pageNum = i + 1;
                    } else if (pageAvecAP <= 3) {
                      pageNum = i + 1;
                    } else if (pageAvecAP >= totalPagesAvecAPCalculated - 2) {
                      pageNum = totalPagesAvecAPCalculated - 4 + i;
                    } else {
                      pageNum = pageAvecAP - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPageAvecAP(pageNum)}
                        className={`w-10 h-10 rounded-lg border transition-colors ${pageAvecAP === pageNum 
                          ? 'bg-indigo-500 text-white border-indigo-500' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPageAvecAP(prev => Math.min(totalPagesAvecAPCalculated, prev + 1))}
                    disabled={pageAvecAP === totalPagesAvecAPCalculated}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals restent inchangés */}
      {/* Modal de création d'avis de paiement */}
      {showCreateAvisModal && selectedFtForAvis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Receipt className="inline-block w-6 h-6 mr-2 text-emerald-600" />
                  Créer un avis de paiement
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedFtForAvis.reference_ft} • {selectedFtForAvis.nom_convoquee || selectedFtForAvis.nom_personne_r || 'Non spécifié'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateAvisModal(false);
                  setSelectedFtForAvis(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <FaireAp 
                ft={{
            id: selectedFtForAvis.id,
            reference_ft: selectedFtForAvis.reference_ft,
            iddescente: selectedFtForAvis.iddescente,
            // Passer toutes les données nécessaires
            nom_convoquee: selectedFtForAvis.nom_convoquee,
            nom_personne_r: selectedFtForAvis.nom_personne_r,
            commune: selectedFtForAvis.commune,
            fokontany: selectedFtForAvis.fokontany,
            date_ft: selectedFtForAvis.date_ft,
            heure_ft: selectedFtForAvis.heure_ft,
            // Autres champs si nécessaires
            ...selectedFtForAvis
          }}
                onClose={() => {
                  setShowCreateAvisModal(false);
                  setSelectedFtForAvis(null);
                }}
                onSuccess={handleAvisSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails du FT */}
      {showDetailsModal && selectedFt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  <FileSignature className="inline-block w-6 h-6 mr-2 text-blue-600" />
                  Détails du procès-verbal
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedFt.reference_ft} • DS-{selectedFt.iddescente}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations générales</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Référence:</dt>
                      <dd className="font-medium text-slate-900">{selectedFt.reference_ft}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Date:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedFt.date_ft)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Heure:</dt>
                      <dd className="font-medium text-slate-900">{formatTime(selectedFt.heure_ft)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Type convoquée:</dt>
                      <dd className="font-medium text-slate-900 capitalize">{selectedFt.type_convoquee || 'Non spécifié'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Personne et Localisation</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Personne convoquée:</dt>
                      <dd className="font-medium text-slate-900">{selectedFt.nom_convoquee || selectedFt.nom_personne_r || 'Non spécifié'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Commune:</dt>
                      <dd className="font-medium text-slate-900">{selectedFt.commune || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Fokontany:</dt>
                      <dd className="font-medium text-slate-900">{selectedFt.fokontany || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* État du dossier */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">État du dossier</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedFt.statut_dossier)}`}>
                      {selectedFt.statut_dossier}
                    </span>
                    {selectedFt.delai_complement && selectedFt.delai_complement > 0 && (
                      <span className="text-sm text-amber-700">
                        Délai de complément: {selectedFt.delai_complement} jours
                      </span>
                    )}
                  </div>
                  
                  {selectedFt.dossier_a_fournir && Array.isArray(selectedFt.dossier_a_fournir) && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Dossiers requis:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedFt.dossier_a_fournir.map((dossier, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm">
                              {dossier}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Dossiers fournis:</p>
                        {selectedFt.dossiers_fournis && selectedFt.dossiers_fournis.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedFt.dossiers_fournis.map((dossier, idx) => (
                              <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {dossier}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">Aucun dossier fourni</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
              {!getAvisForFt(selectedFt.id) && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenCreateAvisModal(selectedFt);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Créer un avis de paiement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ajout de l'icône RefreshCw manquante
function RefreshCw(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}