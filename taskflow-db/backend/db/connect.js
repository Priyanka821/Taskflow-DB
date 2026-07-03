import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database Connection Warning: ${error.message}`);
    console.log('Backend server will continue running. API endpoints will fail gracefully and frontend will use offline localStorage fallback.');
    // Removed process.exit(1) so the static server stays alive even if the database is offline
  }
};

export default connectDB;
