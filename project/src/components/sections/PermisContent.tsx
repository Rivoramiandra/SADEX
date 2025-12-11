import { FileCheck, Building, MapPin, User, Calendar, Plus, Search } from 'lucide-react';

export default function PermisContent() {
  const permis = [
    {
      id: 'PC-2025-001',
      type: 'Résidentiel',
      adresse: 'Lot 32, Plaine Nord',
      demandeur: 'Jean Rakoto',
      date: '2025-09-15',
      statut: 'Approuvé',
      validite: '2027-09-15'
    },
    {
      id: 'PC-2025-002',
      type: 'Commercial',
      adresse: 'Avenue de l\'Indépendance',
      demandeur: 'Marie Rasoa',
      date: '2025-10-01',
      statut: 'En révision',
      validite: '-'
    },
    {
      id: 'PC-2025-003',
      type: 'Industriel',
      adresse: 'Zone Est - Secteur B',
      demandeur: 'Paul Andry',
      date: '2025-10-10',
      statut: 'En attente',
      validite: '-'
    },
    {
      id: 'PC-2025-004',
      type: 'Résidentiel',
      adresse: 'Lot 18, Périphérie Sud',
      demandeur: 'Sophie Hery',
      date: '2025-10-12',
      statut: 'Approuvé',
      validite: '2027-10-12'
    },
    {
      id: 'PC-2025-005',
      type: 'Rénovation',
      adresse: 'Centre-ville - Bâtiment A',
      demandeur: 'Luc Rabe',
      date: '2025-10-15',
      statut: 'Rejeté',
      validite: '-'
    },
  ];

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'Approuvé': return 'green';
      case 'En révision': return 'blue';
      case 'En attente': return 'orange';
      case 'Rejeté': return 'red';
      default: return 'slate';
    }
  };

  const getTypeIcon = (type: string) => {
    return <Building className="w-4 h-4" />;
  };

  const stats = [
    { label: 'Total permis', value: '156', color: 'blue' },
    { label: 'Approuvés', value: '98', color: 'green' },
    { label: 'En révision', value: '42', color: 'orange' },
    { label: 'Rejetés', value: '16', color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Permis de construction</h1>
          <p className="text-slate-600">Gestion des autorisations de construction et aménagement</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">
          <Plus className="w-5 h-5" />
          Nouveau permis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
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
              placeholder="Rechercher un permis..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Tous les types</option>
            <option>Résidentiel</option>
            <option>Commercial</option>
            <option>Industriel</option>
            <option>Rénovation</option>
          </select>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Tous les statuts</option>
            <option>Approuvé</option>
            <option>En révision</option>
            <option>En attente</option>
            <option>Rejeté</option>
          </select>
        </div>

        <div className="space-y-4">
          {permis.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 mb-1">{item.id}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      {getTypeIcon(item.type)}
                      <span>{item.type}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${getStatusColor(item.statut)}-100 text-${getStatusColor(item.statut)}-700`}>
                  {item.statut}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Adresse</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.adresse}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Demandeur</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.demandeur}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Date demande</div>
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.date}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Validité</div>
                  <div className="text-sm font-medium text-slate-900">{item.validite}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  Voir détails
                </button>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  Télécharger
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
