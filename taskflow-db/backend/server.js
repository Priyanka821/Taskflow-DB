import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './db/connect.js';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  searchTasks,
  getPaginatedTasks
} from './controllers/taskController.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection status check middleware.
// Prevents requests from hanging in Mongoose buffer if connection is offline.
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database connection is offline' });
  }
  next();
});

// API Routes
app.get('/api/tasks', getTasks);
app.post('/api/tasks', createTask);
app.put('/api/tasks/:id', updateTask);
app.delete('/api/tasks/:id', deleteTask);
app.get('/api/tasks/search', searchTasks);
app.get('/api/tasks/paginated', getPaginatedTasks);

// Serve static frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, '../frontend')));

// Fallback to index.html for single-page routing if needed
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view TaskFlow DB`);
});
