import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Filter, Download, Users, MapPin, Clock, 
  ChevronDown, ChevronUp, Search, Trash2, CheckCircle, 
  Clock as ClockIcon, AlertCircle, XCircle, CheckCircle2, 
  PlayCircle, UserX, FileText, Send, RefreshCw, CheckSquare,
  AlertTriangle, History
} from 'lucide-react';

interface Rendezvous {
  id: number;
  iddescente: number;
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous: string;
  heure_rendez_vous: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  contact_r?: string;
  infraction?: string;
  actions?: string;
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

// Fonction pour nettoyer les chaînes JSON
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

// Fonction pour formater le titre du rendez-vous
const formatRendezvousTitle = (title?: string, iddescente?: number) => {
  if (!title) return `Rendez-vous DS-${iddescente || 'N/A'}`;
  
  const cleanedTitle = cleanJsonString(title);
  return cleanedTitle || `Rendez-vous DS-${iddescente || 'N/A'}`;
};

function RendezvousFT() {
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [showForm, setShowForm] = useState(false);
  const [editingRendezvous, setEditingRendezvous] = useState<Rendezvous | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'En attente': true,
    'En cours': true,
    'Non-comparution': true,
    'Fini': false
  });
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [checkerStatus, setCheckerStatus] = useState<{
    isActive: boolean;
    isChecking: boolean;
    last_check?: string;
    next_check_estimated?: string;
  } | null>(null);

  // Récupérer les données depuis l'API
  useEffect(() => {
    fetchRendezvous();
    fetchCheckerStatus();
    // Vérifier les statuts automatiquement au chargement
    checkAndUpdateStatus();
    
    // Vérifier périodiquement (toutes les 15 minutes)
    const intervalId = setInterval(checkAndUpdateStatus, 15 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchRendezvous = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/rendezvousft');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📅 Données rendez-vous reçues:', data);
      setRendezvous(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rendezvousft/checker/status');
      if (response.ok) {
        const data = await response.json();
        setCheckerStatus(data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'état du vérificateur:', err);
    }
  };

  // Fonction pour vérifier et mettre à jour les statuts
  const checkAndUpdateStatus = async () => {
    try {
      setCheckingStatus(true);
      console.log('🔄 Vérification des statuts en cours...');
      
      const response = await fetch('http://localhost:3000/api/rendezvousft/check-status');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Vérification des statuts:', data.message);
        setLastStatusCheck(new Date());
        
        // Si des rendez-vous ont été mis à jour, recharger les données
        if (data.updatedCount > 0) {
          console.log(`↪️ ${data.updatedCount} rendez-vous mis à jour, rechargement des données...`);
          fetchRendezvous();
        }
      } else {
        console.warn('⚠️ La vérification des statuts a échoué');
      }
    } catch (err) {
      console.error('Erreur lors de la vérification des statuts:', err);
    } finally {
      setCheckingStatus(false);
      fetchCheckerStatus();
    }
  };

  // Fonction pour vérifier un rendez-vous spécifique
  const checkSingleRendezvousStatus = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}/check`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🔄 Vérification du rendez-vous ${id}:`, data.message);
        
        if (data.updated) {
          alert(`Statut mis à jour: ${data.oldStatus} → ${data.newStatus}\nRaison: ${data.reason}`);
          fetchRendezvous();
        } else {
          alert(`Aucune mise à jour nécessaire. Statut actuel: ${data.currentStatus}\nRaison: ${data.reason}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du rendez-vous:', err);
      alert('Erreur lors de la vérification du statut');
    }
  };

  // Fonction pour vérifier spécifiquement les rendez-vous "En cours" > 3 jours
  const checkOverdueRendezvous = async (autoUpdate = false) => {
    try {
      const url = `http://localhost:3000/api/rendezvousft/check-overdue${autoUpdate ? '?autoUpdate=true' : ''}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Vérification des rendez-vous en retard:', data.message);
        
        if (data.overdueCount > 0) {
          const message = autoUpdate 
            ? `${data.updatedCount} rendez-vous marqués comme "Non-comparution"`
            : `${data.overdueCount} rendez-vous "En cours" depuis plus de 3 jours trouvés`;
          
          alert(message);
          
          if (autoUpdate || data.updatedCount > 0) {
            fetchRendezvous();
          }
        } else {
          alert('Aucun rendez-vous "En cours" depuis plus de 3 jours');
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification des rendez-vous en retard:', err);
      alert('Erreur lors de la vérification des rendez-vous en retard');
    }
  };

  // Gérer la création/mise à jour
  const handleSubmitRendezvous = async (formData: any) => {
    try {
      const url = editingRendezvous 
        ? `http://localhost:3000/api/rendezvousft/${editingRendezvous.id}`
        : 'http://localhost:3000/api/rendezvousft';
      
      const method = editingRendezvous ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${method}: ${response.status}`);
      }

      fetchRendezvous();
      setShowForm(false);
      setEditingRendezvous(null);
      alert('Rendez-vous sauvegardé avec succès');
      
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Gérer la suppression
  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression');
        }
        
        fetchRendezvous();
        alert('Rendez-vous supprimé avec succès');
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Fonction pour marquer comme Fini
  const handleMarkAsFinished = async (id: number) => {
    if (window.confirm('Marquer ce rendez-vous comme terminé ?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}/statut`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ statut: 'Fini' }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la mise à jour du statut');
        }

        fetchRendezvous();
        alert('Rendez-vous marqué comme terminé');
      } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors de la mise à jour du statut');
      }
    }
  };

  // Fonction pour envoyer la mise en demeure
  const handleSendMiseEnDemeure = async (id: number) => {
    if (window.confirm('Envoyer la mise en demeure pour ce rendez-vous ?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}/statut`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ statut: 'Fini' }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de l\'envoi de la mise en demeure');
        }

        fetchRendezvous();
        alert('Mise en demeure envoyée et rendez-vous marqué comme traité');
      } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors de l\'envoi de la mise en demeure');
      }
    }
  };

  // Redémarrer le vérificateur automatique
  const restartChecker = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rendezvousft/checker/restart', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Vérificateur automatique redémarré');
        fetchCheckerStatus();
      }
    } catch (err) {
      console.error('Erreur lors du redémarrage du vérificateur:', err);
      alert('Erreur lors du redémarrage');
    }
  };

  // Arrêter le vérificateur automatique
  const stopChecker = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rendezvousft/checker/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Vérificateur automatique arrêté');
        fetchCheckerStatus();
      }
    } catch (err) {
      console.error('Erreur lors de l\'arrêt du vérificateur:', err);
      alert('Erreur lors de l\'arrêt');
    }
  };

  // Normaliser le statut
  const normalizeStatus = (status: string) => {
    return status.toLowerCase().trim();
  };

  // Filtrer les rendez-vous
  const filteredRendezvous = rendezvous.filter(rdv => {
    const searchTermLower = searchTerm.toLowerCase();
    const cleanInfraction = rdv.infraction ? cleanJsonString(rdv.infraction).toLowerCase() : '';
    
    const matchesSearch = 
      `rdv-${rdv.id}`.toLowerCase().includes(searchTermLower) ||
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

  // Grouper par statut
  const groupedByStatus = filteredRendezvous.reduce((groups, rdv) => {
    const status = rdv.statut || 'En attente';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(rdv);
    return groups;
  }, {} as Record<string, Rendezvous[]>);

  // Définir l'ordre d'affichage des statuts
  const statusOrder = ['En attente', 'En cours', 'Non-comparution', 'Fini'];

  const getStatusClasses = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return 'bg-yellow-100 text-yellow-800';
      case 'en cours': return 'bg-blue-100 text-blue-800';
      case 'non-comparution': return 'bg-red-100 text-red-800';
      case 'fini': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusBorderClasses = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return 'border-l-4 border-yellow-500';
      case 'en cours': return 'border-l-4 border-blue-500';
      case 'non-comparution': return 'border-l-4 border-red-500';
      case 'fini': return 'border-l-4 border-green-500';
      default: return 'border-l-4 border-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'en cours': return <PlayCircle className="w-5 h-5 text-blue-600" />;
      case 'non-comparution': return <UserX className="w-5 h-5 text-red-600" />;
      case 'fini': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default: return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusDisplayName = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return 'En attente';
      case 'en cours': return 'En cours';
      case 'non-comparution': return 'Non-comparution';
      case 'fini': return 'Fini';
      default: return status;
    }
  };

  const getStatusCardColor = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200';
      case 'en cours': return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200';
      case 'non-comparution': return 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200';
      case 'fini': return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200';
      default: return 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200';
    }
  };

  const getTypeFromInfraction = (infraction?: string) => {
    if (!infraction) return 'Inspection';
    
    const cleanInfraction = cleanJsonString(infraction);
    if (!cleanInfraction.trim()) return 'Inspection';
    
    const lowerInfraction = cleanInfraction.toLowerCase();
    
    if (lowerInfraction.includes('construction')) return 'Construction';
    if (lowerInfraction.includes('réunion')) return 'Réunion';
    if (lowerInfraction.includes('entretien')) return 'Entretien';
    if (lowerInfraction.includes('audit')) return 'Audit';
    if (lowerInfraction.includes('suivi')) return 'Suivi';
    if (lowerInfraction.includes('contrôle')) return 'Contrôle';
    if (lowerInfraction.includes('verification') || lowerInfraction.includes('vérification')) return 'Vérification';
    if (lowerInfraction.includes('remblai') || lowerInfraction.includes('illicite')) return 'Remblai Illícite';
    if (lowerInfraction.includes('inspection')) return 'Inspection';
    if (lowerInfraction.includes('visite')) return 'Visite';
    if (lowerInfraction.includes('surveillance')) return 'Surveillance';
    
    return cleanInfraction;
  };

  const getTypeColor = (infraction?: string) => {
    const type = getTypeFromInfraction(infraction);
    switch (type) {
      case 'Construction': return 'from-orange-500 to-amber-600';
      case 'Réunion': return 'from-blue-500 to-indigo-600';
      case 'Inspection': return 'from-green-500 to-emerald-600';
      case 'Entretien': return 'from-purple-500 to-violet-600';
      case 'Suivi': return 'from-cyan-500 to-teal-600';
      case 'Audit': return 'from-red-500 to-pink-600';
      case 'Contrôle': return 'from-yellow-500 to-orange-600';
      case 'Vérification': return 'from-teal-500 to-cyan-600';
      case 'Remblai Illícite': return 'from-red-500 to-orange-600';
      case 'Visite': return 'from-indigo-500 to-purple-600';
      case 'Surveillance': return 'from-blue-500 to-cyan-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const toggleSection = (status: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

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
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  const formatDateTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const timePart = timeString ? ` à ${timeString.substring(0, 5)}` : '';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + timePart;
    } catch {
      return dateString;
    }
  };

  // Calculer les jours écoulés depuis la date du rendez-vous
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

  // Calculer les statistiques par statut
  const getStatusStats = (status: string) => {
    const rdvs = groupedByStatus[status] || [];
    return {
      count: rdvs.length,
      today: rdvs.filter(rdv => {
        if (!rdv.date_rendez_vous) return false;
        const today = new Date().toISOString().split('T')[0];
        return rdv.date_rendez_vous === today;
      }).length,
      upcoming: rdvs.filter(rdv => {
        if (!rdv.date_rendez_vous) return false;
        const today = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);
        const rdvDate = new Date(rdv.date_rendez_vous);
        return rdvDate >= today && rdvDate <= weekFromNow;
      }).length,
      overdue: rdvs.filter(rdv => {
        if (!rdv.date_rendez_vous) return false;
        const today = new Date();
        const rdvDate = new Date(rdv.date_rendez_vous);
        return rdvDate < today && normalizeStatus(rdv.statut) === 'en attente';
      }).length,
      nearThreshold: status === 'En cours' ? rdvs.filter(rdv => {
        const days = getDaysElapsed(rdv.date_rendez_vous);
        return days !== null && days >= 2 && days <= 3;
      }).length : 0
    };
  };

  // Fonction pour obtenir les boutons d'action selon le statut
  const getActionButtons = (rdv: Rendezvous) => {
    const status = normalizeStatus(rdv.statut);
    const daysElapsed = getDaysElapsed(rdv.date_rendez_vous);
    
    switch (status) {
      case 'en attente':
        return (
          <button 
            onClick={() => checkSingleRendezvousStatus(rdv.id)}
            className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 mb-2"
            title="Vérifier si le statut doit être mis à jour"
          >
            <CheckSquare className="w-4 h-4" />
            Vérifier statut
          </button>
        );
        
      case 'en cours':
        return (
          <>
            <button 
              onClick={() => handleMarkAsFinished(rdv.id)}
              className="w-full py-2 text-sm font-medium text-green-600 hover:text-green-800 border border-green-200 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-1 mb-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Faire FT
            </button>
            
            {daysElapsed !== null && daysElapsed >= 2 && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium">{daysElapsed} jour{daysElapsed > 1 ? 's' : ''} écoulé{daysElapsed > 1 ? 's' : ''}</span>
                </div>
                <p className="mt-1">
                  {daysElapsed >= 3 
                    ? 'Doit être marqué comme "Non-comparution"'
                    : 'Proche du seuil des 3 jours'
                  }
                </p>
              </div>
            )}
          </>
        );
        
      case 'non-comparution':
        return (
          <button 
            onClick={() => handleSendMiseEnDemeure(rdv.id)}
            className="w-full py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 mb-2"
          >
            <Send className="w-4 h-4" />
            Envoyer la mise en demeure
          </button>
        );
        
      case 'fini':
        return null;
        
      default:
        return null;
    }
  };

  // Formater la date de dernière vérification
  const formatLastCheckTime = () => {
    if (!lastStatusCheck) return 'Jamais';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastStatusCheck.getTime()) / 1000);
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return lastStatusCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
      {/* Div contenant le formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {editingRendezvous ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </h2>
            <button 
              onClick={() => {
                setShowForm(false);
                setEditingRendezvous(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              ✕
            </button>
          </div>
          <p>Formulaire de rendez-vous à implémenter</p>
        </div>
      )}

      {/* En-tête et boutons */}
      {!showForm && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Rendez-vous terrain
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {filteredRendezvous.length} rendez-vous{filteredRendezvous.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-slate-600">Planification et suivi des visites sur site</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                <span>Vérification automatique: {checkerStatus?.isActive ? 'Activée' : 'Désactivée'}</span>
              </div>
              {lastStatusCheck && (
                <div className="flex items-center gap-1">
                  <History className="w-3 h-3" />
                  <span>Dernière vérification: {formatLastCheckTime()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
           

            
            <button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              Nouveau rendez-vous
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {!showForm && (
        <>
          {/* Cartes de statistiques par statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusOrder.map((status) => {
              const stats = getStatusStats(status);
              const rdvs = groupedByStatus[status] || [];
              
              return (
                <div 
                  key={status}
                  className={`p-4 rounded-xl border ${getStatusCardColor(status)} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => {
                    setStatusFilter(status === statusFilter ? 'Tous' : status);
                    if (!expandedSections[status]) {
                      toggleSection(status);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="font-semibold text-slate-800">
                        {getStatusDisplayName(status)}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusClasses(status)}`}>
                      {stats.count}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Aujourd'hui:</span>
                      <span className="font-medium text-slate-800">{stats.today}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cette semaine:</span>
                      <span className="font-medium text-slate-800">{stats.upcoming}</span>
                    </div>
                    
                    {status === 'En cours' && stats.nearThreshold > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          Proche seuil:
                        </span>
                        <span className="font-medium text-yellow-600">{stats.nearThreshold}</span>
                      </div>
                    )}
                    
                    {stats.overdue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">En retard:</span>
                        <span className="font-medium text-red-600">{stats.overdue}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                      {stats.count === 0 ? 'Aucun rendez-vous' : 
                       `Cliquez pour ${statusFilter === status ? 'voir tous' : 'filtrer'}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par ID, PV, FIFAFI, nom, lieu, infraction..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Tous">Tous les statuts</option>
                <option value="En attente">En attente</option>
                <option value="En cours">En cours</option>
                <option value="Non-comparution">Non-comparution</option>
                <option value="Fini">Fini</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Filter className="w-4 h-4" />
                Avancé
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" />
                Exporter
              </button>
            </div>

            {filteredRendezvous.length === 0 ? (
              <div className="text-center py-8">
                {rendezvous.length === 0 ? (
                  <div>
                    <p className="text-slate-500 mb-2">Aucun rendez-vous dans la base de données</p>
                    <button 
                      onClick={() => setShowForm(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Créer votre premier rendez-vous
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-500">Aucun rendez-vous ne correspond à votre recherche</p>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {statusOrder.map(status => {
                  const rdvs = groupedByStatus[status] || [];
                  if (rdvs.length === 0) return null;
                  
                  const isExpanded = expandedSections[status];
                  
                  return (
                    <div key={status} className={`rounded-lg overflow-hidden border ${getStatusBorderClasses(status)} bg-white`}>
                      {/* En-tête de section */}
                      <div 
                        className={`p-4 cursor-pointer flex justify-between items-center ${getStatusClasses(status)}`}
                        onClick={() => toggleSection(status)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <h3 className="font-bold text-lg">
                              {getStatusDisplayName(status)}
                            </h3>
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/50">
                              {rdvs.length} rendez-vous{rdvs.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isExpanded ? 
                            <ChevronUp className="w-5 h-5" /> : 
                            <ChevronDown className="w-5 h-5" />
                          }
                        </div>
                      </div>
                      
                      {/* Contenu de la section */}
                      {isExpanded && (
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rdvs.map((rdv) => {
                              const isOverdue = new Date(rdv.date_rendez_vous) < new Date() && normalizeStatus(rdv.statut) === 'en attente';
                              const isToday = rdv.date_rendez_vous === new Date().toISOString().split('T')[0];
                              const daysElapsed = getDaysElapsed(rdv.date_rendez_vous);
                              const isNearThreshold = normalizeStatus(rdv.statut) === 'en cours' && daysElapsed !== null && daysElapsed >= 2 && daysElapsed <= 3;
                              const isOverThreshold = normalizeStatus(rdv.statut) === 'en cours' && daysElapsed !== null && daysElapsed > 3;
                              
                              return (
                                <div
                                  key={rdv.id}
                                  className="group border border-slate-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all bg-white"
                                >
                                  <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getTypeColor(rdv.infraction)} flex items-center justify-center shadow-lg`}>
                                      <Calendar className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(rdv.statut)}`}>
                                        {rdv.statut}
                                      </span>
                                      {isOverdue && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                          En retard
                                        </span>
                                      )}
                                      {isToday && normalizeStatus(rdv.statut) === 'en attente' && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                          Aujourd'hui
                                        </span>
                                      )}
                                      {isNearThreshold && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                          {daysElapsed} jours
                                        </span>
                                      )}
                                      {isOverThreshold && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          {daysElapsed} jours
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {formatRendezvousTitle(rdv.infraction, rdv.iddescente)}
                                  </h3>

                                  <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-500">ID:</span>
                                      <span className="font-medium text-slate-700">RDV-{rdv.id}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Horaires:
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {formatDateTime(rdv.date_rendez_vous, rdv.heure_rendez_vous)}
                                      </span>
                                    </div>
                                    
                                    {daysElapsed !== null && normalizeStatus(rdv.statut) === 'en cours' && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Jours écoulés:</span>
                                        <span className={`font-medium ${daysElapsed >= 3 ? 'text-red-600' : 'text-slate-700'}`}>
                                          {daysElapsed} jour{daysElapsed > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-500 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Verbalisateur:
                                      </span>
                                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                                        {rdv.nom_verbalisateur || 'Non spécifié'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Lieu:
                                      </span>
                                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                                        {[rdv.commune, rdv.fokontany, rdv.district].filter(Boolean).join(', ') || 'Non spécifié'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-500">Type:</span>
                                      <span className="font-medium text-slate-700">
                                        {getTypeFromInfraction(rdv.infraction)}
                                      </span>
                                    </div>
                                    
                                    {rdv.n_pv_pat && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">PV PAT:</span>
                                        <span className="font-medium text-slate-700">
                                          {rdv.n_pv_pat}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {rdv.contact_r && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Contact:</span>
                                        <span className="font-medium text-slate-700">
                                          {rdv.contact_r}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {rdv.created_at && (
                                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                                        <span>Créé le:</span>
                                        <span>{formatDate(rdv.created_at)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Boutons d'action */}
                                  <div className="space-y-2">
                                    {getActionButtons(rdv)}
                                    
                                    {/* Bouton Supprimer pour tous les statuts */}
                                    <button 
                                      onClick={() => handleDelete(rdv.id)}
                                      className="w-full py-2 text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Légende et informations */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-slate-600">En attente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-slate-600">En cours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm text-slate-600">Non-comparution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-slate-600">Fini</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600 space-y-1">
                    <p className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>Vérification automatique: toutes les 30 minutes</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span>Rendez-vous "En cours" → "Non-comparution" après 3 jours</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 text-green-500" />
                      <span>Dernière vérification: {lastStatusCheck ? formatLastCheckTime() : 'En attente'}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={fetchRendezvous}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Actualiser les données →
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => checkOverdueRendezvous(true)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Marquer tous les retards
                    </button>
                  </div>
                </div>
              </div>
              
              {/* État du vérificateur */}
              {checkerStatus && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${checkerStatus.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700">
                        Vérificateur automatique: {checkerStatus.isActive ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {checkerStatus.isChecking ? 'Vérification en cours...' : 
                       checkerStatus.next_check_estimated ? 
                       `Prochaine vérification: ${new Date(checkerStatus.next_check_estimated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 
                       'Horaire non disponible'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RendezvousFT;