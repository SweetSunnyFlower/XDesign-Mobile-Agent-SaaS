import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { createRedisSubscriber, WEBSOCKET_CHANNEL, type WebSocketMessage } from './redis-pubsub';
import type { Redis } from 'ioredis';

// WebSocket event types
export enum WebSocketEvent {
  GENERATION_START = 'generation.start',
  ANALYSIS_START = 'analysis.start',
  ANALYSIS_COMPLETE = 'analysis.complete',
  FRAME_CREATED = 'frame.created',
  GENERATION_COMPLETE = 'generation.complete',
}

let io: SocketIOServer | null = null;
let redisSubscriber: Redis | null = null;

/**
 * Initialize the Socket.io server
 * Should only be called once from the custom server
 */
export const initSocketServer = (httpServer: HTTPServer) => {
  if (io) {
    console.warn('Socket.io server already initialized');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        return next(new Error('NEXTAUTH_SECRET not configured'));
      }

      const decoded = jwt.verify(token, secret) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      return next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userRoom = `user:${userId}`;

    // Join user-specific room
    socket.join(userRoom);
    console.log(`✅ Socket connected: ${socket.id} → ${userRoom}`);

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error: ${socket.id}`, error);
    });
  });

  // Set up Redis subscriber to receive events from workers
  setupRedisSubscriber(io);

  console.log('✅ Socket.io server initialized');
  return io;
};

/**
 * Set up Redis subscriber to receive WebSocket events from workers
 */
const setupRedisSubscriber = (socketServer: SocketIOServer): void => {
  if (redisSubscriber) {
    console.warn('Redis subscriber already initialized');
    return;
  }

  redisSubscriber = createRedisSubscriber();

  redisSubscriber.on('connect', () => {
    console.log('✅ Redis subscriber connected');
  });

  redisSubscriber.on('error', (error) => {
    console.error('❌ Redis subscriber error:', error);
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel !== WEBSOCKET_CHANNEL) {
      return;
    }

    try {
      const event: WebSocketMessage = JSON.parse(message);
      const { userId, event: eventName, data } = event;

      const room = `user:${userId}`;
      socketServer.to(room).emit(eventName, data);

      console.log(`[Redis→Socket.io] Emitted "${eventName}" to ${room}`);
    } catch (error) {
      console.error('[Redis→Socket.io] Failed to parse message:', error);
    }
  });

  // Subscribe to the WebSocket events channel
  redisSubscriber.subscribe(WEBSOCKET_CHANNEL, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${WEBSOCKET_CHANNEL}:`, err);
    } else {
      console.log(`✅ Subscribed to ${WEBSOCKET_CHANNEL}`);
    }
  });
};

/**
 * Get the initialized Socket.io server
 * Returns null if not initialized
 */
export const getSocketServer = (): SocketIOServer | null => {
  return io;
};

/**
 * Emit event to a specific user's room
 */
export const emitToUserRoom = (
  userId: string,
  event: string,
  data: any
): void => {
  if (!io) {
    console.warn('Socket.io not initialized, cannot emit');
    return;
  }

  const room = `user:${userId}`;
  io.to(room).emit(event, data);
};

export default {
  initSocketServer,
  getSocketServer,
  emitToUserRoom,
  WebSocketEvent,
};
