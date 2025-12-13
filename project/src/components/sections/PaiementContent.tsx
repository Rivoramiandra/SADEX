import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, DollarSign, Calendar, CheckCircle, Clock, XCircle,
  CreditCard, Banknote, Wallet, Check, X, Search,
  ChevronLeft, ChevronRight, MoreVertical, Filter,
  Eye, Download, Printer, Mail, AlertCircle,
  TrendingUp, TrendingDown, RefreshCw, FileText,
  User, MapPin, Building, Phone, Mail as MailIcon,
  Download as DownloadIcon, Send, Shield, Lock,
  ArrowRight, ArrowLeft, ExternalLink
} from 'lucide-react';
import PasserPaiement from './Passerpaiement';

interface AvisPaiement {
  id: number;
  num_ap: string;
  date_ap: string;
  montant: number;
  montant_lettre: string;
  statut_paiement: 'Payé' | 'En attente' | 'Retard' | 'Annulé';
  methode_paiement: string;
  description: string;
  idft: number;
  iddescente: number;
  date_paiement?: string;
  reference_paiement?: string;
  created_at: string;
  updated_at: string;
  ft?: {
    reference_ft: string;
    nom_convoquee: string;
    type_convoquee: string;
    commune?: string;
    fokontany?: string;
    nom_personne_r?: string;
  };
}

interface PaiementStats {
  totalEnAttente: number;
  totalPaye: number;
  totalRetard: number;
  totalAnnule: number;
  totalMontantEnAttente: number;
  totalMontantPaye: number;
  totalMontantRetard: number;
}

export default function PaiementContent() {
  const [avisList, setAvisList] = useState<AvisPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAvis, setSelectedAvis] = useState<AvisPaiement | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasserPaiementModal, setShowPasserPaiementModal] = useState(false);
  const [selectedAvisForPasserPaiement, setSelectedAvisForPasserPaiement] = useState<AvisPaiement | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'En attente' | 'Payé' | 'Retard' | 'Annulé'>('tous');
  const [stats, setStats] = useState<PaiementStats>({
    totalEnAttente: 0,
    totalPaye: 0,
    totalRetard: 0,
    totalAnnule: 0,
    totalMontantEnAttente: 0,
    totalMontantPaye: 0,
    totalMontantRetard: 0
  });

  // Récupérer la liste des avis de paiement
  const fetchAvisList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filtreStatut !== 'tous') {
        params.append('statut_paiement', filtreStatut);
      }
      
      const url = `http://localhost:3000/api/avis-de-paiement?${params.toString()}`;
      console.log('Fetching avis list from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const avisData = result.data || [];
        setAvisList(avisData);
        
        if (result.total !== undefined) {
          setTotalCount(result.total);
          setTotalPages(Math.ceil(result.total / pageSize));
        } else {
          setTotalCount(result.data.length);
          setTotalPages(Math.ceil(result.data.length / pageSize));
        }
        
        // Calculer les statistiques
        calculerStatistiques(avisData);
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des avis de paiement:', err);
      setError(err.message);
      setAvisList([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, filtreStatut]);

  // Calculer les statistiques
  const calculerStatistiques = (avisList: AvisPaiement[]) => {
    const statsCalcul: PaiementStats = {
      totalEnAttente: 0,
      totalPaye: 0,
      totalRetard: 0,
      totalAnnule: 0,
      totalMontantEnAttente: 0,
      totalMontantPaye: 0,
      totalMontantRetard: 0
    };

    avisList.forEach(avis => {
      switch (avis.statut_paiement) {
        case 'En attente':
          statsCalcul.totalEnAttente++;
          statsCalcul.totalMontantEnAttente += avis.montant;
          break;
        case 'Payé':
          statsCalcul.totalPaye++;
          statsCalcul.totalMontantPaye += avis.montant;
          break;
        case 'Retard':
          statsCalcul.totalRetard++;
          statsCalcul.totalMontantRetard += avis.montant;
          break;
        case 'Annulé':
          statsCalcul.totalAnnule++;
          break;
      }
    });

    setStats(statsCalcul);
  };

  // Initial fetch
  useEffect(() => {
    fetchAvisList();
  }, [fetchAvisList]);

  // Gérer le délai de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrer les avis (recherche locale)
  const filteredAvis = avisList.filter(avis => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      return (
        avis.num_ap?.toLowerCase().includes(searchLower) ||
        avis.reference_paiement?.toLowerCase().includes(searchLower) ||
        avis.ft?.reference_ft?.toLowerCase().includes(searchLower) ||
        avis.ft?.nom_convoquee?.toLowerCase().includes(searchLower) ||
        avis.ft?.nom_personne_r?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Réinitialiser les filtres
  const resetFiltres = () => {
    setFiltreStatut('tous');
    setSearchTerm('');
    setPage(1);
  };

  // Ouvrir le modal PasserPaiement
  const handleOpenPasserPaiementModal = (avis: AvisPaiement) => {
    setSelectedAvisForPasserPaiement(avis);
    setShowPasserPaiementModal(true);
  };

  // Annuler un avis
  const handleAnnulerAvis = async (avisId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet avis de paiement?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avisId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statut_paiement: 'Annulé'
        })
      });

      if (response.ok) {
        alert('Avis annulé avec succès!');
        fetchAvisList(); // Rafraîchir la liste
      } else {
        throw new Error('Erreur lors de l\'annulation');
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Télécharger l'avis
  const handleDownloadAvis = async (avisId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avisId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Avis-Paiement-${avisId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Erreur lors du téléchargement');
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Payé':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Retard':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Annulé':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Payé':
        return <CheckCircle className="w-4 h-4" />;
      case 'En attente':
        return <Clock className="w-4 h-4" />;
      case 'Retard':
        return <AlertCircle className="w-4 h-4" />;
      case 'Annulé':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMethodeIcon = (methode: string) => {
    switch (methode.toLowerCase()) {
      case 'espèce':
        return <Banknote className="w-4 h-4" />;
      case 'carte bancaire':
        return <CreditCard className="w-4 h-4" />;
      case 'virement':
        return <TrendingUp className="w-4 h-4" />;
      case 'mobile money':
        return <Phone className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
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

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const handleViewDetails = (avis: AvisPaiement) => {
    setSelectedAvis(avis);
    setShowDetailsModal(true);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Calculer les indices affichés
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAvis.length);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Paiements</h1>
        <p className="text-slate-600">Suivi et traitement des paiements des avis émis</p>
        <p className="text-sm text-slate-500 mt-1">
          Traitez les paiements, consultez l'historique et gérez le suivi financier
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* En attente */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">En attente</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalEnAttente}</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMontant(stats.totalMontantEnAttente)} Ar
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-orange-100">
            <p className="text-xs text-slate-500">Avis non réglés</p>
          </div>
        </div>

        {/* Payés */}
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Payés</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPaye}</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMontant(stats.totalMontantPaye)} Ar
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-100">
            <p className="text-xs text-slate-500">Avis réglés</p>
          </div>
        </div>

        {/* En retard */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalRetard}</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMontant(stats.totalMontantRetard)} Ar
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-100">
            <p className="text-xs text-slate-500">Avis en retard de paiement</p>
          </div>
        </div>

        {/* Annulés */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Annulés</p>
              <p className="text-2xl font-bold text-slate-600">{stats.totalAnnule}</p>
              <p className="text-lg font-semibold text-slate-900">-</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <XCircle className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">Avis annulés</p>
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
              placeholder="Rechercher par N° AP, référence FT, nom..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtres supplémentaires */}
          <div className="flex flex-wrap gap-2">
            {/* Filtre par statut */}
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filtreStatut}
              onChange={(e) => {
                setFiltreStatut(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="Payé">Payés</option>
              <option value="Retard">En retard</option>
              <option value="Annulé">Annulés</option>
            </select>

            {/* Filtre par page */}
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

            {/* Bouton réinitialiser si filtres actifs */}
            {(filtreStatut !== 'tous' || searchTerm) && (
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
              onClick={fetchAvisList}
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Tableau des avis de paiement */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement des avis de paiement...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 font-medium">Erreur: {error}</p>
            <button 
              onClick={fetchAvisList}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        ) : filteredAvis.length === 0 ? (
          <div className="text-center p-8">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm || filtreStatut !== 'tous' 
                ? 'Aucun avis trouvé' 
                : 'Aucun avis de paiement'}
            </h3>
            <p className="text-slate-500">
              {searchTerm || filtreStatut !== 'tous'
                ? `Aucun avis ne correspond à vos critères${filtreStatut !== 'tous' ? ` (${filtreStatut})` : ''}.`
                : 'Commencez par créer des avis de paiement à partir des procès-verbaux.'}
            </p>
            {(searchTerm || filtreStatut !== 'tous') && (
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
                      N° Avis
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Référence FT
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Bénéficiaire
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Montant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Date Émission
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredAvis.slice(startIndex, endIndex).map((avis) => (
                    <tr key={avis.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                            <Receipt className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{avis.num_ap}</div>
                            {avis.reference_paiement && (
                              <div className="text-xs text-slate-500">Ref: {avis.reference_paiement}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {avis.ft?.reference_ft || `FT-${avis.idft}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          DS-{avis.iddescente}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || 'Non spécifié'}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          {avis.ft?.type_convoquee || 'Non spécifié'}
                        </div>
                        {avis.ft?.commune && (
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {avis.ft.commune} {avis.ft.fokontany && `- ${avis.ft.fokontany}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-slate-900">
                          {formatMontant(avis.montant)} Ar
                        </div>
                        <div className="text-xs text-slate-500">
                          {avis.montant_lettre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-900">{formatDate(avis.date_ap)}</span>
                        </div>
                        {avis.date_paiement && (
                          <div className="text-xs text-slate-500">
                            Payé le: {formatDate(avis.date_paiement)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(avis.statut_paiement)}`}>
                          {getStatusIcon(avis.statut_paiement)}
                          <span className="text-sm font-medium">{avis.statut_paiement}</span>
                        </div>
                        {avis.methode_paiement && avis.statut_paiement === 'Payé' && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                            {getMethodeIcon(avis.methode_paiement)}
                            {avis.methode_paiement}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(avis)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDownloadAvis(avis.id)}
                            className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                            title="Télécharger PDF"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          
                          {/* BOUTON PASSER PAIEMENT - SANS CONDITION */}
                          <button
                            onClick={() => handleOpenPasserPaiementModal(avis)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                            title="Passer au paiement"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleAnnulerAvis(avis.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Annuler l'avis"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-600">
                {searchTerm || filtreStatut !== 'tous' 
                  ? `Affichage de ${startIndex + 1} à ${endIndex} sur ${filteredAvis.length} résultats filtrés`
                  : `Affichage de ${startIndex + 1} à ${endIndex} sur ${totalCount} résultats`}
                {filtreStatut !== 'tous' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {filtreStatut}
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

      {/* Modal de détails de l'avis */}
      {showDetailsModal && selectedAvis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Receipt className="w-6 h-6 mr-2 text-blue-600" />
                  Détails de l'Avis de Paiement
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedAvis.num_ap} • {selectedAvis.ft?.reference_ft || `FT-${selectedAvis.idft}`}
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
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations de l'Avis</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">N° Avis:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.num_ap}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Date d'émission:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedAvis.date_ap)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant:</dt>
                      <dd className="font-bold text-slate-900 text-lg">
                        {formatMontant(selectedAvis.montant)} Ar
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant en lettres:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.montant_lettre}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut et Paiement</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Statut:</dt>
                      <dd>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedAvis.statut_paiement)}`}>
                          {selectedAvis.statut_paiement}
                        </span>
                      </dd>
                    </div>
                    {selectedAvis.methode_paiement && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Méthode:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvis.methode_paiement}</dd>
                      </div>
                    )}
                    {selectedAvis.date_paiement && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Date paiement:</dt>
                        <dd className="font-medium text-slate-900">{formatDate(selectedAvis.date_paiement)}</dd>
                      </div>
                    )}
                    {selectedAvis.reference_paiement && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Référence paiement:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvis.reference_paiement}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Informations du FT associé */}
              {selectedAvis.ft && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations du Procès-Verbal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Référence FT</p>
                      <p className="font-medium text-slate-900">{selectedAvis.ft.reference_ft}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Personne convoquée</p>
                      <p className="font-medium text-slate-900">{selectedAvis.ft.nom_convoquee || selectedAvis.ft.nom_personne_r || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Type</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedAvis.ft.type_convoquee || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Localisation</p>
                      <p className="font-medium text-slate-900">
                        {selectedAvis.ft.commune || 'N/A'} {selectedAvis.ft.fokontany && `- ${selectedAvis.ft.fokontany}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedAvis.description && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Description</h3>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-slate-700">{selectedAvis.description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadAvis(selectedAvis.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Télécharger PDF
                </button>
                
                {/* BOUTON PASSER PAIEMENT DANS LE MODAL - SANS CONDITION */}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenPasserPaiementModal(selectedAvis);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Passer au Paiement
                </button>
                
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAnnulerAvis(selectedAvis.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler l'Avis
                </button>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PasserPaiement - Utilisation du composant importé */}
      {showPasserPaiementModal && selectedAvisForPasserPaiement && (
        <PasserPaiement
          avis={selectedAvisForPasserPaiement}
          onClose={() => {
            setShowPasserPaiementModal(false);
            setSelectedAvisForPasserPaiement(null);
          }}
          onSuccess={() => {
            setShowPasserPaiementModal(false);
            setSelectedAvisForPasserPaiement(null);
            fetchAvisList(); // Rafraîchir la liste
          }}
        />
      )}
    </div>
  );
}