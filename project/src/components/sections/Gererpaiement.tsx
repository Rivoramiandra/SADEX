import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, CreditCard, Banknote, Phone, TrendingUp,
  Download, Eye, Trash2, Edit, Plus, Filter, Search, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Clock, FileText, User,
  ChevronLeft, ChevronRight, MoreVertical, Printer, X,
  Building, Receipt, CreditCard as CardIcon, Smartphone,
  TrendingDown, Percent, Layers, Hash, PieChart
} from 'lucide-react';
import Completerpaiement from './Completerpaiement';
import PaiementContent from './PaiementContent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function Gererpaiement() {
  const [paiements, setPaiements] = useState([]);
  const [paiementsComplets, setPaiementsComplets] = useState([]);
  const [paiementsPartiels, setPaiementsPartiels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermPartiel, setSearchTermPartiel] = useState('');
  const [page, setPage] = useState(1);
  const [pagePartiel, setPagePartiel] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPagesPartiel, setTotalPagesPartiel] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [stats, setStats] = useState({
    total_paiements: 0,
    total_montant: 0,
    paiements_aujourdhui: 0,
    montant_aujourdhui: 0,
    paiements_complets: 0,
    paiements_partiels: 0,
    paiements_en_tranches: 0,
    montant_en_attente: 0,
    espece: 0,
    virement: 0,
    mobile_money: 0,
    carte_bancaire: 0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paiementToDelete, setPaiementToDelete] = useState(null);
  const [showCompleterModal, setShowCompleterModal] = useState(false);
  const [paiementToComplete, setPaiementToComplete] = useState(null);
  const API_BASE_URL = 'http://localhost:3000/api';
  // Récupérer la liste des paiements
  const fetchPaiements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `${API_BASE_URL}/paiements`;
     
      const response = await fetch(url);
     
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
     
      if (result.success) {
        const paiementsData = result.data || [];
        console.log('✅ Paiements récupérés:', paiementsData);
       
        // Classification améliorée des paiements
        const complets = paiementsData.filter(p => {
          const statut = p.statut?.toLowerCase();
          const montantRestant = parseFloat(p.montant_reste) || 0;
         
          // Paiement considéré comme complet si :
          // 1. Statut est "payé", "complet", "terminé"
          // 2. Montant restant est 0 ou null
          // 3. C'est la dernière tranche
          const estComplet =
            statut === 'payé' ||
            statut === 'complet' ||
            statut === 'terminé' ||
            montantRestant === 0 ||
            (p.nombre_tranche && p.nombre_tranche > 0 && p.numero_tranche === p.nombre_tranche);
         
          return estComplet;
        });
       
        const partiels = paiementsData.filter(p => {
          const statut = p.statut?.toLowerCase();
          const montantRestant = parseFloat(p.montant_reste) || 0;
         
          // Paiement considéré comme partiel si :
          // 1. Statut est "partiel", "partiellement payé", "en cours"
          // 2. Montant restant > 0
          // 3. Ce n'est pas la dernière tranche
          const estPartiel =
            statut === 'partiel' ||
            statut === 'partiellement payé' ||
            statut === 'en cours' ||
            montantRestant > 0 ||
            (p.nombre_tranche && p.nombre_tranche > 0 && p.numero_tranche < p.nombre_tranche);
         
          return estPartiel;
        });
        console.log('📊 Paiements complets:', complets.length);
        console.log('📊 Paiements partiels:', partiels.length);
       
        // Mettre à jour les statistiques
        const totalMontant = paiementsData.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
        const montantEnAttente = partiels.reduce((sum, p) => sum + (parseFloat(p.montant_reste) || 0), 0);
       
        setStats(prev => ({
          ...prev,
          total_paiements: paiementsData.length,
          total_montant: totalMontant,
          paiements_complets: complets.length,
          paiements_partiels: partiels.length,
          montant_en_attente: montantEnAttente
        }));
        setPaiements(paiementsData);
        setPaiementsComplets(complets);
        setPaiementsPartiels(partiels);
        setTotalPages(Math.ceil(complets.length / pageSize));
        setTotalPagesPartiel(Math.ceil(partiels.length / pageSize));
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des paiements:', err);
      setError(err.message);
      setPaiements([]);
      setPaiementsComplets([]);
      setPaiementsPartiels([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);
  // Récupérer les statistiques
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/paiements/stats`);
     
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }
      const result = await response.json();
     
      if (result.success) {
        console.log('📊 Statistiques récupérées:', result.data);
        setStats(prev => ({
          ...prev,
          ...result.data
        }));
      } else {
        console.warn('⚠️ Réponse API sans succès pour stats:', result);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques:', error);
    }
  }, []);
  // Initial fetch
  useEffect(() => {
    fetchPaiements();
  }, [fetchPaiements]);
  useEffect(() => {
    if (paiements.length > 0) {
      fetchStats();
    }
  }, [paiements, fetchStats]);
  // Calculer le pourcentage payé pour un paiement partiel
  const calculatePourcentagePaye = (paiement) => {
    if (!paiement) return 0;
   
    const montantTotal = parseFloat(paiement.montant_total) ||
                        (parseFloat(paiement.montant) + parseFloat(paiement.montant_reste || 0));
    const montantPaye = parseFloat(paiement.montant) || 0;
   
    if (montantTotal > 0) {
      return Math.round((montantPaye / montantTotal) * 100);
    }
   
    return 0;
  };
  // Calculer les informations de tranches
  const getTranchesInfo = (paiement) => {
    const nombreTranche = paiement.nombre_tranche || 1;
    const numeroTranche = paiement.numero_tranche || 1;
   
    return {
      nombreTranche,
      numeroTranche,
      estPremiereTranche: numeroTranche === 1,
      estDerniereTranche: numeroTranche === nombreTranche,
      progres: nombreTranche > 1 ? Math.round((numeroTranche / nombreTranche) * 100) : 100
    };
  };
  // Filtrer les paiements complets
  const filteredPaiementsComplets = paiementsComplets.filter(paiement => {
    const searchLower = searchTerm.toLowerCase();
   
    return searchTerm === '' ||
      (paiement.reference && paiement.reference.toLowerCase().includes(searchLower)) ||
      (paiement.contact && paiement.contact.toLowerCase().includes(searchLower)) ||
      (paiement.mode_paiement && paiement.mode_paiement.toLowerCase().includes(searchLower)) ||
      (paiement.num_ap && paiement.num_ap.toLowerCase().includes(searchLower)) ||
      (paiement.reference_ft && paiement.reference_ft.toLowerCase().includes(searchLower)) ||
      (paiement.nom_convoquee && paiement.nom_convoquee.toLowerCase().includes(searchLower)) ||
      `#${paiement.idpaiement}`.includes(searchLower);
  });
  // Filtrer les paiements partiels
  const filteredPaiementsPartiels = paiementsPartiels.filter(paiement => {
    const searchLower = searchTermPartiel.toLowerCase();
   
    return searchTermPartiel === '' ||
      (paiement.reference && paiement.reference.toLowerCase().includes(searchLower)) ||
      (paiement.contact && paiement.contact.toLowerCase().includes(searchLower)) ||
      (paiement.mode_paiement && paiement.mode_paiement.toLowerCase().includes(searchLower)) ||
      (paiement.num_ap && paiement.num_ap.toLowerCase().includes(searchLower)) ||
      (paiement.reference_ft && paiement.reference_ft.toLowerCase().includes(searchLower)) ||
      (paiement.nom_convoquee && paiement.nom_convoquee.toLowerCase().includes(searchLower)) ||
      `#${paiement.idpaiement}`.includes(searchLower);
  });
  // Formater les dates
  const formatDate = (dateString) => {
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
  // Formater les montants
  const formatMontant = (montant) => {
    if (montant === null || montant === undefined) return '0';
    return new Intl.NumberFormat('fr-FR').format(montant);
  };
  // Icône pour le mode de paiement
  const getModeIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'espèce':
      case 'espece':
        return <Banknote className="w-4 h-4" />;
      case 'virement':
        return <TrendingUp className="w-4 h-4" />;
      case 'mobile money':
      case 'mobile':
        return <Phone className="w-4 h-4" />;
      case 'carte bancaire':
      case 'carte':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };
  // Couleur pour le statut
  const getStatutColor = (statut) => {
    const statutLower = statut?.toLowerCase();
    if (statutLower === 'payé' || statutLower === 'complet' || statutLower === 'terminé') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statutLower === 'partiellement payé' || statutLower === 'en cours' || statutLower === 'partiel') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (statutLower === 'en attente') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else if (statutLower === 'annulé' || statutLower === 'refusé' || statutLower === 'échec') {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };
  // Icône pour le statut
  const getStatutIcon = (statut) => {
    const statutLower = statut?.toLowerCase();
    if (statutLower === 'payé' || statutLower === 'complet' || statutLower === 'terminé') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (statutLower === 'partiellement payé' || statutLower === 'en cours' || statutLower === 'partiel') {
      return <Clock className="w-4 h-4 text-blue-600" />;
    } else if (statutLower === 'en attente') {
      return <Clock className="w-4 h-4 text-orange-600" />;
    } else if (statutLower === 'annulé' || statutLower === 'refusé' || statutLower === 'échec') {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };
  // Supprimer un paiement
  const handleDeletePaiement = async () => {
    if (!paiementToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/paiements/${paiementToDelete}`, {
        method: 'DELETE',
      });
      const result = await response.json();
     
      if (response.ok && result.success) {
        alert('✅ Paiement supprimé avec succès!');
        setShowDeleteModal(false);
        setPaiementToDelete(null);
        fetchPaiements();
      } else {
        throw new Error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      alert(`❌ Erreur: ${error.message}`);
    }
  };
  // Réinitialiser les filtres
  const resetFiltres = () => {
    setSearchTerm('');
    setSearchTermPartiel('');
    setFiltreStatut('tous');
    setPage(1);
    setPagePartiel(1);
  };
  // Ouvrir modal pour compléter paiement
  const handleCompleterPaiement = (paiement) => {
    console.log('📋 Paiement à compléter:', paiement);
    setPaiementToComplete(paiement);
    setShowCompleterModal(true);
  };
  // Fermer modal et rafraîchir
  const handleCloseCompleterModal = () => {
    setShowCompleterModal(false);
    setPaiementToComplete(null);
    fetchPaiements();
  };
  // Calculer les indices affichés
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPaiementsComplets.length);
 
  const startIndexPartiel = (pagePartiel - 1) * pageSize;
  const endIndexPartiel = Math.min(startIndexPartiel + pageSize, filteredPaiementsPartiels.length);
  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Paiements</h1>
            <p className="text-slate-600">Suivi des paiements complets et partiels avec gestion des tranches</p>
          </div>
         
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm text-slate-600">Montant total encaissé</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatMontant(stats.total_montant)} Ar
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Paiements</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total_paiements}</p>
              <p className="text-xs text-slate-500">Encaissés: {formatMontant(stats.total_montant)} Ar</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Paiements Complets</p>
              <p className="text-2xl font-bold text-green-600">{stats.paiements_complets}</p>
              <p className="text-xs text-slate-500">Statut: Payé/Complet</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Paiements Partiels</p>
              <p className="text-2xl font-bold text-orange-600">{stats.paiements_partiels}</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatMontant(stats.montant_en_attente)} Ar en attente
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-purple-600">{stats.paiements_aujourdhui}</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatMontant(stats.montant_aujourdhui)} Ar
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
 <PaiementContent/>
      {/* Contrôles généraux */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {/* Bouton réinitialiser */}
            {(searchTerm || searchTermPartiel) && (
              <button
                onClick={resetFiltres}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
            {/* Bouton actualiser */}
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => {
                fetchPaiements();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>
      
        {/* Tableau des paiements partiels - AMELIORE */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Paiements Partiels ({filteredPaiementsPartiels.length})
            <span className="text-sm font-normal text-slate-500 ml-2">
              - Montant en attente: {formatMontant(stats.montant_en_attente)} Ar
            </span>
          </h2>
         
          {/* Barre de recherche pour partiels */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par ID, référence, contact..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTermPartiel}
                onChange={(e) => setSearchTermPartiel(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-slate-600">Chargement des paiements...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-medium">Erreur: {error}</p>
              </div>
              <button
                onClick={fetchPaiements}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : filteredPaiementsPartiels.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchTermPartiel
                  ? 'Aucun paiement partiel trouvé'
                  : 'Aucun paiement partiel enregistré'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Références
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Tranches
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Progression
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredPaiementsPartiels.slice(startIndexPartiel, endIndexPartiel).map((paiement) => {
                      const pourcentagePaye = calculatePourcentagePaye(paiement);
                      const tranchesInfo = getTranchesInfo(paiement);
                      const montantRestant = parseFloat(paiement.montant_reste) || 0;
                     
                      return (
                        <tr key={paiement.idpaiement} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-sm font-mono font-bold text-slate-900">#{paiement.idpaiement}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-900">{formatDate(paiement.date_paiement)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Receipt className="w-3 h-3 text-blue-500" />
                                <div className="text-sm font-medium text-slate-900">
                                  {paiement.num_ap || `AP-${paiement.idavis || 'N/A'}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="w-3 h-3 text-emerald-500" />
                                <div className="text-xs text-slate-500">
                                  {paiement.reference_ft || `FT-${paiement.idft || 'N/A'}`}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                Contact: {paiement.contact || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-base font-bold text-slate-900">
                                {formatMontant(paiement.montant)} Ar
                              </div>
                              <div className="text-sm text-red-600">
                                Reste: {formatMontant(montantRestant)} Ar
                              </div>
                              {paiement.montant_total && (
                                <div className="text-xs text-slate-500">
                                  Total: {formatMontant(paiement.montant_total)} Ar
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {tranchesInfo.nombreTranche > 1 ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm text-slate-900">
                                    {tranchesInfo.numeroTranche}/{tranchesInfo.nombreTranche}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Tranche {tranchesInfo.numeroTranche} sur {tranchesInfo.nombreTranche}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Payé: {pourcentagePaye}%</span>
                                <span className="text-slate-600">{formatMontant(paiement.montant)}/{formatMontant(paiement.montant_total || (paiement.montant + montantRestant))} Ar</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${pourcentagePaye}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleCompleterPaiement(paiement)}
                                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                title="Compléter ou ajouter une tranche"
                              >
                                <DollarSign className="w-3 h-3" />
                                {montantRestant > 0 ? 'Compléter' : 'Nouvelle tranche'}
                              </button>
                             
                              <button
                                onClick={() => {
                                  setSelectedPaiement(paiement);
                                  setShowDetailsModal(true);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                             
                              <button
                                onClick={() => {
                                  setPaiementToDelete(paiement.idpaiement);
                                  setShowDeleteModal(true);
                                }}
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
              {/* Pagination pour partiels */}
              {filteredPaiementsPartiels.length > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                  <div className="text-sm text-slate-600">
                    Affichage de {startIndexPartiel + 1} à {endIndexPartiel} sur {filteredPaiementsPartiels.length} paiements partiels
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPagePartiel(prev => Math.max(1, prev - 1))}
                      disabled={pagePartiel === 1}
                      className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                   
                    {Array.from({ length: Math.min(3, totalPagesPartiel) }, (_, i) => {
                      let pageNum;
                      if (totalPagesPartiel <= 3) {
                        pageNum = i + 1;
                      } else if (pagePartiel <= 2) {
                        pageNum = i + 1;
                      } else if (pagePartiel >= totalPagesPartiel - 1) {
                        pageNum = totalPagesPartiel - 2 + i;
                      } else {
                        pageNum = pagePartiel - 1 + i;
                      }
                     
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagePartiel(pageNum)}
                          className={`w-8 h-8 rounded-lg border transition-colors text-sm ${pagePartiel === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                   
                    <button
                      onClick={() => setPagePartiel(prev => Math.min(totalPagesPartiel, prev + 1))}
                      disabled={pagePartiel === totalPagesPartiel}
                      className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Tableau des paiements complets */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Paiements Complets ({filteredPaiementsComplets.length})
          </h2>
         
          {/* Barre de recherche pour complets */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par ID, référence, contact..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {filteredPaiementsComplets.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchTerm
                  ? 'Aucun paiement complet trouvé'
                  : 'Aucun paiement complet enregistré'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Références
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Mode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredPaiementsComplets.slice(startIndex, endIndex).map((paiement) => {
                      const tranchesInfo = getTranchesInfo(paiement);
                     
                      return (
                        <tr key={paiement.idpaiement} className="hover:bg-green-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-mono font-bold text-slate-900">#{paiement.idpaiement}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-900">{formatDate(paiement.date_paiement)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Receipt className="w-3 h-3 text-blue-500" />
                                <div className="text-sm font-medium text-slate-900">
                                  {paiement.num_ap || `AP-${paiement.idavis || 'N/A'}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="w-3 h-3 text-emerald-500" />
                                <div className="text-xs text-slate-500">
                                  {paiement.reference_ft || `FT-${paiement.idft || 'N/A'}`}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                Contact: {paiement.contact || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-base font-bold text-slate-900">
                                {formatMontant(paiement.montant)} Ar
                              </div>
                              {tranchesInfo.nombreTranche > 1 && (
                                <div className="text-xs text-slate-500">
                                  {tranchesInfo.nombreTranche} tranches
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getModeIcon(paiement.mode_paiement)}
                              <span className="text-sm text-slate-900">{paiement.mode_paiement || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getStatutIcon(paiement.statut)}
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatutColor(paiement.statut)}`}>
                                {paiement.statut || 'Payé'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedPaiement(paiement);
                                  setShowDetailsModal(true);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                             
                              <button
                                onClick={() => {
                                  setPaiementToDelete(paiement.idpaiement);
                                  setShowDeleteModal(true);
                                }}
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
              {/* Pagination pour complets */}
              {filteredPaiementsComplets.length > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                  <div className="text-sm text-slate-600">
                    Affichage de {startIndex + 1} à {endIndex} sur {filteredPaiementsComplets.length} paiements complets
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                   
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (page <= 2) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = page - 1 + i;
                      }
                     
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg border transition-colors text-sm ${page === pageNum
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
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Modal pour compléter paiement */}
      {showCompleterModal && paiementToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                  Compléter le Paiement
                </h2>
                <p className="text-slate-600 mt-1">
                  ID: #{paiementToComplete.idpaiement} • Reste à payer: {formatMontant(paiementToComplete.montant_reste || 0)} Ar
                  {paiementToComplete.nombre_tranche && paiementToComplete.nombre_tranche > 1 &&
                    ` • Tranche ${paiementToComplete.numero_tranche || 1}/${paiementToComplete.nombre_tranche}`}
                </p>
              </div>
              <button
                onClick={handleCloseCompleterModal}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="p-6">
              <Completerpaiement
                paiement={paiementToComplete}
                onClose={handleCloseCompleterModal}
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal de détails du paiement */}
      {showDetailsModal && selectedPaiement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-blue-600" />
                  Détails du Paiement
                </h2>
                <p className="text-slate-600 mt-1">
                  ID: #{selectedPaiement.idpaiement} • {formatDate(selectedPaiement.date_paiement)} •
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatutColor(selectedPaiement.statut)}`}>
                    {selectedPaiement.statut || (selectedPaiement.montant_reste > 0 ? 'Partiel' : 'Payé')}
                  </span>
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
              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations du Paiement</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">ID Paiement:</dt>
                      <dd className="font-medium text-slate-900">#{selectedPaiement.idpaiement}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Date paiement:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedPaiement.date_paiement)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant payé:</dt>
                      <dd className="font-bold text-slate-900 text-lg">
                        {formatMontant(selectedPaiement.montant)} Ar
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant restant:</dt>
                      <dd className="font-bold text-slate-900">
                        {formatMontant(selectedPaiement.montant_reste || 0)} Ar
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut et Mode de Paiement</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Statut:</dt>
                      <dd className="flex items-center gap-2">
                        {getStatutIcon(selectedPaiement.statut)}
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatutColor(selectedPaiement.statut)}`}>
                          {selectedPaiement.statut || (selectedPaiement.montant_reste > 0 ? 'Partiel' : 'Payé')}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Mode paiement:</dt>
                      <dd className="font-medium text-slate-900 flex items-center gap-2">
                        {getModeIcon(selectedPaiement.mode_paiement)}
                        {selectedPaiement.mode_paiement || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Référence:</dt>
                      <dd className="font-medium text-slate-900">{selectedPaiement.reference || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Contact:</dt>
                      <dd className="font-medium text-slate-900">{selectedPaiement.contact || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {/* Informations des tranches */}
              {(selectedPaiement.nombre_tranche && selectedPaiement.nombre_tranche > 1) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-600" />
                    Informations des Tranches
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">{selectedPaiement.numero_tranche || 1}</div>
                      <div className="text-sm text-slate-600">Tranche actuelle</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">{selectedPaiement.nombre_tranche}</div>
                      <div className="text-sm text-slate-600">Nombre total de tranches</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedPaiement.nombre_tranche ?
                          Math.round(((selectedPaiement.numero_tranche || 1) / selectedPaiement.nombre_tranche) * 100) : 100}%
                      </div>
                      <div className="text-sm text-slate-600">Progression</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Métadonnées */}
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations supplémentaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">N° Avis de Paiement</p>
                    <p className="font-medium text-slate-900">
                      {selectedPaiement.num_ap || `AP-${selectedPaiement.idavis || 'N/A'}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Fiche Terrain (FT)</p>
                    <p className="font-medium text-slate-900">
                      {selectedPaiement.reference_ft || `FT-${selectedPaiement.idft || 'N/A'}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Bénéficiaire</p>
                    <p className="font-medium text-slate-900">
                      {selectedPaiement.nom_convoquee || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">ID Descente</p>
                    <p className="font-medium text-slate-900">DS-{selectedPaiement.iddescente || 'N/A'}</p>
                  </div>
                </div>
              </div>
              {/* Barre de progression */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Progression du Paiement</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Montant payé: {formatMontant(selectedPaiement.montant)} Ar</span>
                    <span className="text-slate-600">
                      Total: {formatMontant(
                        selectedPaiement.montant_total ||
                        (parseFloat(selectedPaiement.montant) + parseFloat(selectedPaiement.montant_reste || 0))
                      )} Ar
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{
                        width: `${calculatePourcentagePaye(selectedPaiement)}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-center text-sm font-medium text-slate-700">
                    {calculatePourcentagePaye(selectedPaiement)}% payé
                  </div>
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
              {selectedPaiement.montant_reste > 0 && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleCompleterPaiement(selectedPaiement);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Compléter le paiement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Confirmer la suppression</h3>
              </div>
             
              <p className="text-slate-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.
              </p>
             
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPaiementToDelete(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeletePaiement}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
export default Gererpaiement;