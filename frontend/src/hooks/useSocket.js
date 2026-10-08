import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [stations, setStations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to Gateway WebSocket
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('network_status', (data) => {
      setStations(data);
    });

    socket.on('event_history', (history) => {
      setLogs(history);
    });

    socket.on('event_log', (entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 99)]);
      setLastEvent(entry);
    });

    socket.on('station_event', (event) => {
      setLastEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    stations,
    logs,
    lastEvent,
    setLogs
  };
}
