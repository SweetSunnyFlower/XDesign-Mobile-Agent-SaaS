import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

// WebSocket event types
export enum WebSocketEvent {
  GENERATION_START = 'generation.start',
  ANALYSIS_START = 'analysis.start',
  ANALYSIS_COMPLETE = 'analysis.complete',
  FRAME_CREATED = 'frame.created',
  GENERATION_COMPLETE = 'generation.complete',
}

let io: SocketIOServer | null = null;

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

  console.log('✅ Socket.io server initialized');
  return io;
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
