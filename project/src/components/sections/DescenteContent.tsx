import { 
  Clipboard, Calendar, MapPin, User, Plus, Search, 
  FileText, Clock, Phone, Navigation, Ruler, 
  AlertCircle, FileSignature, Package, Trash2, X,
  CheckSquare
} from 'lucide-react';
import { useState, useEffect } from 'react';
import FormulaireDescente from '../sections/RapportContent';

// Définir le type Descente
interface Descente {
  id: number;
  date_desce?: string;
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous?: string;
  heure_rendez_vous?: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  type_verbalisateur?: string;
  nom_verbalisateur?: string;
  personne_r?: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  localisation?: string;
  superficie?: string;
  x_coord?: string;
  y_coord?: string;
  infraction?: string;
  actions?: string;
  modele_pv?: string;
  reference?: string;
  contact_r?: string;
  adresse_r?: string;
  dossier_a_fournir?: string | any;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Fonction utilitaire pour afficher n'importe quelle valeur
const displayValue = (value: any): string => {
  if (value === null || value === undefined) return 'N/A';
  
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    if (value.documents) return String(value.documents);
    if (value.urgent) return String(value.urgent);
    return JSON.stringify(value);
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
      
      if (data.length > 0) {
        console.log('🔍 Structure du premier élément:');
        Object.keys(data[0]).forEach(key => {
          console.log(`  ${key}:`, data[0][key], `(type: ${typeof data[0][key]})`);
        });
      }
      
      setDescentes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmitDescente = async (formData: any) => {
    try {
      const url = editingDescente 
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
      
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      alert('Erreur lors de la sauvegarde');
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

  // Gérer la suppression
  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette descente ?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/descentes/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression');
        }
        
        fetchDescentes();
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
    }
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
      displayValue(descente.nom_personne_r).toLowerCase().includes(searchTermLower) ||
      displayValue(descente.commune).toLowerCase().includes(searchTermLower);
    
    return matchesSearch;
  });

  // Formater la date pour l'affichage
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Détails de la Descente DS-{selectedDescente.id}</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div id="visualisation-modal" className="p-6 space-y-6">
              {/* Section Dates */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Descente</label>
                    <p className="text-slate-900">{formatDate(selectedDescente.date_descente || selectedDescente.date_desce)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heure Descente</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.heure_descente)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Rendez-vous</label>
                    <p className="text-slate-900">{formatDate(selectedDescente.date_rendez_vous)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heure Rendez-vous</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.heure_rendez_vous)}</p>
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
                    <p className="text-slate-900">{displayValue(selectedDescente.type_verbalisateur)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom Verbalisateur</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.nom_verbalisateur)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PV PAT</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.n_pv_pat)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">FIFAFI</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.n_fifafi)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modèle PV</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.modele_pv)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Référence</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.reference)}</p>
                  </div>
                </div>
              </div>

              {/* Section Personne */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personne Concernée
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.personne_r)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.nom_personne_r)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.adresse_r)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.contact_r)}</p>
                  </div>
                </div>
              </div>

              {/* Section Localisation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Localisation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.district)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Commune</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.commune)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fokontany</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.fokontany)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.localisation)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">X Coord</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.x_coord)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Y Coord</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.y_coord)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Superficie</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.superficie)}</p>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Infraction</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.infraction)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Actions</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.actions)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dossier à Fournir</label>
                    <p className="text-slate-900">{displayValue(selectedDescente.dossier_a_fournir)}</p>
                  </div>
                </div>
              </div>

              {/* Dates de création/mise à jour */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Métadonnées
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Créé le</label>
                    <p className="text-slate-900">{formatDate(selectedDescente.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mis à jour le</label>
                    <p className="text-slate-900">{formatDate(selectedDescente.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* En-tête et bouton - masqué quand le formulaire est affiché */}
      {!showForm && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Descente sur terrain
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {filteredDescentes.length} descente{filteredDescentes.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-slate-600">Gestion des inspections et visites de terrain</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouvelle descente
          </button>
        </div>
      )}

      {/* Contenu principal (tableau) - masqué quand le formulaire est affiché */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par ID, PV, FIFAFI, nom..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredDescentes.length === 0 ? (
            <div className="text-center py-8">
              {descentes.length === 0 ? (
                <div>
                  <p className="text-slate-500 mb-2">Aucune descente dans la base de données</p>
                  <button 
                    onClick={() => setShowForm(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Créer votre première descente
                  </button>
                </div>
              ) : (
                <p className="text-slate-500">Aucune descente ne correspond à votre recherche</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ID Descente</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">PV / FIFAFI</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dates</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Verbalisation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Localisation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Infraction</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDescentes.map((descente) => (
                    <tr key={descente.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {/* ID Descente */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Clipboard className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-medium text-slate-900 block">DS-{descente.id}</span>
                            <span className="text-xs text-slate-500">
                              {displayValue(descente.reference)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PV / FIFAFI */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-900">
                              {displayValue(descente.n_pv_pat)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-slate-700">
                              {displayValue(descente.n_fifafi)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Modèle: {displayValue(descente.modele_pv)}
                          </div>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">Descente:</span>
                            </div>
                            <div className="text-slate-700 ml-4">
                              {formatDate(descente.date_descente || descente.date_desce)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 ml-4">
                              <Clock className="w-3 h-3" />
                              {displayValue(descente.heure_descente)}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-orange-400" />
                              <span className="font-medium">RDV:</span>
                            </div>
                            <div className="text-slate-700 ml-4">
                              {formatDate(descente.date_rendez_vous)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 ml-4">
                              <Clock className="w-3 h-3" />
                              {displayValue(descente.heure_rendez_vous)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Verbalisation */}
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-500" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {displayValue(descente.nom_verbalisateur)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {displayValue(descente.type_verbalisateur)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {displayValue(descente.nom_personne_r)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {displayValue(descente.personne_r)}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {displayValue(descente.contact_r)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {displayValue(descente.adresse_r)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Localisation */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {displayValue(descente.commune)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {displayValue(descente.fokontany)}, {displayValue(descente.district)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-700">
                            {displayValue(descente.localisation)}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Navigation className="w-3 h-3" />
                            <span className="text-slate-600">
                              {displayValue(descente.x_coord)}, {displayValue(descente.y_coord)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Ruler className="w-3 h-3" />
                            <span className="text-slate-600">
                              {displayValue(descente.superficie)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Infraction */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-700">
                              {displayValue(descente.infraction)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700">
                            {displayValue(descente.actions)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Dossier requis: {displayValue(descente.dossier_a_fournir)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <button 
                            onClick={() => handleViewDetails(descente)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm block w-full text-left hover:bg-blue-50 px-2 py-1 rounded"
                          >
                            Voir détails
                          </button>
                          <button 
                            onClick={() => handleEdit(descente)}
                            className="text-orange-600 hover:text-orange-800 font-medium text-sm block w-full text-left hover:bg-orange-50 px-2 py-1 rounded"
                          >
                            Éditer
                          </button>
                          <button 
                            onClick={() => handleDelete(descente.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm block w-full text-left hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}