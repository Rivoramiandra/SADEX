import React, { useState } from 'react';

import { 

  DollarSign,
  Receipt,
  ClipboardCheck,
  Search
} from 'lucide-react';

// Import des composants pour chaque section
import DescenteDashboardComponent from '../DescenteDashboard';
import FTDashboard from '../FtDashboard';
import AvisPaiementDashboard from '../AvisPaiementDashboard';
import PaiementDashboard from '../PaiementDashboard';
 // À créer

export default function DashboardContent() {
  const [activeComponent, setActiveComponent] = useState('descente');

  // Cartes statistiques comme boutons
  const stats = [
    { 
      key: 'descente',
      label: 'Descentes réalisées', 
      value: '156', 
      icon: Search, 
      color: 'from-blue-500 to-cyan-500', 
      change: '+12' 
    },
    { 
      key: 'ft',
      label: 'Fiches techniques', 
      value: '89', 
      icon: ClipboardCheck, 
      color: 'from-emerald-500 to-green-500', 
      change: '+8' 
    },
    { 
      key: 'avis',
      label: 'Avis de paiement', 
      value: '42', 
      icon: Receipt, 
      color: 'from-violet-500 to-purple-500', 
      change: '+5' 
    },
    { 
      key: 'paiement',
      label: 'Paiements validés', 
      value: '38', 
      icon: DollarSign, 
      color: 'from-amber-500 to-orange-500', 
      change: '+6' 
    },
  ];

  // Fonction pour rendre le composant actif
  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'descente':
        return <DescenteDashboardComponent />;
      case 'ft':
        return <FTDashboard />;
      case 'avis':
        return <AvisPaiementDashboard />;
      case 'paiement':
        return <PaiementDashboard />;
      default:
        return <DescenteDashboardComponent />;
    }
  };

  const recentActivities = [
    { type: 'Descente', title: 'Contrôle secteur industriel Nord', status: 'Terminé', time: 'Il y a 2h', color: 'blue' },
    { type: 'FT', title: 'Fiche technique #FT-2024-0456', status: 'En attente', time: 'Il y a 4h', color: 'emerald' },
    { type: 'Paiement', title: 'Avis #AV-2024-0789', status: 'Payé', time: 'Il y a 6h', color: 'amber' },
    { type: 'Alerte', title: 'Descente urgente Zone Est', status: 'Planifié', time: 'Demain', color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h1>
        <p className="text-slate-600">Vue d'ensemble de la gestion des opérations terrain</p>
      </div>

      {/* Cartes statistiques comme boutons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeComponent === stat.key;
          
          return (
            <button
              key={stat.key}
              onClick={() => setActiveComponent(stat.key)}
              className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 text-left ${
                isActive 
                  ? 'border-blue-500 ring-2 ring-blue-100' 
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-600 flex items-center justify-between">
                <span>{stat.label}</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Section principale qui affiche le composant sélectionné */}
      <div>
        {renderActiveComponent()}
      </div>

      
    </div>
  );
}