// src/hooks/useRealTimeNotifications.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface RealTimeNotification {
  id: string;
  type: 'rendezvous' | 'descente';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export const useRealTimeNotifications = () => { // 👈 Export nommé, pas "default"
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectSocket = useCallback(() => {
    console.log('🔗 Tentative de connexion Socket.io...');
    
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.io');
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion Socket.io:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Déconnecté:', reason);
      setIsConnected(false);
    });

    newSocket.on('new-rendezvous', (data) => {
      console.log('📅 Nouveau rendez-vous reçu:', data);
      
      const notification: RealTimeNotification = {
        id: `rt-${Date.now()}-${data.id}`,
        type: 'rendezvous',
        action: 'create',
        data,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      window.dispatchEvent(new CustomEvent('real-time:new-rendezvous', { detail: data }));
    });

    newSocket.on('new-descente', (data) => {
      console.log('📍 Nouvelle descente reçue:', data);
      
      const notification: RealTimeNotification = {
        id: `rt-${Date.now()}-${data.id}`,
        type: 'descente',
        action: 'create',
        data,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      window.dispatchEvent(new CustomEvent('real-time:new-descente', { detail: data }));
    });

    newSocket.on('notification', (data) => {
      console.log('📢 Notification:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectSocket]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationCount = useCallback((type?: 'rendezvous' | 'descente') => {
    if (!type) return notifications.length;
    return notifications.filter(n => n.type === type).length;
  }, [notifications]);

  return {
    socket,
    notifications,
    isConnected,
    connectionError,
    clearNotifications,
    getNotificationCount,
    reconnect: connectSocket,
  };
};

// Si vous voulez un export par défaut aussi, ajoutez :
// export default useRealTimeNotifications;