import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Filter, Download, Users, MapPin, Clock, 
  Search, Trash2, CheckCircle, 
  Clock as ClockIcon, AlertCircle, XCircle, CheckCircle2, 
  PlayCircle, UserX, FileText, Send, RefreshCw, CheckSquare,
  AlertTriangle, History, FileCheck, X, FileSignature,
  ClipboardCheck, FileX, FileEdit, ChevronLeft, ChevronRight,
  Eye, Edit, Mail, Bell, Calendar as CalendarIcon, ClockIcon as ClockIcon2
} from 'lucide-react';
import FaireFTModal from '../sections/FaireFTModal';
import toast from 'react-hot-toast';

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

interface FtData {
  observations: string;
  conclusion: string;
  documents: File[];
  date_ft: string;
  pv_number: string;
  status: string;
}

// Interface pour le modal de mise en demeure
interface MiseEnDemeureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDate: string, newTime: string) => void;
  rendezvous: Rendezvous | null;
}

// Interface pour le modal de confirmation
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

// Composant Modal de Mise en Demeure
function MiseEnDemeureModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  rendezvous 
}: MiseEnDemeureModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rendezvous && isOpen) {
      // Définir la nouvelle date à aujourd'hui + 7 jours par défaut
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setNewDate(nextWeek.toISOString().split('T')[0]);
      setNewTime('09:00');
    }
  }, [rendezvous, isOpen]);

  if (!isOpen || !rendezvous) return null;

  const handleSubmit = () => {
    if (!newDate || !newTime) {
      toast.error('Veuillez renseigner une date et une heure');
      return;
    }

    setLoading(true);
    onConfirm(newDate, newTime);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">

        {/* En-tête */}
        <div className="p-6 bg-red-50 border-b border-red-200 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">Envoyer une mise en demeure</h3>
              <p className="text-sm text-slate-600 mt-1">Rendez-vous RDV-{rendezvous.id}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Informations du rendez-vous */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 mb-3">Informations du rendez-vous</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Personne concernée:</span>
                <span className="font-medium">{rendezvous.nom_personne_r || 'Non spécifié'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date prévue:</span>
                <span className="font-medium">{formatDate(rendezvous.date_rendez_vous)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Heure prévue:</span>
                <span className="font-medium">{formatTime(rendezvous.heure_rendez_vous)}</span>
              </div>
             
            </div>
          </div>

          {/* Nouvelle date */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 mb-3">Fixer une nouvelle date</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Nouvelle date *
                  </span>
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <ClockIcon2 className="w-4 h-4" />
                    Nouvelle heure *
                  </span>
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !newDate || !newTime}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer la mise en demeure
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Modal de Confirmation
function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler",
  onConfirm, 
  onCancel,
  type = 'warning'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getTypeColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-100',
          text: 'text-red-600',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700',
          icon: <AlertCircle className="w-6 h-6 text-red-600" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-600',
          border: 'border-yellow-200',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: <AlertCircle className="w-6 h-6 text-yellow-600" />
        };
      case 'success':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600',
          border: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700',
          icon: <CheckCircle className="w-6 h-6 text-green-600" />
        };
      default:
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600',
          border: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700',
          icon: <CheckSquare className="w-6 h-6 text-blue-600" />
        };
    }
  };

  const colors = getTypeColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className={`p-6 ${colors.bg} ${colors.border} border-b rounded-t-xl`}>
          <div className="flex items-center gap-3">
            {colors.icon}
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-700 mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 ${colors.button} text-white rounded-lg transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

function RendezvousFT() {
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [editingRendezvous, setEditingRendezvous] = useState<Rendezvous | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [checkerStatus, setCheckerStatus] = useState<{
    isActive: boolean;
    isChecking: boolean;
    last_check?: string;
    next_check_estimated?: string;
  } | null>(null);

  // États pour le modal FT
  const [showFTModal, setShowFTModal] = useState(false);
  const [selectedRendezvous, setSelectedRendezvous] = useState<Rendezvous | null>(null);
  const [ftData, setFtData] = useState<FtData>({
    observations: '',
    conclusion: '',
    documents: [] as File[],
    date_ft: new Date().toISOString().split('T')[0],
    pv_number: '',
    status: 'terminé'
  });

  // États pour la pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // États pour les modals de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  // États pour le modal de mise en demeure
  const [miseEnDemeureModal, setMiseEnDemeureModal] = useState<{
    isOpen: boolean;
    rendezvous: Rendezvous | null;
  }>({
    isOpen: false,
    rendezvous: null
  });

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
          toast.success(`Statut mis à jour: ${data.oldStatus} → ${data.newStatus}\nRaison: ${data.reason}`);
          fetchRendezvous();
        } else {
          toast(`Aucune mise à jour nécessaire. Statut actuel: ${data.currentStatus}\nRaison: ${data.reason}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du rendez-vous:', err);
      toast.error('Erreur lors de la vérification du statut');
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
          
          toast.success(message);
          
          if (autoUpdate || data.updatedCount > 0) {
            fetchRendezvous();
          }
        } else {
          toast('Aucun rendez-vous "En cours" depuis plus de 3 jours');
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification des rendez-vous en retard:', err);
      toast.error('Erreur lors de la vérification des rendez-vous en retard');
    }
  };

  // Gérer la suppression
  const handleDelete = async (id: number) => {
    openConfirmation(
      'Supprimer le rendez-vous',
      'Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.',
      async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error('Erreur lors de la suppression');
          }
          
          fetchRendezvous();
          toast.success('Rendez-vous supprimé avec succès');
        } catch (err) {
          console.error('Erreur suppression:', err);
          toast.error('Erreur lors de la suppression');
        }
      },
      'danger'
    );
  };

  // Fonction pour ouvrir le modal de confirmation
  const openConfirmation = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' | 'success' = 'warning') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      type
    });
  };

  // Fonction pour marquer comme Fini
  const handleMarkAsFinished = async (id: number) => {
    openConfirmation(
      'Marquer comme terminé',
      'Marquer ce rendez-vous comme terminé ?',
      async () => {
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
          toast.success('Rendez-vous marqué comme terminé');
        } catch (err) {
          console.error('Erreur:', err);
          toast.error('Erreur lors de la mise à jour du statut');
        }
      }
    );
  };

  // Fonction pour ouvrir le modal de mise en demeure
  const openMiseEnDemeureModal = (rdv: Rendezvous) => {
    setMiseEnDemeureModal({
      isOpen: true,
      rendezvous: rdv
    });
  };

  // Fonction pour envoyer la mise en demeure
  const handleSendMiseEnDemeure = async (id: number, newDate: string, newTime: string) => {
    try {
      console.log('📤 Envoi de la mise en demeure pour le rendez-vous:', id);
      console.log('📅 Nouvelle date:', newDate);
      console.log('⏰ Nouvelle heure:', newTime);

      // Construire les données à envoyer
      const mandatData = {
        date_rendez_vous: newDate,
        heure_rendez_vous: newTime,
        // Le backend devra modifier le statut de "Non-comparution" à "En cours"
      };

      const response = await fetch(`http://localhost:3000/api/rendezvousft/${id}/mandat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mandatData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur détaillée:', errorText);
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Mise en demeure envoyée:', result);

      // Fermer le modal et actualiser les données
      setMiseEnDemeureModal({ isOpen: false, rendezvous: null });
      fetchRendezvous();
      
      toast.success('Mise en demeure envoyée avec succès. Le statut est maintenant "En cours".');

    } catch (err) {
      console.error('Erreur lors de l\'envoi de la mise en demeure:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la mise en demeure');
    }
  };

  // Fonction pour ouvrir le modal FT
  const handleOpenFTModal = (rdv?: Rendezvous) => {
    if (rdv) {
      setSelectedRendezvous(rdv);
      // Pré-remplir les données si disponible
      setFtData(prev => ({
        ...prev,
        pv_number: rdv.n_pv_pat || `FT-${rdv.id}-${new Date().getFullYear()}`,
        date_ft: new Date().toISOString().split('T')[0]
      }));
    } else {
      // Si aucun rendez-vous spécifique n'est sélectionné
      setSelectedRendezvous(null);
    }
    setShowFTModal(true);
  };

  // Fonction pour fermer le modal FT
  const handleCloseFTModal = () => {
    setShowFTModal(false);
    setSelectedRendezvous(null);
    setFtData({
      observations: '',
      conclusion: '',
      documents: [],
      date_ft: new Date().toISOString().split('T')[0],
      pv_number: '',
      status: 'terminé'
    });
  };

  // Fonction pour soumettre le FT
  const handleSubmitFT = async () => {
    if (!selectedRendezvous) {
      toast.error('Veuillez sélectionner un rendez-vous');
      return;
    }

    try {
      // Créer un FormData pour envoyer les fichiers
      const formData = new FormData();
      formData.append('rendezvous_id', selectedRendezvous.id.toString());
      formData.append('observations', ftData.observations);
      formData.append('conclusion', ftData.conclusion);
      formData.append('date_ft', ftData.date_ft);
      formData.append('pv_number', ftData.pv_number);
      formData.append('status', ftData.status);
      
      // Ajouter les fichiers
      ftData.documents.forEach((file, index) => {
        formData.append(`documents[${index}]`, file);
      });

      const response = await fetch('http://localhost:3000/api/rendezvousft/ft', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la soumission du FT');
      }

      const result = await response.json();
      console.log('✅ FT soumis avec succès:', result);
      
      // Mettre à jour le statut du rendez-vous
      await handleMarkAsFinished(selectedRendezvous.id);
      
      toast.success('Procès-verbal de fin de traitement créé avec succès');
      handleCloseFTModal();
      
    } catch (err) {
      console.error('Erreur lors de la soumission du FT:', err);
      toast.error('Erreur lors de la création du procès-verbal');
    }
  };

  // Fonction pour gérer les fichiers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFtData(prev => ({
        ...prev,
        documents: [...prev.documents, ...filesArray]
      }));
    }
  };

  // Fonction pour supprimer un fichier
  const handleRemoveFile = (index: number) => {
    setFtData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Redémarrer le vérificateur automatique
  const restartChecker = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rendezvousft/checker/restart', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Vérificateur automatique redémarré');
        fetchCheckerStatus();
      }
    } catch (err) {
      console.error('Erreur lors du redémarrage du vérificateur:', err);
      toast.error('Erreur lors du redémarrage');
    }
  };

  // Arrêter le vérificateur automatique
  const stopChecker = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rendezvousft/checker/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Vérificateur automatique arrêté');
        fetchCheckerStatus();
      }
    } catch (err) {
      console.error('Erreur lors de l\'arrêt du vérificateur:', err);
      toast.error('Erreur lors de l\'arrêt');
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

  // Grouper par statut pour les statistiques
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

  // Fonctions pour les styles des statuts
  const getStatusClasses = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'en cours': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'non-comparution': return 'bg-red-100 text-red-800 border-red-200';
      case 'fini': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const statut = normalizeStatus(status);
    switch (statut) {
      case 'en attente': return <ClockIcon className="w-3 h-3 mr-1" />;
      case 'en cours': return <PlayCircle className="w-3 h-3 mr-1" />;
      case 'non-comparution': return <UserX className="w-3 h-3 mr-1" />;
      case 'fini': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      default: return <AlertCircle className="w-3 h-3 mr-1" />;
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

  // Calculer les indices pour la pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRendezvous.length);
  const totalPages = Math.ceil(filteredRendezvous.length / pageSize);

  // Gérer le changement de taille de page
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
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

  // Fonction pour gérer l'export
  const handleExport = () => {
    const dataToExport = filteredRendezvous;
    const headers = ['ID', 'Date', 'Heure', 'Personne', 'Lieu', 'Type', 'Statut', 'Jours écoulés'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(rdv => [
        `RDV-${rdv.id}`,
        formatDate(rdv.date_rendez_vous),
        formatTime(rdv.heure_rendez_vous),
        rdv.nom_personne_r || '',
        [rdv.commune, rdv.fokontany].filter(Boolean).join(', '),
        getTypeFromInfraction(rdv.infraction),
        getStatusDisplayName(rdv.statut),
        getDaysElapsed(rdv.date_rendez_vous) || '0'
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
      {/* Modal de confirmation */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
        confirmText="Confirmer"
        cancelText="Annuler"
      />

      {/* Modal de mise en demeure */}
      <MiseEnDemeureModal
        isOpen={miseEnDemeureModal.isOpen}
        onClose={() => setMiseEnDemeureModal({ isOpen: false, rendezvous: null })}
        onConfirm={(newDate, newTime) => {
          if (miseEnDemeureModal.rendezvous) {
            handleSendMiseEnDemeure(miseEnDemeureModal.rendezvous.id, newDate, newTime);
          }
        }}
        rendezvous={miseEnDemeureModal.rendezvous}
      />

      {showFTModal && (
        <FaireFTModal
          selectedRendezvous={selectedRendezvous}
          ftData={ftData}
          setFtData={setFtData}
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
          handleSubmitFT={handleSubmitFT}
          handleCloseFTModal={handleCloseFTModal}
        />
      )}

      {/* En-tête - Style FicheContent */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Rendez-vous terrain</h1>
          <p className="text-slate-600">Planification et suivi des visites sur site</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.href = '/rendezvous/nouveau'}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouveau rendez-vous
          </button>
          
          <button 
            onClick={checkAndUpdateStatus}
            disabled={checkingStatus}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {checkingStatus ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Vérification...
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                Vérifier statuts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cartes de statistiques - Style FicheContent */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total', 
            value: filteredRendezvous.length, 
            icon: <Calendar className="w-6 h-6 text-blue-600" />,
            bgColor: 'bg-blue-100',
            textColor: 'text-slate-900'
          },
          { 
            label: 'En attente', 
            value: groupedByStatus['En attente']?.length || 0, 
            icon: <ClockIcon className="w-6 h-6 text-yellow-600" />,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700'
          },
          { 
            label: 'En cours', 
            value: groupedByStatus['En cours']?.length || 0, 
            icon: <PlayCircle className="w-6 h-6 text-blue-600" />,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700'
          },
          { 
            label: 'Non-comparution', 
            value: groupedByStatus['Non-comparution']?.length || 0, 
            icon: <UserX className="w-6 h-6 text-red-600" />,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700'
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

      {/* Tableau principal - Style FicheContent */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Barre de recherche et filtres */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par ID, PV, nom, lieu..."
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
            onClick={() => checkOverdueRendezvous()}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Vérifier retards
          </button>

          <button 
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={handleExport}
            disabled={filteredRendezvous.length === 0}
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {filteredRendezvous.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm ? 'Aucun rendez-vous trouvé' : 'Aucun rendez-vous enregistré'}
            </h3>
            <p className="text-slate-500">
              {searchTerm 
                ? 'Aucun rendez-vous ne correspond à vos critères de recherche.' 
                : 'Commencez par créer votre premier rendez-vous.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Date/Heure
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Jours écoulés
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRendezvous.slice(startIndex, endIndex).map((rdv) => {
                    const daysElapsed = getDaysElapsed(rdv.date_rendez_vous);
                    const isOverThreshold = normalizeStatus(rdv.statut) === 'en cours' && daysElapsed !== null && daysElapsed > 3;
                    const isNearThreshold = normalizeStatus(rdv.statut) === 'en cours' && daysElapsed !== null && daysElapsed >= 2 && daysElapsed <= 3;
                    
                    return (
                      <tr key={rdv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">RDV-{rdv.id}</div>
                              <div className="text-xs text-slate-500">DS-{rdv.iddescente}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatDate(rdv.date_rendez_vous)}</div>
                          <div className="text-xs text-slate-500">{formatTime(rdv.heure_rendez_vous)}</div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {getTypeFromInfraction(rdv.infraction)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center ${getStatusClasses(rdv.statut)}`}>
                            {getStatusIcon(rdv.statut)}
                            {getStatusDisplayName(rdv.statut)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          {daysElapsed !== null && (
                            <div className="flex items-center">
                              <span className={`text-sm font-medium ${
                                isOverThreshold ? 'text-red-600' : 
                                isNearThreshold ? 'text-yellow-600' : 
                                'text-slate-600'
                              }`}>
                                {daysElapsed} jour{daysElapsed > 1 ? 's' : ''}
                              </span>
                              {isOverThreshold && (
                                <AlertTriangle className="w-4 h-4 ml-2 text-red-500" />
                              )}
                              {isNearThreshold && (
                                <AlertTriangle className="w-4 h-4 ml-2 text-yellow-500" />
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {/* Bouton Mise en demeure pour les statuts "Non-comparution" */}
                            {normalizeStatus(rdv.statut) === 'non-comparution' && (
                              <button
                                onClick={() => openMiseEnDemeureModal(rdv)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Envoyer mise en demeure"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Bouton Faire FT pour les statuts "En cours" */}
                            {normalizeStatus(rdv.statut) === 'en cours' && (
                              <button
                                onClick={() => handleOpenFTModal(rdv)}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Faire FT"
                              >
                                <FileSignature className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Bouton Vérifier statut pour tous */}
                            <button
                              onClick={() => checkSingleRendezvousStatus(rdv.id)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Vérifier statut"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            
                            {/* Bouton Supprimer pour tous */}
                            <button
                              onClick={() => handleDelete(rdv.id)}
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
            
            {/* Pagination - Style FicheContent */}
            <div className="flex items-center justify-between mt-6">
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

      {/* Informations de suivi */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
                <Mail className="w-4 h-4 text-red-500" />
                <span>Mise en demeure : "Non-comparution" → "En cours" après envoi</span>
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
            <button 
              onClick={() => checkOverdueRendezvous(true)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Marquer tous les retards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RendezvousFT;