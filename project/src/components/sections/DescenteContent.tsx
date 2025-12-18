import { 
  Clipboard, Calendar, MapPin, User, Plus, Search, 
  FileText, Clock, Phone, Navigation, Ruler, 
  AlertCircle, FileSignature, Package, Trash2, X,
  CheckSquare, ChevronLeft, ChevronRight, Eye, Edit,
  Download, Filter, RefreshCw, FileWarning, CheckCircle,
  XCircle, FileCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import FormulaireDescente from '../sections/RapportContent';
import toast from 'react-hot-toast';

// Définir le type Descente basé sur les données de l'API
interface Descente {
  id?: number;
  // Champs retournés par l'API
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
  // Champs optionnels de l'interface précédente
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous?: string;
  heure_rendez_vous?: string;
  personne_r?: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  x_coord?: string;
  y_coord?: string;
  infraction?: string;
  actions?: string;
  dossier_a_fournir?: string[];
  createdAt?: string;
  updatedAt?: string;
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
  type?: 'danger' | 'warning' | 'info';
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

// Fonction utilitaire pour afficher n'importe quelle valeur
const displayValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? '-' : trimmed;
  }
  
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.join(', ');
  }
  
  return String(value);
};

export default function DescenteContent() {
  const [descentes, setDescentes] = useState<Descente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDescente, setEditingDescente] = useState<Descente | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDescente, setSelectedDescente] = useState<Descente | null>(null);
  
  // États pour la pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // États pour les modals de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  // Récupérer les données depuis l'API
  useEffect(() => {
    fetchDescentes();
  }, []);

  const fetchDescentes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/descentes');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Données reçues de l\'API:', data);
      
      // Ajouter un id basé sur l'index si non présent
      const dataWithIds = data.map((item: Descente, index: number) => ({
        ...item,
        id: index + 1
      }));
      
      setDescentes(dataWithIds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir le modal de confirmation
  const openConfirmation = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
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

  // Gérer la soumission du formulaire
  const handleSubmitDescente = async (formData: any) => {
    try {
      const url = editingDescente && editingDescente.id
        ? `http://localhost:3000/api/descentes/${editingDescente.id}`
        : 'http://localhost:3000/api/descentes';
      
      const method = editingDescente ? 'PUT' : 'POST';
      
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

      // Recharger les données
      fetchDescentes();
      setShowForm(false);
      setEditingDescente(null);
      toast.success('Descente sauvegardée avec succès!');
      
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Gérer l'édition
  const handleEdit = (descente: Descente) => {
    setEditingDescente(descente);
    setShowForm(true);
  };

  // Gérer la visualisation
  const handleViewDetails = (descente: Descente) => {
    setSelectedDescente(descente);
    setShowModal(true);
  };

  // Gérer la suppression avec confirmation
  const handleDelete = (id: number) => {
    openConfirmation(
      'Supprimer la descente',
      'Êtes-vous sûr de vouloir supprimer cette descente ? Cette action est irréversible.',
      async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/descentes/${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error('Erreur lors de la suppression');
          }
          
          fetchDescentes();
          toast.success('Descente supprimée avec succès!');
        } catch (err) {
          console.error('Erreur suppression:', err);
          toast.error('Erreur lors de la suppression');
        }
      },
      'danger'
    );
  };

  // Filtrer les descentes
  const filteredDescentes = descentes.filter(descente => {
    if (!descente) return false;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      displayValue(descente.id).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.n_pv_pat).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.n_fifafi).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.nom_verbalisateur).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.nom_pers).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.comm).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.reference).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.localisation).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.dist).toLowerCase().includes(searchTermLower);
    
    return matchesSearch;
  });

  // Formater la date pour l'affichage
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Formater l'heure pour l'affichage
  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    
    try {
      // Si l'heure est au format HH:MM:SS
      if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  // Gérer le changement de taille de page
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Gérer l'export
  const handleExport = () => {
    const dataToExport = filteredDescentes;
    const headers = ['ID', 'Référence', 'Date Descente', 'Heure', 'PV PAT', 'FIFAFI', 'Verbalisateur', 'Personne', 'Commune', 'Infraction', 'Superficie'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(descente => [
        `DS-${descente.id || '-'}`,
        `"${displayValue(descente.reference)}"`,
        `"${formatDate(descente.date)}"`,
        `"${formatTime(descente.heure)}"`,
        `"${displayValue(descente.n_pv_pat)}"`,
        `"${displayValue(descente.n_fifafi)}"`,
        `"${displayValue(descente.nom_verbalisateur)}"`,
        `"${displayValue(descente.nom_pers)}"`,
        `"${displayValue(descente.comm)}"`,
        `"${displayValue(descente.constat)}"`,
        `"${displayValue(descente.superficie)}"`
      ].join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `descentes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Export CSV réussi!');
  };

  // Calculer les indices pour la pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredDescentes.length);
  const totalPages = Math.ceil(filteredDescentes.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des données...</p>
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
          onClick={fetchDescentes}
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

      {/* Div contenant le formulaire - affiché/masqué selon l'état */}
      {showForm && (
        <FormulaireDescente
          onClose={() => {
            setShowForm(false);
            setEditingDescente(null);
          }}
          onSubmit={handleSubmitDescente}
          initialData={editingDescente || undefined}
        />
      )}

      {/* Modal de visualisation */}
      {showModal && selectedDescente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Détails de la Descente DS-{selectedDescente.id || '-'}</h2>
                <p className="text-slate-600 text-sm mt-1">Référence: {displayValue(selectedDescente.reference)}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div id="visualisation-modal" className="p-6 space-y-6">
              {/* Section Dates */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Dates et heures
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Descente</label>
                    <p className="text-slate-900 font-medium">{formatDate(selectedDescente.date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heure Descente</label>
                    <p className="text-slate-900 font-medium">{formatTime(selectedDescente.heure)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Rendez-vous</label>
                    <p className="text-slate-900 font-medium">{formatDate(selectedDescente.date_rdv_ft)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heure Rendez-vous</label>
                    <p className="text-slate-900 font-medium">{formatTime(selectedDescente.heure_rdv_ft)}</p>
                  </div>
                </div>
              </div>

              {/* Section Verbalisation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Verbalisation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type Verbalisateur</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.type_verbalisateur)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom Verbalisateur</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.nom_verbalisateur)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PV PAT</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.n_pv_pat)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">FIFAFI</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.n_fifafi)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modèle PV</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.modele_pv)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Référence</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.reference)}</p>
                  </div>
                </div>
              </div>

              {/* Section Personne concernée */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personne concernée
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de personne</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.pers_verb)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.nom_pers)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.adresse)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.contact)}</p>
                  </div>
                </div>
              </div>

              {/* Section Localisation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Localisation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.dist)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Commune</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.comm)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fokontany</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.fkt)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Localisation précise</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.localisation)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Superficie</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.superficie)} m²</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coordonnée X</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.x)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coordonnée Y</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.y)}</p>
                  </div>
                </div>
              </div>

              {/* Section Infraction & Actions */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Infraction & Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Infraction(s)</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.constat)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Action(s)</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.action)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pièces à fournir</label>
                    <p className="text-slate-900 font-medium">{displayValue(selectedDescente.pieces_a_fournir)}</p>
                  </div>
                </div>
              </div>

              {/* Section Statut */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Statut
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statut de la descente</label>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedDescente.statut_descente === 'Fini' 
                      ? 'bg-green-100 text-green-800'
                      : selectedDescente.statut_descente === 'En cours'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {displayValue(selectedDescente.statut_descente)}
                  </div>
                </div>
              </div>

              {/* Section Polygone */}
              {selectedDescente.has_polygon && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    Polygone
                  </h3>
                  <div className="space-y-2">
                    <p className="text-slate-700">Cette descente a un polygone géoréférencé.</p>
                    <p className="text-sm text-slate-600">
                      {selectedDescente.polygon_points 
                        ? `${selectedDescente.polygon_points.length} points définis`
                        : 'Polygone disponible'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleEdit(selectedDescente);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête et bouton - masqué quand le formulaire est affiché */}
      {!showForm && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Descente sur terrain</h1>
            <p className="text-slate-600">Gestion des inspections et visites de terrain</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouvelle descente
          </button>
        </div>
      )}

      {/* Cartes de statistiques */}
      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: 'Total', 
              value: filteredDescentes.length, 
              icon: <Clipboard className="w-6 h-6 text-blue-600" />,
              bgColor: 'bg-blue-100',
              textColor: 'text-blue-700'
            },
            { 
              label: 'Avec PV', 
              value: filteredDescentes.filter(d => d.n_pv_pat && d.n_pv_pat !== '-').length, 
              icon: <FileText className="w-6 h-6 text-green-600" />,
              bgColor: 'bg-green-100',
              textColor: 'text-green-700'
            },
            { 
              label: 'Avec FIFAFI', 
              value: filteredDescentes.filter(d => d.n_fifafi && d.n_fifafi !== '-').length, 
              icon: <FileSignature className="w-6 h-6 text-orange-600" />,
              bgColor: 'bg-orange-100',
              textColor: 'text-orange-700'
            },
            { 
              label: 'Avec Polygone', 
              value: filteredDescentes.filter(d => d.has_polygon).length, 
              icon: <MapPin className="w-6 h-6 text-purple-600" />,
              bgColor: 'bg-purple-100',
              textColor: 'text-purple-700'
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
      )}

      {/* Contenu principal (tableau) - masqué quand le formulaire est affiché */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par PV, FIFAFI, nom, commune, référence..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

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
                disabled={filteredDescentes.length === 0}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>

              <button 
                onClick={fetchDescentes}
                className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>

          {filteredDescentes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchTerm ? 'Aucune descente trouvée' : 'Aucune descente enregistrée'}
              </h3>
              <p className="text-slate-500 mb-4">
                {searchTerm 
                  ? 'Aucune descente ne correspond à vos critères de recherche.' 
                  : 'Commencez par créer votre première descente.'}
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Créer une descente
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        PV / FIFAFI
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Dates
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Verbalisation
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Localisation
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Infraction
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredDescentes.slice(startIndex, endIndex).map((descente, index) => {
                      const descenteId = descente.id || startIndex + index + 1;
                      
                      return (
                        <tr key={descenteId} className="hover:bg-slate-50 transition-colors">
                          {/* ID Descente */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mr-3">
                                <Clipboard className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">DS-{descenteId}</div>
                                <div className="text-xs text-slate-500">{displayValue(descente.reference)}</div>
                              </div>
                            </div>
                          </td>

                          {/* PV / FIFAFI */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {descente.n_pv_pat && descente.n_pv_pat !== '-' && (
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                  <span className="text-sm font-medium text-slate-900">
                                    {displayValue(descente.n_pv_pat)}
                                  </span>
                                </div>
                              )}
                              {descente.n_fifafi && descente.n_fifafi !== '-' && (
                                <div className="flex items-center">
                                  <FileSignature className="w-4 h-4 mr-2 text-green-500" />
                                  <span className="text-sm text-slate-700">
                                    {displayValue(descente.n_fifafi)}
                                  </span>
                                </div>
                              )}
                              {(!descente.n_pv_pat || descente.n_pv_pat === '-') && 
                               (!descente.n_fifafi || descente.n_fifafi === '-') && (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <div>
                                <div className="text-sm text-slate-900">
                                  {formatDate(descente.date)}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(descente.heure)}
                                </div>
                              </div>
                              {descente.date_rdv_ft && (
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="text-xs text-orange-700 font-medium">
                                    RDV: {formatDate(descente.date_rdv_ft)}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {formatTime(descente.heure_rdv_ft)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Verbalisation */}
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {displayValue(descente.nom_verbalisateur)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {displayValue(descente.type_verbalisateur)}
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-100">
                                <div className="text-sm text-slate-700">
                                  {displayValue(descente.nom_pers)}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {displayValue(descente.contact)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Localisation */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900">
                                {displayValue(descente.comm)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {displayValue(descente.fkt)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Dist: {displayValue(descente.dist)}
                              </div>
                              {descente.superficie && descente.superficie !== '-' && (
                                <div className="text-xs text-slate-500 flex items-center">
                                  <Ruler className="w-3 h-3 mr-1" />
                                  {displayValue(descente.superficie)} m²
                                </div>
                              )}
                              {descente.has_polygon && (
                                <div className="text-xs text-green-600 flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Polygone
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Infraction */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-red-700">
                                {displayValue(descente.constat)}
                              </div>
                              <div className="text-xs text-slate-700">
                                {displayValue(descente.action)}
                              </div>
                              {descente.pieces_a_fournir && descente.pieces_a_fournir.length > 0 && (
                                <div className="text-xs text-blue-600 flex items-center">
                                  <Package className="w-3 h-3 mr-1" />
                                  {descente.pieces_a_fournir.length} pièce(s)
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(descente)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(descente)}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(descenteId)}
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
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6">
                <div className="text-sm text-slate-600 mb-4 sm:mb-0">
                  Affichage de {startIndex + 1} à {endIndex} sur {filteredDescentes.length} résultat{filteredDescentes.length !== 1 ? 's' : ''}
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
      )}
    </div>
  );
}