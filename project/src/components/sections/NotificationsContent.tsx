// components/NotificationSystem.tsx
import { Bell, X, CheckCircle, AlertCircle, Calendar, MapPin, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'descente' | 'rendezvous' | 'system';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  read: boolean;
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  // Écouter les événements personnalisés
  useEffect(() => {
    const handleNewDescente = (event: CustomEvent) => {
      const descente = event.detail;
      addNotification({
        id: `descente-${Date.now()}`,
        type: 'descente',
        title: 'Nouvelle descente créée',
        message: `Descente DS-${descente.id} - ${descente.commune}`,
        data: descente,
        timestamp: new Date(),
        read: false
      });
      toast.success(`Nouvelle descente DS-${descente.id} créée !`);
    };

    const handleNewRendezvous = (event: CustomEvent) => {
      const rendezvous = event.detail;
      addNotification({
        id: `rendezvous-${Date.now()}`,
        type: 'rendezvous',
        title: 'Nouveau rendez-vous',
        message: `RDV-${rendezvous.id} pour ${rendezvous.nom_personne_r}`,
        data: rendezvous,
        timestamp: new Date(),
        read: false
      });
      toast.success(`Nouveau rendez-vous RDV-${rendezvous.id} créé !`);
    };

    window.addEventListener('new-descente', handleNewDescente as EventListener);
    window.addEventListener('new-rendezvous', handleNewRendezvous as EventListener);

    return () => {
      window.removeEventListener('new-descente', handleNewDescente as EventListener);
      window.removeEventListener('new-rendezvous', handleNewRendezvous as EventListener);
    };
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Garder les 50 dernières
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      {/* Bouton de notification */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tout marquer comme lu
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-100 hover:bg-slate-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'descente' ? 'bg-blue-100' :
                      notification.type === 'rendezvous' ? 'bg-green-100' :
                      'bg-slate-100'
                    }`}>
                      {notification.type === 'descente' ? (
                        <MapPin className="w-4 h-4 text-blue-600" />
                      ) : notification.type === 'rendezvous' ? (
                        <Calendar className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-slate-900">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {notification.type === 'descente' ? 'Descente' : 'Rendez-vous'}
                        </span>
                        
                        <div className="flex gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Marquer lu
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Rediriger vers la page correspondante
                              if (notification.type === 'descente') {
                                window.location.href = `/descentes/${notification.data.id}`;
                              } else if (notification.type === 'rendezvous') {
                                window.location.href = `/rendezvous/${notification.data.id}`;
                              }
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Voir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}