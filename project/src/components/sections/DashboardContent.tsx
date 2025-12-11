import { TrendingUp, Users, AlertTriangle, CheckCircle, MapPin, FileText } from 'lucide-react';

export default function DashboardContent() {
  const stats = [
    { label: 'Zones à risque', value: '24', icon: AlertTriangle, color: 'from-red-500 to-orange-500', change: '+3' },
    { label: 'Permis délivrés', value: '156', icon: CheckCircle, color: 'from-green-500 to-emerald-500', change: '+12' },
    { label: 'Descentes terrain', value: '42', icon: MapPin, color: 'from-blue-500 to-cyan-500', change: '+8' },
    { label: 'Rapports en attente', value: '18', icon: FileText, color: 'from-violet-500 to-purple-500', change: '-5' },
  ];

  const recentActivities = [
    { type: 'Permis', title: 'Construction résidentielle - Lot 32', status: 'Approuvé', time: 'Il y a 2h', color: 'green' },
    { type: 'Descente', title: 'Zone inondable Secteur B', status: 'En cours', time: 'Il y a 4h', color: 'blue' },
    { type: 'Alerte', title: 'Risque élevé Plaine Nord', status: 'Urgent', time: 'Il y a 6h', color: 'red' },
    { type: 'Rapport', title: 'Évaluation mensuelle', status: 'Soumis', time: 'Hier', color: 'violet' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h1>
        <p className="text-slate-600">Vue d'ensemble de la gestion environnementale et urbaine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Activités récentes</h2>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 bg-${activity.color}-500`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{activity.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${activity.color}-100 text-${activity.color}-700`}>
                      {activity.status}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900">{activity.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Zones prioritaires</h2>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {[
              { zone: 'Plaine Nord', risk: 'Élevé', progress: 75, color: 'red' },
              { zone: 'Secteur Centre', risk: 'Moyen', progress: 50, color: 'orange' },
              { zone: 'Zone Est', risk: 'Faible', progress: 30, color: 'green' },
              { zone: 'Périphérie Sud', risk: 'Moyen', progress: 60, color: 'orange' },
            ].map((zone, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{zone.zone}</span>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${zone.color}-100 text-${zone.color}-700 font-semibold`}>
                    {zone.risk}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-${zone.color}-500 to-${zone.color}-600 rounded-full transition-all duration-500`}
                    style={{ width: `${zone.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
