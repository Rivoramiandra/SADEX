// src/hooks/useRealTimeNotifications.ts - VERSION CORRIGÉE
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealTimeNotification {
  id: string;
  type: 'rendezvous' | 'descente' | 'avis_paiement';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export const useRealTimeNotifications = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectSocket = useCallback(() => {
    console.log('🔗 Tentative de connexion Socket.io...');
    
    // CORRECTION : Utiliser localhost:5000 (backend) au lieu de 3000 (frontend)
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.io, ID:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion Socket.io:', error.message);
      setConnectionError(`Impossible de se connecter: ${error.message}`);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Déconnecté:', reason);
      setIsConnected(false);
    });

    newSocket.on('new-rendezvous', (data) => {
      console.log('📅 Nouveau rendez-vous reçu:', data);
      
      const notification: RealTimeNotification = {
        id: `rt-${Date.now()}-${data.id || 'unknown'}`,
        type: 'rendezvous',
        action: 'create',
        data,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
    });

    newSocket.on('new-descente', (data) => {
      console.log('📍 Nouvelle descente reçue:', data);
      
      const notification: RealTimeNotification = {
        id: `rt-${Date.now()}-${data.id || 'unknown'}`,
        type: 'descente',
        action: 'create',
        data,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
    });

    newSocket.on('new-avis-paiement', (data) => {
      console.log('💰 Nouvel avis de paiement reçu:', data);
      
      const notification: RealTimeNotification = {
        id: `rt-${Date.now()}-${data.idavis || 'unknown'}`,
        type: 'avis_paiement',
        action: 'create',
        data,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
    });

    newSocket.on('notification', (data) => {
      console.log('📢 Notification générale:', data);
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Nettoyage de la connexion Socket.io');
      if (newSocket && newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationCount = useCallback((type?: 'rendezvous' | 'descente' | 'avis_paiement') => {
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

// Export par défaut pour compatibilité
export default useRealTimeNotifications;