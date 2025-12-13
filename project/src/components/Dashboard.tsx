// Dashboard.tsx
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
import NotificationsContent from './sections/NotificationsContent';
import { Section } from '../types';
import RendezvousFT from './sections/RendezvousFT';
import PaiementContent from './sections/PaiementContent';

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
        return <RendezvousFT />;
      case 'notifications':
        return <NotificationsContent />;
              case 'paiement':
        return <PaiementContent />;
      default:
        return <DashboardContent />; 
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar avec hauteur 100% */}
      <div className="h-full">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </div>
      
      {/* Contenu principal avec défilement */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}