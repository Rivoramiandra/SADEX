import { Receipt, DollarSign, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function AvisContent() {
  const avis = [
    { id: 'AP-2025-001', description: 'Permis construction résidentielle', montant: '500 000', date: '2025-10-15', statut: 'Payé', methode: 'Virement' },
    { id: 'AP-2025-002', description: 'Autorisation camion transport', montant: '150 000', date: '2025-10-17', statut: 'En attente', methode: 'Espèces' },
    { id: 'AP-2025-003', description: 'Taxe inspection terrain', montant: '75 000', date: '2025-10-18', statut: 'Payé', methode: 'Chèque' },
    { id: 'AP-2025-004', description: 'Frais dossier administratif', montant: '50 000', date: '2025-10-19', statut: 'Retard', methode: 'Espèces' },
    { id: 'AP-2025-005', description: 'Redevance aménagement', montant: '250 000', date: '2025-10-20', statut: 'En attente', methode: 'Virement' },
  ];

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'Payé': return <CheckCircle className="w-4 h-4" />;
      case 'En attente': return <Clock className="w-4 h-4" />;
      case 'Retard': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'Payé': return 'green';
      case 'En attente': return 'orange';
      case 'Retard': return 'red';
      default: return 'slate';
    }
  };

  const totalMontant = avis.reduce((sum, item) => sum + parseInt(item.montant.replace(/\s/g, '')), 0);
  const totalPaye = avis.filter(a => a.statut === 'Payé').reduce((sum, item) => sum + parseInt(item.montant.replace(/\s/g, '')), 0);
  const totalEnAttente = avis.filter(a => a.statut === 'En attente').reduce((sum, item) => sum + parseInt(item.montant.replace(/\s/g, '')), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Avis de paiement</h1>
        <p className="text-slate-600">Gestion des paiements et transactions financières</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalMontant.toLocaleString()} Ar</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Payé</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{totalPaye.toLocaleString()} Ar</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">En attente</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{totalEnAttente.toLocaleString()} Ar</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Référence</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Description</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Montant</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Méthode</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {avis.map((item, index) => (
                <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{item.id}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-700">{item.description}</td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-900">{item.montant} Ar</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{item.date}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600">{item.methode}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-${getStatusColor(item.statut)}-100 text-${getStatusColor(item.statut)}-700`}>
                      {getStatusIcon(item.statut)}
                      {item.statut}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
