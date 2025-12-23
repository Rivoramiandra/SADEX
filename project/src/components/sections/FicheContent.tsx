import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, Filter, Download, Search, 
  ChevronLeft, ChevronRight, MoreVertical,
  Eye, Edit, Trash2, FileSignature,
  CheckCircle, XCircle, AlertCircle,
  FileWarning, FolderOpen, FolderCheck,
  Check, Save, Clock, Archive, FileCheck
} from 'lucide-react';

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
  dossiers_fournis_json?: string;
}

interface DossierManquant {
  nom: string;
  checked: boolean;
}

export default function FicheContent() {
  const [fts, setFts] = useState<FT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'tous' | 'complet' | 'incomplet' | 'aucun'>('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFt, setSelectedFt] = useState<FT | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // État pour le modal de complétion de dossier
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedFtForCompletion, setSelectedFtForCompletion] = useState<FT | null>(null);
  const [checkedDossiers, setCheckedDossiers] = useState<DossierManquant[]>([]);
  const [updatingFtId, setUpdatingFtId] = useState<number | null>(null);

  // Récupérer les FT depuis l'API
  const fetchFTs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString()
      });
      
      if (activeTab !== 'tous') {
        switch(activeTab) {
          case 'complet':
            params.append('statut_dossier', 'Complet');
            break;
          case 'incomplet':
            params.append('statut_dossier', 'Incomplet');
            break;
          case 'aucun':
            params.append('statut_dossier', 'Aucun dossier requis');
            break;
        }
      }
      
      const url = `http://localhost:3000/api/ft?${params.toString()}`;
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API response:', result);
      
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
        
        console.log('Processed FTs:', processedFts);
        setFts(processedFts);
        
        if (result.total !== undefined) {
          setTotalCount(result.total);
          setTotalPages(Math.ceil(result.total / pageSize));
        } else if (result.count !== undefined) {
          setTotalCount(result.count);
          setTotalPages(Math.ceil(result.count / pageSize));
        } else {
          setTotalCount(result.data.length);
          setTotalPages(Math.ceil(result.data.length / pageSize));
        }
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des FT:', err);
      setError(err.message);
      setFts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab]);

  // Initial fetch
  useEffect(() => {
    fetchFTs();
  }, [fetchFTs]);

  // Gérer le délai de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrer les FT
  const filteredFts = fts.filter(ft => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = (
        ft.reference_ft?.toLowerCase().includes(searchLower) ||
        ft.nom_convoquee?.toLowerCase().includes(searchLower) ||
        ft.nom_personne_r?.toLowerCase().includes(searchLower) ||
        ft.conclusion?.toLowerCase().includes(searchLower) ||
        ft.commune?.toLowerCase().includes(searchLower) ||
        ft.fokontany?.toLowerCase().includes(searchLower) ||
        ft.type_convoquee?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    if (activeTab !== 'tous') {
      switch(activeTab) {
        case 'complet':
          return ft.statut_dossier === 'Complet';
        case 'incomplet':
          return ft.statut_dossier === 'Incomplet';
        case 'aucun':
          return ft.statut_dossier === 'Aucun dossier requis';
        default:
          return true;
      }
    }

    return true;
  });

  // Calculer les dossiers manquants pour un FT
  const getDossiersManquants = (ft: FT): string[] => {
    if (ft.statut_dossier !== 'Incomplet' || !ft.dossier_a_fournir || !Array.isArray(ft.dossier_a_fournir)) {
      return [];
    }
    
    const dossiersRequis = ft.dossier_a_fournir;
    const dossiersFournis = ft.dossiers_fournis || [];
    
    return dossiersRequis
      .filter((dossier: string) => !dossiersFournis.includes(dossier));
  };

  // Ouvrir le modal de complétion
  const handleOpenCompleteModal = (ft: FT) => {
    const manquants = getDossiersManquants(ft);
    setSelectedFtForCompletion(ft);
    setCheckedDossiers(manquants.map(dossier => ({
      nom: dossier,
      checked: false
    })));
    setShowCompleteModal(true);
  };

  // Gérer le changement de case à cocher dans le modal
  const handleCheckboxChangeModal = (dossierIndex: number) => {
    setCheckedDossiers(prev => 
      prev.map((dossier, idx) => 
        idx === dossierIndex ? { ...dossier, checked: !dossier.checked } : dossier
      )
    );
  };

  // Valider les dossiers cochés
  const handleValidateDossiers = async () => {
    if (!selectedFtForCompletion) return;

    const dossiersCoches = checkedDossiers
      .filter(dossier => dossier.checked)
      .map(dossier => dossier.nom);

    if (dossiersCoches.length === 0) {
      alert('Veuillez cocher au moins un dossier fourni');
      return;
    }

    setUpdatingFtId(selectedFtForCompletion.id);
    
    try {
      const ft = selectedFtForCompletion;
      
      // Mettre à jour les dossiers fournis
      const currentDossiersFournis = ft.dossiers_fournis || [];
      const updatedDossiersFournis = [...currentDossiersFournis, ...dossiersCoches];
      
      // Calculer le nouveau statut du dossier
      const dossiersRequis = ft.dossier_a_fournir || [];
      
      const tousDossiersFournis = dossiersRequis.every((dossier: string) => 
        updatedDossiersFournis.includes(dossier)
      );
      
      const nouveauStatutDossier = tousDossiersFournis ? 'Complet' : 'Incomplet';

      console.log('Validation données:', {
        ftId: ft.id,
        dossiersCoches,
        currentDossiersFournis,
        updatedDossiersFournis,
        dossiersRequis,
        tousDossiersFournis,
        nouveauStatutDossier
      });

 const response = await fetch(`http://localhost:3000/api/ft/${ft.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    statut_dossier: nouveauStatutDossier,
    dossiers_fournis: updatedDossiersFournis
  })
});
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const result = await response.json();
      
      if (result.success) {
        // Mettre à jour localement
        setFts(prev => prev.map(f => 
          f.id === ft.id ? { ...f, dossiers_fournis: updatedDossiersFournis, statut_dossier: nouveauStatutDossier } : f
        ));
        
        // Fermer le modal et réinitialiser
        setShowCompleteModal(false);
        setSelectedFtForCompletion(null);
        setCheckedDossiers([]);
        
        alert(`Dossiers validés avec succès ! ${dossiersCoches.length} dossier(s) ajouté(s). Statut mis à jour: ${nouveauStatutDossier}`);
      } else {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      alert(`Erreur: ${err.message}`);
    } finally {
      setUpdatingFtId(null);
    }
  };

  // Calculer les statistiques
  const calculateStatistics = () => {
    const stats = {
      total: fts.length,
      complet: fts.filter(ft => ft.statut_dossier === 'Complet').length,
      incomplet: fts.filter(ft => ft.statut_dossier === 'Incomplet').length,
      aucun: fts.filter(ft => ft.statut_dossier === 'Aucun dossier requis').length
    };
    
    return stats;
  };

  const stats = calculateStatistics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Etabli':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Fini':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getDossierStatusColor = (status: string) => {
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

  const getDossierStatusIcon = (status: string) => {
    switch (status) {
      case 'Complet':
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'Incomplet':
        return <XCircle className="w-4 h-4 mr-1" />;
      case 'Aucun dossier requis':
        return <FileWarning className="w-4 h-4 mr-1" />;
      default:
        return <AlertCircle className="w-4 h-4 mr-1" />;
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

  const handleViewDetails = (ft: FT) => {
    setSelectedFt(ft);
    setShowDetailsModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce procès-verbal ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/ft/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Procès-verbal supprimé avec succès');
        fetchFTs();
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredFts;
    const headers = ['Référence', 'Date', 'Heure', 'Personne convoquée', 'Type', 'Commune', 'Fokontany', 'Statut', 'Statut Dossier'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(ft => [
        ft.reference_ft,
        formatDate(ft.date_ft),
        formatTime(ft.heure_ft),
        ft.nom_convoquee || ft.nom_personne_r || '',
        ft.type_convoquee || '',
        ft.commune || '',
        ft.fokontany || '',
        ft.statut || '',
        ft.statut_dossier || ''
      ].map(field => `"${field}"`).join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Procès-verbaux de Fin de Traitement</h1>
          <p className="text-slate-600">Gestion et consultation des procès-verbaux établis</p>
        </div>
       
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total des FT</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Dossiers Complets</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.complet}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Dossiers Incomplets</p>
              <p className="text-2xl font-bold text-amber-700">{stats.incomplet}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <XCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Aucun dossier requis</p>
              <p className="text-2xl font-bold text-slate-700">{stats.aucun}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <FileWarning className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Onglets et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Onglets */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('tous')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'tous' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tous les FT
            </button>
            <button
              onClick={() => setActiveTab('complet')}
              className={`px-4 py-2 font-medium transition-colors flex items-center ${activeTab === 'complet' 
                ? 'border-b-2 border-emerald-500 text-emerald-600' 
                : 'text-slate-600 hover:text-slate-900'}`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complets
            </button>
            <button
              onClick={() => setActiveTab('incomplet')}
              className={`px-4 py-2 font-medium transition-colors flex items-center ${activeTab === 'incomplet' 
                ? 'border-b-2 border-amber-500 text-amber-600' 
                : 'text-slate-600 hover:text-slate-900'}`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Incomplets
            </button>
            <button
              onClick={() => setActiveTab('aucun')}
              className={`px-4 py-2 font-medium transition-colors flex items-center ${activeTab === 'aucun' 
                ? 'border-b-2 border-slate-500 text-slate-600' 
                : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileWarning className="w-4 h-4 mr-2" />
              Aucun requis
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence, nom, commune..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtres supplémentaires */}
          <div className="flex flex-wrap gap-2">
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

            <button 
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={handleExport}
              disabled={filteredFts.length === 0}
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Tableau des FT */}
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
              onClick={fetchFTs}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        ) : filteredFts.length === 0 ? (
          <div className="text-center p-8">
            {activeTab === 'incomplet' ? (
              <FolderCheck className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            ) : activeTab === 'complet' ? (
              <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            ) : (
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm 
                ? 'Aucun procès-verbal trouvé' 
                : activeTab === 'complet'
                ? 'Aucun dossier complet'
                : activeTab === 'incomplet'
                ? 'Aucun dossier incomplet'
                : activeTab === 'aucun'
                ? 'Aucun dossier sans requisition'
                : 'Aucun procès-verbal enregistré'}
            </h3>
            <p className="text-slate-500">
              {searchTerm 
                ? 'Aucun procès-verbal ne correspond à vos critères de recherche.' 
                : 'Commencez par créer votre premier procès-verbal.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Référence
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Date/Heure
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Personne convoquée
                    </th>
                  
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Dossiers Manquants
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredFts.slice(startIndex, endIndex).map((ft) => {
                    const dossiersManquants = getDossiersManquants(ft);
                    const hasDossiersManquants = dossiersManquants.length > 0;
                    
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
                          <div className="text-xs text-slate-500 capitalize">{ft.type_convoquee}</div>
                        </td>
                       
                      
                        
                        <td className="px-6 py-4">
                          {hasDossiersManquants ? (
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-amber-700 mr-2">
                                {dossiersManquants.length} manquant(s)
                              </span>
                              <button
                                onClick={() => handleOpenCompleteModal(ft)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs transition-colors"
                                title="Compléter le dossier"
                              >
                                <FileCheck className="w-3 h-3" />
                                Compléter
                              </button>
                            </div>
                          ) : ft.statut_dossier === 'Incomplet' ? (
                            <span className="text-xs text-slate-400">Aucun dossier manquant</span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complet
                            </span>
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
                            <button
                              onClick={() => window.location.href = `/ft/editer/${ft.id}`}
                              className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ft.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                {searchTerm 
                  ? `Affichage de ${startIndex + 1} à ${endIndex} sur ${filteredFts.length} résultats filtrés`
                  : `Affichage de ${startIndex + 1} à ${endIndex} sur ${totalCount} résultats`}
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

      {/* Modal de complétion de dossier */}
      {showCompleteModal && selectedFtForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <FileCheck className="inline-block w-6 h-6 mr-2 text-amber-600" />
                  Compléter le dossier
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedFtForCompletion.reference_ft} • {selectedFtForCompletion.nom_convoquee || selectedFtForCompletion.nom_personne_r || 'Non spécifié'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDossierStatusColor(selectedFtForCompletion.statut_dossier)}`}>
                    {selectedFtForCompletion.statut_dossier}
                  </span>
                  {selectedFtForCompletion.delai_complement && selectedFtForCompletion.delai_complement > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                      Délai: {selectedFtForCompletion.delai_complement} jours
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedFtForCompletion(null);
                  setCheckedDossiers([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6">
              {/* Dossiers déjà fournis */}
              {selectedFtForCompletion.dossiers_fournis && selectedFtForCompletion.dossiers_fournis.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
                    Dossiers déjà fournis ({selectedFtForCompletion.dossiers_fournis.length})
                  </h3>
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedFtForCompletion.dossiers_fournis.map((dossier, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1.5" />
                          {dossier}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dossiers manquants */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <XCircle className="w-5 h-5 mr-2 text-amber-600" />
                    Dossiers manquants ({checkedDossiers.length})
                  </h3>
                  <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                    Cocher les dossiers maintenant fournis
                  </span>
                </div>
                
                {checkedDossiers.length > 0 ? (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="space-y-3">
                      {checkedDossiers.map((dossier, idx) => (
                        <div key={idx} className="flex items-center p-3 bg-white rounded-lg border border-amber-200">
                          <input
                            type="checkbox"
                            id={`dossier-${idx}`}
                            checked={dossier.checked}
                            onChange={() => handleCheckboxChangeModal(idx)}
                            className="h-5 w-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                          />
                          <label htmlFor={`dossier-${idx}`} className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-800 font-medium">{dossier.nom}</span>
                              {dossier.checked && (
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                                  À ajouter
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-600">
                          {checkedDossiers.filter(d => d.checked).length} dossier(s) sélectionné(s) sur {checkedDossiers.length}
                        </div>
                        <button
                          onClick={handleValidateDossiers}
                          disabled={updatingFtId === selectedFtForCompletion.id || checkedDossiers.filter(d => d.checked).length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingFtId === selectedFtForCompletion.id ? (
                            <>
                              <Clock className="w-4 h-4 animate-spin" />
                              Validation en cours...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Valider les dossiers cochés
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-emerald-700 mb-2">Aucun dossier manquant</h4>
                    <p className="text-slate-600">Tous les dossiers requis ont déjà été fournis.</p>
                  </div>
                )}
              </div>

              {/* Informations de suivi */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Informations</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
                    Les dossiers cochés seront ajoutés à la liste des dossiers fournis
                  </li>
                  <li className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
                    Si tous les dossiers sont fournis, le statut passera automatiquement à "Complet"
                  </li>
                  {selectedFtForCompletion.delai_complement && selectedFtForCompletion.delai_complement > 0 && (
                    <li className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-amber-500" />
                      Délai de complément: {selectedFtForCompletion.delai_complement} jours
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedFtForCompletion(null);
                  setCheckedDossiers([]);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleViewDetails(selectedFtForCompletion)}
                  className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir détails complets
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  onClick={() => {
                    window.location.href = `/ft/editer/${selectedFtForCompletion.id}`;
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier le procès-verbal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails amélioré */}
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
                  <div>
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
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statuts</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Statut du FT</div>
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedFt.statut)}`}>
                        {selectedFt.statut}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Statut du dossier</div>
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center ${getDossierStatusColor(selectedFt.statut_dossier)}`}>
                        {getDossierStatusIcon(selectedFt.statut_dossier)}
                        {selectedFt.statut_dossier || 'Non défini'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails du dossier */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">État du dossier</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  {selectedFt.dossier_a_fournir && Array.isArray(selectedFt.dossier_a_fournir) ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Dossiers requis ({selectedFt.dossier_a_fournir.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedFt.dossier_a_fournir.map((dossier, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm">
                              {dossier}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          Dossiers fournis ({selectedFt.dossiers_fournis?.length || 0}/{selectedFt.dossier_a_fournir.length}):
                        </p>
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
                      
                      {selectedFt.statut_dossier === 'Incomplet' && (
                        <div className="pt-3 border-t border-slate-200">
                          <div className="mb-2">
                            <p className="text-sm font-medium text-amber-700 mb-1">Dossiers manquants:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedFt.dossier_a_fournir
                                .filter((dossier: string) => !selectedFt.dossiers_fournis?.includes(dossier))
                                .map((dossier, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm flex items-center">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {dossier}
                                  </span>
                                ))}
                            </div>
                          </div>
                          
                          {selectedFt.delai_complement && selectedFt.delai_complement > 0 && (
                            <p className="text-sm text-amber-700">
                              <AlertCircle className="inline-block w-4 h-4 mr-1" />
                              Délai de complément: {selectedFt.delai_complement} jours
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">Aucune information de dossier disponible</p>
                  )}
                </div>
              </div>

              {/* Personne convoquée */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Personne convoquée</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-lg font-medium text-slate-900">{selectedFt.nom_convoquee || selectedFt.nom_personne_r || 'Non spécifié'}</div>
                  {selectedFt.commune || selectedFt.fokontany ? (
                    <div className="mt-2 text-sm text-slate-600">
                      {selectedFt.commune} {selectedFt.fokontany && `• ${selectedFt.fokontany}`}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Conclusion */}
              {selectedFt.conclusion && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Conclusion</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{selectedFt.conclusion}</p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations système</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Créé le:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedFt.created_at)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Descente ID:</dt>
                      <dd className="font-medium text-slate-900">DS-{selectedFt.iddescente}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Rendez-vous ID:</dt>
                      <dd className="font-medium text-slate-900">{selectedFt.idrendezvous ? `RDV-${selectedFt.idrendezvous}` : 'Non lié'}</dd>
                    </div>
                  </dl>
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
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                onClick={() => {
                  window.location.href = `/ft/editer/${selectedFt.id}`;
                }}
              >
                Modifier le procès-verbal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}