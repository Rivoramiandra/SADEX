import React, { useState } from 'react';
import { 
  Map,
  ClipboardCheck,
  Calendar,
  Bell,
  LogOut,
  Menu,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';

import CartographieContent from './CartographieContent';
import DescenteContent from './DescenteContent';
import RendezvousFT from './Rdv';

type AgentSection = 'cartographie' | 'descente' | 'rendezvous';

export default function AgentDashboard() {
  const [activeSection, setActiveSection] = useState<AgentSection>('cartographie');
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Déterminer si on est dans la section cartographie
  const isCartographie = activeSection === 'cartographie';

  const handleLogoutConfirm = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('isAuthenticated');
    setShowLogoutModal(false);
    window.location.href = '/login';
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'cartographie':
        return <CartographieContent />;
      case 'descente':
        return <DescenteContent />;
      case 'rendezvous':
        return <RendezvousFT />;
      default:
        return <CartographieContent />;
    }
  };

  return (
    <>
      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Confirmer la déconnexion
              </h3>
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à nouveau à votre compte.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteneur principal qui occupe toute la hauteur restante après le header (h-15 = 3.75rem) */}
      <div className="flex w-full h-[calc(100vh-4rem)] overflow-hidden bg-gray-50">
        {/* Sidebar pour Agent */}
        <AgentSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onLogoutClick={() => setShowLogoutModal(true)}
        />
        
        {/* Contenu principal - Conditionnel pour la cartographie */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className={`flex-1 overflow-auto ${isCartographie ? '' : 'p-4 lg:p-6 bg-gray-50'}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}

// Composant Sidebar pour Agent
function AgentSidebar({ 
  activeSection, 
  setActiveSection, 
  collapsed, 
  setCollapsed,
  onLogoutClick
}: { 
  activeSection: AgentSection;
  setActiveSection: (section: AgentSection) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogoutClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'cartographie' as AgentSection, label: 'Cartographie', icon: Map },
    { id: 'descente' as AgentSection, label: 'Descente sur terrain', icon: ClipboardCheck },
    { id: 'rendezvous' as AgentSection, label: 'Rendez-vous pour faire FT', icon: Calendar },
  ];

  const handleItemClick = (section: AgentSection) => {
    setActiveSection(section);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    if (window.innerWidth < 1024) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          lg:relative h-full
          bg-blue-900
          border-r border-slate-700/50
          transition-all duration-200 ease-in-out z-50
          flex flex-col
          ${isOpen ? 'translate-x-0 fixed top-0 left-0' : '-translate-x-full lg:translate-x-0 lg:static'}
          ${collapsed ? 'w-20 lg:w-20' : 'w-64 lg:w-72'}
        `}
      >
        {/* Header de la sidebar avec logo comme dans sidebar.tsx */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-700/50">
          <img 
            style={{margin:'auto'}}
            src="/images/APIPA_blue_white_bg.PNG" 
            alt="SADEXLST Logo" 
            className="w-30 h-20 object-contain"
            onError={(e) => {
              // Fallback si le logo n'existe pas
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-violet-600/20 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : ''}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-violet-600 rounded-r-full" />
                  )}
                  <Icon className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg border border-slate-700">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Section inférieure de la sidebar */}
        <div className="border-t border-slate-700/50 p-2 space-y-1">
          <button
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg
              text-slate-400 hover:text-white hover:bg-slate-700/50
              transition-all duration-200 group relative
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Notifications' : ''}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                3
              </span>
            </div>
            
            {!collapsed && (
              <span className="text-sm font-medium">Notifications</span>
            )}
            
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg border border-slate-700">
                Notifications
              </div>
            )}
          </button>

          <button
            onClick={onLogoutClick}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg
              text-slate-400 hover:text-red-400 hover:bg-red-500/10
              transition-all duration-200 group relative
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Déconnexion' : ''}
          >
            <LogOut className="w-5 h-5" />
            
            {!collapsed && (
              <span className="text-sm font-medium">Déconnexion</span>
            )}
            
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg border border-slate-700">
                Déconnexion
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Bouton pour ouvrir la sidebar sur mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full shadow-lg flex items-center justify-center text-white z-30"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}