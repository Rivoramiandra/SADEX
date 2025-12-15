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
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFt, setSelectedFt] = useState<FT | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateAvisModal, setShowCreateAvisModal] = useState(false);
  const [selectedFtForAvis, setSelectedFtForAvis] = useState<FT | null>(null);
  const [avisList, setAvisList] = useState<AvisPaiement[]>([]);
  const [filtreAvis, setFiltreAvis] = useState<'tous' | 'avec_ap' | 'sans_ap'>('tous');
  
  // Récupérer les FT avec statut "Complet" depuis l'API
  const fetchFTsComplets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
        statut_dossier: 'Complet'  // Filtrer uniquement les dossiers complets
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
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
        
        if (result.total !== undefined) {
          setTotalCount(result.total);
          setTotalPages(Math.ceil(result.total / pageSize));
        } else {
          setTotalCount(result.data.length);
          setTotalPages(Math.ceil(result.data.length / pageSize));
        }
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des FT complets:', err);
      setError(err.message);
      setFts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  // Récupérer la liste des avis de paiement existants
  const fetchAvisList = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/avis-de-paiement');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvisList(result.data || []);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des avis de paiement:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFTsComplets();
    fetchAvisList();
  }, [fetchFTsComplets, fetchAvisList]);

  // Gérer le délai de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Vérifier si un avis existe déjà pour un FT
  const getAvisForFt = (ftId: number) => {
    return avisList.find(avis => avis.idft === ftId);
  };

  // Filtrer les FT (recherche locale + filtre AP)
  const filteredFts = fts.filter(ft => {
    // Filtre par recherche texte
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = (
        ft.reference_ft?.toLowerCase().includes(searchLower) ||
        ft.nom_convoquee?.toLowerCase().includes(searchLower) ||
        ft.nom_personne_r?.toLowerCase().includes(searchLower) ||
        ft.commune?.toLowerCase().includes(searchLower) ||
        ft.fokontany?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    // Filtre par présence d'avis de paiement
    const existingAvis = getAvisForFt(ft.id);
    
    switch (filtreAvis) {
      case 'avec_ap':
        return existingAvis !== undefined;
      case 'sans_ap':
        return existingAvis === undefined;
      default:
        return true; // 'tous'
    }
  });

  // Réinitialiser les filtres
  const resetFiltres = () => {
    setFiltreAvis('tous');
    setSearchTerm('');
    setPage(1);
  };

  // Ouvrir le modal pour créer un avis de paiement
  const handleOpenCreateAvisModal = (ft: FT) => {
    setSelectedFtForAvis(ft);
    setShowCreateAvisModal(true);
  };

  // Fermer le modal et rafraîchir les données après succès
  const handleAvisSuccess = () => {
    fetchAvisList();
    setShowCreateAvisModal(false);
    setSelectedFtForAvis(null);
  };

  // Calculer les statistiques
  const calculateStatistics = () => {
    const totalMontantAvis = avisList.reduce((sum, avis) => sum + avis.montant, 0);
    const totalPaye = avisList
      .filter(avis => avis.statut_paiement === 'Payé')
      .reduce((sum, avis) => sum + avis.montant, 0);
    const totalEnAttente = avisList
      .filter(avis => avis.statut_paiement === 'En attente')
      .reduce((sum, avis) => sum + avis.montant, 0);

    return {
      totalFT: fts.length,
      totalAvis: avisList.length,
      totalMontant: totalMontantAvis,
      totalPaye,
      totalEnAttente
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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Calculer les indices affichés
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredFts.length);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Avis de paiement</h1>
        <p className="text-slate-600">Gestion des paiements et transactions financières</p>
        <p className="text-sm text-slate-500 mt-1">
          Cette section affiche uniquement les procès-verbaux avec dossier complet
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <p className="text-sm text-slate-600">Total collecté</p>
              <p className="text-2xl font-bold text-slate-900">{formatMontant(stats.totalMontant)} Ar</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <DollarSign className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Montant payé</p>
              <p className="text-2xl font-bold text-green-600">{formatMontant(stats.totalPaye)} Ar</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Montant en attente</p>
              <p className="text-2xl font-bold text-orange-600">{formatMontant(stats.totalEnAttente)} Ar</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence FT, nom, commune..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtres supplémentaires */}
          <div className="flex flex-wrap gap-2">
            {/* Filtre pour AP */}
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filtreAvis}
              onChange={(e) => {
                setFiltreAvis(e.target.value as 'tous' | 'avec_ap' | 'sans_ap');
                setPage(1);
              }}
            >
              <option value="tous">Tous les FT</option>
              <option value="avec_ap">FT avec AP</option>
              <option value="sans_ap">FT sans AP</option>
            </select>

            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value="5">5 par page</option>
              <option value="10">10 par page</option>
              <option value="20">20 par page</option>
              <option value="50">50 par page</option>
            </select>

            {(filtreAvis !== 'tous' || searchTerm) && (
              <button
                onClick={resetFiltres}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Réinitialiser
              </button>
            )}

            <button 
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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

        {/* Tableau des FT avec dossier complet */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement des procès-verbaux...</p>
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
        ) : filteredFts.length === 0 ? (
          <div className="text-center p-8">
            {searchTerm || filtreAvis !== 'tous' ? (
              <FileWarning className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            ) : (
              <FolderCheck className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm || filtreAvis !== 'tous'
                ? 'Aucun procès-verbal trouvé' 
                : 'Aucun procès-verbal avec dossier complet'}
            </h3>
            <p className="text-slate-500">
              {searchTerm || filtreAvis !== 'tous'
                ? `Aucun procès-verbal ne correspond à vos critères${filtreAvis !== 'tous' ? ` (${filtreAvis === 'avec_ap' ? 'avec AP' : 'sans AP'})` : ''}.`
                : 'Tous les procès-verbaux disponibles ont des dossiers incomplets ou aucun dossier requis.'}
            </p>
            {(searchTerm || filtreAvis !== 'tous') && (
              <button
                onClick={resetFiltres}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
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
                      <div className="flex items-center gap-1">
                        Avis existant
                        {filtreAvis !== 'tous' && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded">
                            {filtreAvis === 'avec_ap' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredFts.slice(startIndex, endIndex).map((ft) => {
                    const existingAvis = getAvisForFt(ft.id);
                    
                    return (
                      <tr key={ft.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mr-3">
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
                        <td className="px-6 py-4">
                          {existingAvis ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">{existingAvis.num_ap}</span>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPaiementStatusColor(existingAvis.statut_paiement)}`}>
                                {existingAvis.statut_paiement}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Aucun avis</span>
                          )}
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
                            {!existingAvis && (
                              <button
                                onClick={() => handleOpenCreateAvisModal(ft)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                title="Créer avis de paiement"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-600">
                {searchTerm || filtreAvis !== 'tous' 
                  ? `Affichage de ${startIndex + 1} à ${endIndex} sur ${filteredFts.length} résultats filtrés`
                  : `Affichage de ${startIndex + 1} à ${endIndex} sur ${totalCount} résultats`}
                {filtreAvis !== 'tous' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {filtreAvis === 'avec_ap' ? 'FT avec AP' : 'FT sans AP'}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg border transition-colors ${page === pageNum 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tableau des avis de paiement existants */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Avis de paiement émis</h2>
          <p className="text-slate-600 text-sm">Liste des avis de paiement déjà créés</p>
        </div>
        
        {avisList.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun avis de paiement</h3>
            <p className="text-slate-500">Créez votre premier avis de paiement à partir d'un procès-verbal complet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">N° AP</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Référence FT</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Montant</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {avisList.map((avis) => {
                  const ft = fts.find(f => f.id === avis.idft);
                  
                  return (
                    <tr key={avis.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-slate-900">{avis.num_ap}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-700">
                          {ft?.reference_ft || `FT-${avis.idft}`}
                        </div>
                        {ft?.nom_convoquee && (
                          <div className="text-xs text-slate-500">{ft.nom_convoquee}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-900">{formatMontant(avis.montant)} Ar</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{formatDate(avis.date_ap)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getPaiementStatusColor(avis.statut_paiement)}`}>
                          {avis.statut_paiement === 'Payé' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : avis.statut_paiement === 'En attente' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {avis.statut_paiement}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Détails
                          </button>
                          <button className="text-emerald-600 hover:text-emerald-800 text-sm">
                            Modifier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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