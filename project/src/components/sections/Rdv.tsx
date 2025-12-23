import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, MapPin, Clock, 
  Search, Filter, CheckCircle2, 
  PlayCircle, UserX, FileCheck, AlertTriangle,
  ChevronLeft, ChevronRight, Download
} from 'lucide-react';

interface Rendezvous {
  id: number;
  iddescente: number;
  date_rendez_vous: string;
  heure_rendez_vous: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  contact_r?: string;
  infraction?: string;
  modele_pv?: string;
  reference?: string;
  statut: string;
  nom_verbalisateur?: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  created_at?: string;
  updated_at?: string;
}

// Fonctions utilitaires pour le formatage
const formatDate = (dateString?: string) => {
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

const formatTime = (timeString?: string) => {
  if (!timeString) return '';
  return timeString.substring(0, 5);
};

// Nettoyer les chaînes JSON
const cleanJsonString = (str: string): string => {
  if (!str) return '';
  
  let cleanStr = str.trim();
  
  if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanStr);
      if (typeof parsed === 'object') {
        const firstKey = Object.keys(parsed)[0];
        cleanStr = parsed[firstKey] || cleanStr;
      }
    } catch {
      cleanStr = cleanStr.slice(1, -1);
      if ((cleanStr.startsWith('"') && cleanStr.endsWith('"')) || 
          (cleanStr.startsWith("'") && cleanStr.endsWith("'"))) {
        cleanStr = cleanStr.slice(1, -1);
      }
    }
  }
  
  if ((cleanStr.startsWith('"') && cleanStr.endsWith('"')) || 
      (cleanStr.startsWith("'") && cleanStr.endsWith("'"))) {
    cleanStr = cleanStr.slice(1, -1);
  }
  
  return cleanStr;
};

// Normaliser le statut
const normalizeStatus = (status: string) => {
  return status.toLowerCase().trim();
};

// Obtenir l'icône du statut
const getStatusIcon = (status: string) => {
  const statut = normalizeStatus(status);
  switch (statut) {
    case 'en attente': return <Clock className="w-5 h-5" />;
    case 'en cours': return <PlayCircle className="w-5 h-5" />;
    case 'non-comparution': return <UserX className="w-5 h-5" />;
    case 'fini': return <CheckCircle2 className="w-5 h-5" />;
    default: return <Calendar className="w-5 h-5" />;
  }
};

// Obtenir les classes CSS pour le statut
const getStatusClasses = (status: string) => {
  const statut = normalizeStatus(status);
  switch (statut) {
    case 'en attente': return 'bg-yellow-100 text-yellow-800';
    case 'en cours': return 'bg-blue-100 text-blue-800';
    case 'non-comparution': return 'bg-red-100 text-red-800';
    case 'fini': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Obtenir le nom d'affichage du statut
const getStatusDisplayName = (status: string) => {
  const statut = normalizeStatus(status);
  switch (statut) {
    case 'en attente': return 'En attente';
    case 'en cours': return 'En cours';
    case 'non-comparution': return 'Non comparution';
    case 'fini': return 'Terminé';
    default: return status;
  }
};

// Calculer les jours écoulés
const getDaysElapsed = (dateString?: string) => {
  if (!dateString) return null;
  try {
    const rdvDate = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - rdvDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

// Composant de carte de rendez-vous
function RendezvousCard({ rdv }: { rdv: Rendezvous }) {
  const daysElapsed = getDaysElapsed(rdv.date_rendez_vous);
  const isOverdue = normalizeStatus(rdv.statut) === 'en cours' && daysElapsed !== null && daysElapsed > 3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">RDV-{rdv.id}</h3>
          <p className="text-sm text-gray-500">Descente DS-{rdv.iddescente}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${getStatusClasses(rdv.statut)}`}>
          {getStatusIcon(rdv.statut)}
          {getStatusDisplayName(rdv.statut)}
        </div>
      </div>

      <div className="space-y-4">
        {/* Date et heure */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{formatDate(rdv.date_rendez_vous)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{formatTime(rdv.heure_rendez_vous)}</span>
          </div>
        </div>

        {/* Personne concernée */}
        {rdv.nom_personne_r && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{rdv.nom_personne_r}</span>
          </div>
        )}

        {/* Localisation */}
        {(rdv.commune || rdv.fokontany) && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-700">
              {rdv.commune && <div className="font-medium">{rdv.commune}</div>}
              {rdv.fokontany && <div className="text-gray-600">{rdv.fokontany}</div>}
            </div>
          </div>
        )}

        {/* Infraction */}
        {rdv.infraction && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Objet</div>
            <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
              {cleanJsonString(rdv.infraction)}
            </div>
          </div>
        )}

        {/* Informations supplémentaires */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
          {rdv.n_pv_pat && (
            <div>
              <div className="text-xs font-medium text-gray-500">N° PV</div>
              <div className="text-sm text-gray-800 font-medium">{rdv.n_pv_pat}</div>
            </div>
          )}
          {rdv.n_fifafi && (
            <div>
              <div className="text-xs font-medium text-gray-500">FIFAFI</div>
              <div className="text-sm text-gray-800 font-medium">{rdv.n_fifafi}</div>
            </div>
          )}
        </div>

        {/* Indicateur de retard */}
        {isOverdue && daysElapsed !== null && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                En retard de {daysElapsed} jour{daysElapsed > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RendezvousFT() {
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Récupérer les données depuis l'API
  useEffect(() => {
    fetchRendezvous();
  }, []);

  const fetchRendezvous = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/rendezvousft');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setRendezvous(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les rendez-vous
  const filteredRendezvous = rendezvous.filter(rdv => {
    const searchTermLower = searchTerm.toLowerCase();
    const cleanInfraction = rdv.infraction ? cleanJsonString(rdv.infraction).toLowerCase() : '';
    
    const matchesSearch = 
      `rdv-${rdv.id}`.toLowerCase().includes(searchTermLower) ||
      `ds-${rdv.iddescente}`.toLowerCase().includes(searchTermLower) ||
      (rdv.n_pv_pat || '').toLowerCase().includes(searchTermLower) ||
      (rdv.n_fifafi || '').toLowerCase().includes(searchTermLower) ||
      (rdv.nom_verbalisateur || '').toLowerCase().includes(searchTermLower) ||
      (rdv.nom_personne_r || '').toLowerCase().includes(searchTermLower) ||
      (rdv.commune || '').toLowerCase().includes(searchTermLower) ||
      cleanInfraction.includes(searchTermLower);
    
    const matchesStatus = 
      statusFilter === 'Tous' || 
      normalizeStatus(rdv.statut) === normalizeStatus(statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  // Grouper par statut pour les statistiques
  const groupedByStatus = filteredRendezvous.reduce((groups, rdv) => {
    const status = rdv.statut || 'En attente';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(rdv);
    return groups;
  }, {} as Record<string, Rendezvous[]>);

  // Calculer les indices pour la pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRendezvous.length);
  const totalPages = Math.ceil(filteredRendezvous.length / pageSize);

  // Gérer l'export
  const handleExport = () => {
    const dataToExport = filteredRendezvous;
    const headers = ['ID', 'Date', 'Heure', 'Personne', 'Lieu', 'PV', 'Statut'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(rdv => [
        `RDV-${rdv.id}`,
        formatDate(rdv.date_rendez_vous),
        formatTime(rdv.heure_rendez_vous),
        rdv.nom_personne_r || '',
        [rdv.commune, rdv.fokontany].filter(Boolean).join(', '),
        rdv.n_pv_pat || '',
        getStatusDisplayName(rdv.statut)
      ].map(field => `"${field}"`).join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rendezvous-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des rendez-vous...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-bold">Erreur de chargement</p>
        <p>{error}</p>
        <button 
          onClick={fetchRendezvous}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes rendez-vous</h1>
          <p className="text-slate-600">Consultation des rendez-vous planifiés</p>
        </div>
        
        <button 
          onClick={handleExport}
          disabled={filteredRendezvous.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total', 
            value: filteredRendezvous.length, 
            icon: <Calendar className="w-6 h-6 text-blue-600" />,
            bgColor: 'bg-blue-100'
          },
          { 
            label: 'En attente', 
            value: groupedByStatus['En attente']?.length || 0, 
            icon: <Clock className="w-6 h-6 text-yellow-600" />,
            bgColor: 'bg-yellow-100'
          },
          { 
            label: 'En cours', 
            value: groupedByStatus['En cours']?.length || 0, 
            icon: <PlayCircle className="w-6 h-6 text-blue-600" />,
            bgColor: 'bg-blue-100'
          },
          { 
            label: 'Terminés', 
            value: groupedByStatus['Fini']?.length || 0, 
            icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
            bgColor: 'bg-green-100'
          }
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-full`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par ID, nom, lieu..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Tous">Tous les statuts</option>
                <option value="En attente">En attente</option>
                <option value="En cours">En cours</option>
                <option value="Non-comparution">Non comparution</option>
                <option value="Fini">Terminé</option>
              </select>
            </div>

            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="4">4 par page</option>
              <option value="8">8 par page</option>
              <option value="12">12 par page</option>
              <option value="16">16 par page</option>
            </select>
          </div>
        </div>

        {filteredRendezvous.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm ? 'Aucun rendez-vous trouvé' : 'Aucun rendez-vous'}
            </h3>
            <p className="text-slate-500">
              {searchTerm 
                ? 'Aucun rendez-vous ne correspond à vos critères de recherche.' 
                : 'Vous n\'avez pas de rendez-vous planifiés.'}
            </p>
          </div>
        ) : (
          <>
            {/* Grille de cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {filteredRendezvous.slice(startIndex, endIndex).map((rdv) => (
                <RendezvousCard key={rdv.id} rdv={rdv} />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Affichage de {startIndex + 1} à {endIndex} sur {filteredRendezvous.length} résultat{filteredRendezvous.length !== 1 ? 's' : ''}
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

      {/* Légende */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
 
       
      </div>
    </div>
  );
}

export default RendezvousFT;