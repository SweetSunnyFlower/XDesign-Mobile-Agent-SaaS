import { getSocketServer } from '@/lib/websocket';

/**
 * Emit progress event to a specific user via WebSocket
 * Replaces Inngest's publish() function
 */
export const emitToUser = (userId: string, topic: string, data: any): void => {
  try {
    const io = getSocketServer();

    if (!io) {
      console.warn('[emitToUser] Socket.io server not initialized - skipping emit');
      return;
    }

    const room = `user:${userId}`;
    io.to(room).emit(topic, data);

    console.log(`[emitToUser] Emitted "${topic}" to ${room}`);
  } catch (error) {
    console.error('[emitToUser] Failed to emit:', error);
    // Don't throw error - we don't want to fail the job if WebSocket emit fails
  }
};
