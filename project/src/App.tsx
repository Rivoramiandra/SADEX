import { useEffect, useState } from 'react';
import { useRealTimeNotifications } from './hooks/useRealTimeNotifications';
import { Toaster, toast } from 'react-hot-toast';
import NotificationBell from './components/NotificationBell';
import Dashboard from './components/Dashboard';
import AgentDashboard from './components/sections/AgentDashboard';
import Login from './components/sections/Login';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, ChevronDown, AlertTriangle } from 'lucide-react';

// Composant de protection de route
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'agent' }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userType = localStorage.getItem('userType') as 'admin' | 'agent';

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && userType !== requiredRole) {
    // Rediriger vers le dashboard approprié
    return <Navigate to={userType === 'admin' ? '/dashboard' : '/agent-dashboard'} />;
  }

  return <>{children}</>;
};

// Composant Header avec navigation conditionnelle
function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, connectionError } = useRealTimeNotifications();
  
  // Lire directement depuis localStorage au moment du rendu
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userType = localStorage.getItem('userType') as 'admin' | 'agent';
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userType');
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Ne pas afficher le header sur la page de login
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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

      <header className="bg-white border-b border-gray-200 z-50 flex-shrink-0">
        <div className="max-w-full mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15">
            {/* Logo et nom de l'application */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <img 
                  src="/images/APIPA_blue_white_bg.PNG" 
                  alt="SADEXLST Logo" 
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-lg font-bold text-gray-800">SADEXLST</h1>
                  <p className="text-xs text-gray-600">Surveillance & Contrôle</p>
                </div>
              </div>

              {/* Indicateur de statut de connexion */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connecté' : 'Hors ligne'}
                </span>
              </div>
            </div>

            {/* Partie droite avec notifications et profil */}
            <div className="flex items-center gap-4">
              {/* Message d'erreur de connexion */}
              {connectionError && (
                <div className="px-3 py-1 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs text-red-600">⚠️ {connectionError}</span>
                </div>
              )}

              {/* Notifications seulement pour les utilisateurs authentifiés */}
              {isAuthenticated && (
                <>
                  <NotificationBell>
                    <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <Bell className="w-5 h-5" />
                    </button>
                  </NotificationBell>

                  {/* Menu utilisateur */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Badge du type d'utilisateur */}
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          userType === 'admin' 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {userType === 'admin' ? 'Admin' : 'Agent'}
                        </div>
                        
                        {/* Avatar utilisateur */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-medium">
                          {userType === 'admin' ? 'A' : 'U'}
                        </div>
                        
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-800">
                            {userType === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </div>
                          <div className="text-xs text-gray-600">En ligne</div>
                        </div>
                      </div>
                      
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Menu déroulant */}
                    {userMenuOpen && (
                      <>
                        {/* Overlay pour fermer le menu en cliquant ailleurs */}
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setUserMenuOpen(false);
                                setShowLogoutModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Se déconnecter</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

// Composant principal de l'application
function AppContent() {
  const { isConnected, connectionError } = useRealTimeNotifications();
  const location = useLocation();

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

  // Afficher un indicateur de connexion globale
  useEffect(() => {
    if (!isConnected && connectionError) {
      toast.error(`Connexion perdue: ${connectionError}`, {
        id: 'connection-error',
        duration: Infinity,
      });
    } else if (isConnected) {
      toast.dismiss('connection-error');
    }
  }, [isConnected, connectionError]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header />
      
      {/* Contenu principal - occupe tout l'espace restant */}
      <main className="flex-1 min-h-0 overflow-auto">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/agent-dashboard" element={
            <ProtectedRoute requiredRole="agent">
              <AgentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              {/* Redirection automatique selon le type d'utilisateur */}
              {localStorage.getItem('userType') === 'admin' 
                ? <Navigate to="/dashboard" /> 
                : <Navigate to="/agent-dashboard" />
              }
            </ProtectedRoute>
          } />
          
          {/* Route 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
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
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

// Composant App principal avec Router
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;