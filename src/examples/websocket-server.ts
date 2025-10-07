import { webSocketServer } from '../server/websocket-server.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

async function startWebSocketServer() {
  logger.info('🚀 Starting WebSocket Server Example');

  try {
    // Start the WebSocket server
    await webSocketServer.start(env.PORT);

    // Log server information
    logger.info(`📡 WebSocket server is running on:`);
    logger.info(`   - HTTP: http://localhost:${env.PORT}`);
    logger.info(`   - WebSocket: ws://localhost:${env.PORT}`);
    logger.info(`   - Health Check: http://localhost:${env.PORT}/health`);

    // Log server stats periodically
    setInterval(() => {
      const stats = webSocketServer.getStats();
      logger.debug(`📊 Server Stats: ${stats.clients} clients, ${stats.sessions} sessions, ${stats.activeSessions} active`);
    }, 30000); // Every 30 seconds

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Received SIGINT, shutting down gracefully...');
      await webSocketServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, shutting down gracefully...');
      await webSocketServer.stop();
      process.exit(0);
    });

    logger.info('✅ WebSocket server started successfully!');
    logger.info('🌐 Ready to accept client connections');

  } catch (error) {
    logger.error('❌ Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebSocketServer().catch((error) => {
    logger.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { startWebSocketServer };