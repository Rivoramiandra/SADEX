import {
  LayoutDashboard,
  Map,
  Clipboard,
  FileText,
  Receipt,
  FileCheck,
  Truck,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { SidebarProps, Section } from '../types';
import { useState } from 'react';

const menuItems = [
  { id: 'dashboard' as Section, label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'cartographie' as Section, label: 'Cartographie', icon: Map },
  { id: 'descente' as Section, label: 'Descente sur terrain', icon: Clipboard },
  { id: 'rendezvous' as Section, label: 'Rendez-vous pour faire FT', icon: FileText },
  { id: 'fiche' as Section, label: 'FT Etabli', icon: FileText },
  { id: 'avis' as Section, label: 'Avis de paiement', icon: Receipt },
  { id: 'paiement' as Section, label: 'Passer au paiement', icon: Truck },
  { id: 'gererpaiement' as Section, label: 'Gerer le paiement', icon: Truck },
];

export default function Sidebar({ activeSection, setActiveSection, collapsed, setCollapsed }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (section: Section) => {
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
          fixed lg:relative top-0 left-0 h-[92vh]
          bg-gradient-to-b from-slate-900 to-slate-800
          border-r border-slate-700/50
          transition-all duration-200 ease-in-out z-50
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20 lg:w-20' : 'w-64 lg:w-72'}
        `}
      >
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-700/50">
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold text-white text-lg shadow-lg">
              AP
            </div>
            <span className="font-bold text-xl text-white">APIPA</span>
          </div>
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

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
                5
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

      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full shadow-lg flex items-center justify-center text-white z-30"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
