import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { compositionsRouter } from './routes/compositions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string';
let db;

MongoClient.connect(MONGODB_URI)
  .then((client) => {
    console.log('✅ Connected to MongoDB Atlas');
    db = client.db('tft-bakademi');
    
    // Routes
    app.use('/api/compositions', compositionsRouter(db));
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'disconnected' });
});
