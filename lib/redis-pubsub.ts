import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis pub/sub channel for WebSocket events
export const WEBSOCKET_CHANNEL = 'websocket:events';

/**
 * WebSocket event message structure
 */
export interface WebSocketMessage {
  userId: string;
  event: string;
  data: any;
}

/**
 * Create a Redis publisher instance
 * Used by workers to publish WebSocket events
 */
export const createRedisPublisher = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
};

/**
 * Create a Redis subscriber instance
 * Used by the Socket.io server to subscribe to WebSocket events
 */
export const createRedisSubscriber = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
};

/**
 * Publish a WebSocket event to Redis
 * This will be consumed by the Socket.io server
 */
export const publishWebSocketEvent = async (
  publisher: Redis,
  userId: string,
  event: string,
  data: any
): Promise<void> => {
  const message: WebSocketMessage = {
    userId,
    event,
    data,
  };

  await publisher.publish(WEBSOCKET_CHANNEL, JSON.stringify(message));
};
