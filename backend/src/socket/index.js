import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

let io = null;

export const initSocket = (server, clientOrigin) => {
  io = new Server(server, {
    cors: {
      origin: clientOrigin || '*',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow guest / monitor connection for dashboard views, but tag as unauthenticated
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'weldmonitor_super_secret_jwt_development_key_2026_xyz987'
      );
      const user = await User.findById(decoded.id);

      if (user && user.status === 'ACTIVE') {
        socket.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
      next();
    } catch (err) {
      // Allow connection with guest role if invalid token, or proceed
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // console.log(`🔌 Socket client connected: ${socket.id} (${socket.user ? socket.user.role : 'Guest'})`);

    // Subscribe to specific machine telemetry
    socket.on('machine:subscribe', (machineId) => {
      if (machineId) {
        socket.join(`machine:${machineId}`);
      }
    });

    socket.on('machine:unsubscribe', (machineId) => {
      if (machineId) {
        socket.leave(`machine:${machineId}`);
      }
    });

    // Subscribe to global dashboard summary
    socket.on('dashboard:subscribe', () => {
      socket.join('dashboard:summary');
    });

    socket.on('disconnect', (reason) => {
      // console.log(`🔌 Socket client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
