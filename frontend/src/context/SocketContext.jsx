import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [liveMachines, setLiveMachines] = useState({});
  const [recentAlertEvent, setRecentAlertEvent] = useState(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setLastHeartbeat(Date.now());
      socketInstance.emit('dashboard:subscribe');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Batch telemetry updates every 5 seconds
    socketInstance.on('machines:batch_telemetry', (batch) => {
      setLastHeartbeat(Date.now());
      setLiveMachines((prev) => {
        const updated = { ...prev };
        batch.forEach((item) => {
          updated[item.machineId] = {
            ...updated[item.machineId],
            ...item,
            lastSeen: new Date(),
          };
        });
        return updated;
      });
    });

    // Single machine telemetry
    socketInstance.on('machine:telemetry', (data) => {
      setLastHeartbeat(Date.now());
      setLiveMachines((prev) => ({
        ...prev,
        [data.machineId]: {
          ...prev[data.machineId],
          telemetry: data,
          state: data.state,
          lastSeen: new Date(),
        },
      }));
    });

    // Machine status override
    socketInstance.on('machine:status', ({ machineId, state }) => {
      setLastHeartbeat(Date.now());
      setLiveMachines((prev) => ({
        ...prev,
        [machineId]: {
          ...prev[machineId],
          state,
          lastSeen: new Date(),
        },
      }));
    });

    // Alert events
    socketInstance.on('alert:created', (alert) => {
      setRecentAlertEvent({ type: 'CREATED', alert, timestamp: Date.now() });
    });

    socketInstance.on('alert:updated', (alert) => {
      setRecentAlertEvent({ type: 'UPDATED', alert, timestamp: Date.now() });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  // Stale data check: If no message received for > 15 seconds, mark as stale
  const [isDataStale, setIsDataStale] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && Date.now() - lastHeartbeat > 15000) {
        setIsDataStale(true);
      } else {
        setIsDataStale(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isConnected, lastHeartbeat]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isDataStale,
        lastHeartbeat,
        liveMachines,
        recentAlertEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
