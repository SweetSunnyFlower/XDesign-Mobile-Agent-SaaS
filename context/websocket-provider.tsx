'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  topic: string;
  data: any;
}

interface WebSocketContextType {
  freshData: WebSocketMessage[];
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  freshData: [],
  isConnected: false
});

/**
 * Global WebSocket Provider - ensures only ONE connection per app
 */
export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const connectSocket = async () => {
      // Prevent duplicate connections
      if (isConnectingRef.current || socketRef.current?.connected) {
        console.log('⏭️ WebSocket already connected or connecting, skipping...');
        return;
      }

      isConnectingRef.current = true;

      try {
        // Fetch authentication token
        const response = await fetch('/api/ws/token');
        if (!response.ok) {
          throw new Error('Failed to fetch WebSocket token');
        }

        const { token } = await response.json();

        // Connect to Socket.io server
        const socket = io({
          auth: { token },
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        });

        // Connection event handlers
        socket.on('connect', () => {
          if (isMounted) {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            isConnectingRef.current = false;
          }
        });

        socket.on('disconnect', (reason) => {
          if (isMounted) {
            console.log(`❌ WebSocket disconnected: ${reason}`);
            setIsConnected(false);

            // Reconnect if not intentional disconnect
            if (reason === 'io server disconnect') {
              // Server disconnected, reconnect manually
              socket.connect();
            }
          }
        });

        socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);

          // If token expired, refresh and reconnect
          if (error.message.includes('Invalid token') || error.message.includes('expired')) {
            console.log('Token expired, reconnecting...');
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              socket.disconnect();
              if (isMounted) {
                connectSocket(); // Reconnect with new token
              }
            }, 2000);
          }
        });

        // Listen to ALL events (matches Inngest pattern)
        socket.onAny((topic: string, data: any) => {
          if (isMounted) {
            setMessages((prev) => [...prev, { topic, data }]);
          }
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        isConnectingRef.current = false;

        // Retry connection after delay
        if (isMounted) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connectSocket, 5000);
        }
      }
    };

    connectSocket();

    // Cleanup
    return () => {
      isMounted = false;
      isConnectingRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setMessages([]);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ freshData: messages, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access WebSocket data from any component
 */
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
