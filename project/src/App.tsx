import { useEffect } from 'react';
import { useRealTimeNotifications } from './hooks/useRealTimeNotifications';
import { Toaster, toast } from 'react-hot-toast';
import NotificationBell from './components/NotificationBell';
import Dashboard from './components/Dashboard';

function App() {
  const { isConnected, connectionError } = useRealTimeNotifications();

  // Écouter les événements personnalisés
  useEffect(() => {
    const handleNewRendezvous = (event: CustomEvent) => {
      const data = event.detail;
      toast.success(`Nouveau rendez-vous RDV-${data.id} créé !`, {
        icon: '📅',
        duration: 5000,
      });
    };

    const handleNewDescente = (event: CustomEvent) => {
      const data = event.detail;
      toast.success(`Nouvelle descente DS-${data.id} créée !`, {
        icon: '📍',
        duration: 5000,
      });
    };

    window.addEventListener('real-time:new-rendezvous', handleNewRendezvous as EventListener);
    window.addEventListener('real-time:new-descente', handleNewDescente as EventListener);

    return () => {
      window.removeEventListener('real-time:new-rendezvous', handleNewRendezvous as EventListener);
      window.removeEventListener('real-time:new-descente', handleNewDescente as EventListener);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Barre de navigation - hauteur fixe */}
      <header className="bg-white shadow-sm z-50 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-violet-600 rounded-lg mr-3"></div>
                <h1 className="text-xl font-bold text-gray-900">SADEXLST</h1>
              </div>
              
              <span className={`px-3 py-1 text-sm rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isConnected ? '● Connecté' : '○ Déconnecté'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {connectionError && (
                <span className="text-sm text-red-600 animate-pulse">
                  ⚠️ {connectionError}
                </span>
              )}
              
              <NotificationBell />
              
              {/* Menu utilisateur */}
              <div className="ml-4 flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-medium">U</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenu principal - occupe tout l'espace restant */}
      <main className="flex-1 min-h-0">
        <Dashboard />
      </main>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;