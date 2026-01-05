import { createRedisPublisher, publishWebSocketEvent, WEBSOCKET_CHANNEL } from '@/lib/redis-pubsub';
import type { Redis } from 'ioredis';

// Create a singleton Redis publisher for the worker
let redisPublisher: Redis | null = null;

const getRedisPublisher = (): Redis => {
  if (!redisPublisher) {
    redisPublisher = createRedisPublisher();

    redisPublisher.on('connect', () => {
      console.log('[Worker] Redis publisher connected');
    });

    redisPublisher.on('error', (error) => {
      console.error('[Worker] Redis publisher error:', error);
    });

    // Connect immediately
    redisPublisher.connect().catch((error) => {
      console.error('[Worker] Failed to connect Redis publisher:', error);
    });
  }

  return redisPublisher;
};

/**
 * Emit progress event to a specific user via WebSocket
 * Uses Redis pub/sub to communicate with the Socket.io server
 */
export const emitToUser = async (userId: string, topic: string, data: any): Promise<void> => {
  try {
    const publisher = getRedisPublisher();

    await publishWebSocketEvent(publisher, userId, topic, data);

    console.log(`[emitToUser] Published "${topic}" to ${WEBSOCKET_CHANNEL} for user ${userId}`);
  } catch (error) {
    console.error('[emitToUser] Failed to publish event:', error);
    // Don't throw error - we don't want to fail the job if WebSocket emit fails
  }
};
