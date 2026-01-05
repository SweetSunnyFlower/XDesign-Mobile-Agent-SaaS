import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './lib/websocket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io server
  initSocketServer(httpServer);

  // Start listening
  httpServer.listen(port, () => {
    console.log(`
╭─────────────────────────────────────────────────╮
│  🚀 XDesign AI Server Ready                     │
│                                                 │
│  ➜ Local:    http://${hostname}:${port}        │
│  ➜ Mode:     ${dev ? 'Development' : 'Production'}                   │
│  ➜ Socket.io: ✅ Enabled                         │
╰─────────────────────────────────────────────────╯
    `);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
});
