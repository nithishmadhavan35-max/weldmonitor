import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const useMemory = process.env.USE_IN_MEMORY_DB === 'true';

  if (uri && !useMemory) {
    try {
      console.log(' Connecting to MongoDB Atlas...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(` MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(` MongoDB Atlas Connection Error: ${error.message}`);
      console.warn('⚠️ Note: If connection failed, ensure your IP address is whitelisted in MongoDB Atlas Network Access (e.g. 0.0.0.0/0).');
    }
  }

  // Fallback to in-memory MongoDB if configured or if Atlas is not reachable
  try {
    console.log('⚡ Initializing in-memory MongoDB server as fallback...');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    console.log(` In-memory MongoDB connected successfully at ${memUri}`);
  } catch (err) {
    console.error(' Could not start MongoDB:', err.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
