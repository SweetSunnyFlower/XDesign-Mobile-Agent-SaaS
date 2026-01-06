'use client';

/**
 * @deprecated This file is deprecated. Use WebSocketProvider from @/context/websocket-provider instead.
 *
 * WebSocket has been moved to a global provider to prevent duplicate connections
 * during page navigation. Import from @/context/websocket-provider:
 *
 * import { useWebSocket } from "@/context/websocket-provider";
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  topic: string;
  data: any;
}

/**
 * WebSocket hook for real-time updates
 * Replaces useInngestSubscription
 */
export const useWebSocket = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
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
            clearTimeout(reconnectTimeoutRef.current);
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
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectSocket, 5000);
        }
      }
    };

    connectSocket();

    // Cleanup
    return () => {
      isMounted = false;
      isConnectingRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setMessages([]);
    };
  }, []);

  return {
    freshData: messages,
    isConnected,
  };
};
