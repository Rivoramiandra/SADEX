import { useState } from 'react';
import Sidebar from './Sidebar';
import DashboardContent from './sections/DashboardContent';
import CartographieContent from './sections/CartographieContent';
import DescenteContent from './sections/DescenteContent';
import FicheContent from './sections/FicheContent';
import AvisContent from './sections/AvisContent';
import PermisContent from './sections/PermisContent';
import AutorisationContent from './sections/AutorisationContent';
import RapportContent from './sections/RapportContent';
import { Section } from '../types';
import RendezvousFT from './sections/RendezvousFT';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'cartographie':
        return <CartographieContent />;
      case 'descente':
        return <DescenteContent />;
      case 'fiche':
        return <FicheContent />;
      case 'avis':
        return <AvisContent />;
      case 'permis':
        return <PermisContent />;
      case 'autorisation':
        return <AutorisationContent />;
      case 'rapport':
        return <RapportContent />;
              case 'rendezvous':
        return < RendezvousFT/>;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
