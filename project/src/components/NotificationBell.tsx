// src/components/NotificationBell.tsx
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications';

export default function NotificationBell() {
  const { notifications, isConnected, clearNotifications } = useRealTimeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.length;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className={`w-6 h-6 ${isConnected ? 'text-blue-600' : 'text-gray-400'}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* En-tête */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {notifications.length} non-lues
                </span>
              </div>
              
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Tout effacer
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Liste des notifications */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune notification</p>
                <p className="text-sm mt-2">Les nouvelles descentes et rendez-vous apparaîtront ici</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'descente' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {notification.type === 'descente' ? (
                        <span className="text-blue-600">📍</span>
                      ) : (
                        <span className="text-green-600">📅</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {notification.type === 'descente' ? 'Nouvelle descente' : 'Nouveau rendez-vous'}
                        </h4>
                        <button
                          onClick={() => setIsOpen(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.type === 'descente' 
                          ? `Descente DS-${notification.data.id} créée`
                          : `Rendez-vous RDV-${notification.data.id} créé`
                        }
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        <button
                          onClick={() => {
                            const url = notification.type === 'descente' 
                              ? `/descentes/${notification.data.id}`
                              : `/rendezvous/${notification.data.id}`;
                            window.location.href = url;
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Voir les détails →
                        </button>
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