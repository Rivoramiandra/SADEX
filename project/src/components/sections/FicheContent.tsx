import { FileText, Plus, Filter, Download } from 'lucide-react';

export default function FicheContent() {
  const fiches = [
    { id: 'FT-2025-001', title: 'Évaluation zone inondable Nord', type: 'Inspection', date: '2025-10-12', status: 'Validé' },
    { id: 'FT-2025-002', title: 'Contrôle construction Lot 32', type: 'Contrôle', date: '2025-10-14', status: 'En révision' },
    { id: 'FT-2025-003', title: 'Analyse risques Secteur B', type: 'Analyse', date: '2025-10-16', status: 'Brouillon' },
    { id: 'FT-2025-004', title: 'Suivi aménagement périphérie', type: 'Suivi', date: '2025-10-17', status: 'Validé' },
    { id: 'FT-2025-005', title: 'Inspection infrastructure drainage', type: 'Inspection', date: '2025-10-18', status: 'En révision' },
    { id: 'FT-2025-006', title: 'Évaluation impact environnemental', type: 'Analyse', date: '2025-10-19', status: 'Brouillon' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validé': return 'green';
      case 'En révision': return 'orange';
      case 'Brouillon': return 'slate';
      default: return 'slate';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Fiche de travail</h1>
          <p className="text-slate-600">Documents et formulaires de suivi opérationnel</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">
          <Plus className="w-5 h-5" />
          Nouvelle fiche
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiches.map((fiche) => (
            <div
              key={fiche.id}
              className="group border border-slate-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-${getStatusColor(fiche.status)}-100 text-${getStatusColor(fiche.status)}-700`}>
                  {fiche.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {fiche.title}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">ID:</span>
                  <span className="font-medium text-slate-700">{fiche.id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium text-slate-700">{fiche.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-700">{fiche.date}</span>
                </div>
              </div>

              <button className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                Voir détails
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
