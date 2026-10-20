import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { simulatorInstance } from './services/simulatorEngine.js';
import { Machine } from './models/Machine.js';
import { seedDatabase } from './scripts/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
initSocket(server, clientUrl);

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Check if machines exist; if not, auto-seed with full portfolio demo dataset
    const machineCount = await Machine.countDocuments();
    if (machineCount === 0) {
      console.log('📦 No machines found in database. Automatically running initial seed...');
      await seedDatabase();
    }

    // 3. Start 5-second Continuous Simulation Engine
    await simulatorInstance.start();

    // 4. Listen on PORT
    server.listen(PORT, () => {
      console.log(`\n=================================================`);
      console.log(`🔥 WeldMonitor Industrial Backend Server Running`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🌐 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`⚡ Socket.IO Ready on ws://localhost:${PORT}`);
      console.log(`📡 Telemetry Interval: 5 seconds`);
      console.log(`=================================================\n`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  simulatorInstance.pause();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
