import { Truck, Calendar, MapPin, User, Plus, Search, Clock } from 'lucide-react';

export default function AutorisationContent() {
  const autorisations = [
    {
      id: 'AC-2025-001',
      vehicule: 'Camion 10T - AB 1234 TN',
      chauffeur: 'Jean Rakoto',
      itineraire: 'Plaine Nord → Centre-ville',
      date: '2025-10-20',
      heure: '08:00 - 17:00',
      statut: 'Actif',
      type: 'Matériaux'
    },
    {
      id: 'AC-2025-002',
      vehicule: 'Camion 15T - CD 5678 TN',
      chauffeur: 'Marie Rasoa',
      itineraire: 'Zone Est → Périphérie Sud',
      date: '2025-10-21',
      heure: '06:00 - 14:00',
      statut: 'Planifié',
      type: 'Déblais'
    },
    {
      id: 'AC-2025-003',
      vehicule: 'Camion 8T - EF 9012 TN',
      chauffeur: 'Paul Andry',
      itineraire: 'Centre → Zone Industrielle',
      date: '2025-10-19',
      heure: '09:00 - 18:00',
      statut: 'Expiré',
      type: 'Équipement'
    },
    {
      id: 'AC-2025-004',
      vehicule: 'Camion 12T - GH 3456 TN',
      chauffeur: 'Sophie Hery',
      itineraire: 'Secteur B → Plaine Nord',
      date: '2025-10-20',
      heure: '07:00 - 16:00',
      statut: 'Actif',
      type: 'Gravats'
    },
  ];

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'green';
      case 'Planifié': return 'blue';
      case 'Expiré': return 'slate';
      case 'Suspendu': return 'red';
      default: return 'slate';
    }
  };

  const stats = [
    { label: 'Actifs aujourd\'hui', value: '24', color: 'green' },
    { label: 'Planifiés', value: '18', color: 'blue' },
    { label: 'Total ce mois', value: '142', color: 'violet' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Autorisation camion</h1>
          <p className="text-slate-600">Gestion des autorisations de circulation des véhicules lourds</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">
          <Plus className="w-5 h-5" />
          Nouvelle autorisation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600 mb-2">{stat.label}</div>
            <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une autorisation..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Tous les statuts</option>
            <option>Actif</option>
            <option>Planifié</option>
            <option>Expiré</option>
          </select>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Tous les types</option>
            <option>Matériaux</option>
            <option>Déblais</option>
            <option>Équipement</option>
            <option>Gravats</option>
          </select>
        </div>

        <div className="space-y-4">
          {autorisations.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 mb-1">{item.id}</div>
                    <div className="text-sm text-slate-600">{item.vehicule}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {item.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${getStatusColor(item.statut)}-100 text-${getStatusColor(item.statut)}-700`}>
                    {item.statut}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Chauffeur</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.chauffeur}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Itinéraire</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.itineraire}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Date</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.date}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Horaire</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.heure}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  Voir détails
                </button>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  Imprimer
                </button>
                {item.statut === 'Actif' && (
                  <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Suspendre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
