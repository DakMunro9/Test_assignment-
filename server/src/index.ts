import express from 'express';
import http from 'http';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer, Socket } from 'socket.io';
import routes from './routes';
import { closeDatabase, initializeDatabase } from './db';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const corsOptions: CorsOptions = {
  origin:
    NODE_ENV === 'production' ? ['https://your-production-domain.com'] : '*',
  credentials: true,
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', routes);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: corsOptions,
});

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const startServer = async (): Promise<void> => {
  try {
    await initializeDatabase();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${NODE_ENV}]`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  console.log('Shutting down server...');

  server.close(async (error?: Error) => {
    if (error) {
      console.error('Error shutting down HTTP server:', error);
      process.exit(1);
      return;
    }

    try {
      await closeDatabase();
      process.exit(0);
    } catch (dbError) {
      console.error('Error closing database connection:', dbError);
      process.exit(1);
    }
  });
};

void startServer();

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  void shutdown();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  void shutdown();
});
