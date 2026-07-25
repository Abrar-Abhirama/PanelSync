import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import comicsRouter from './routes/comics.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import userRouter from './routes/user.js';
import proxyRoutes from './routes/proxy.js'; // Import proxy
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/comics', comicsRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/user', userRouter);
app.use('/api/proxy', proxyRoutes); // Mount proxy
app.use('/api/admin', adminRouter);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Root route so you don't get "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Welcome to the Comic Platform API! Go to /api/comics to see the data.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Auto Sync Scheduler (Run every 6 hours)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SYNC_INTERVAL = 6 * 60 * 60 * 1000;

setInterval(() => {
    console.log('[Scheduler] Starting auto-sync...');
    const workerPath = path.join(__dirname, 'scraper', 'workerScrapeAll.js');
    fork(workerPath);
}, SYNC_INTERVAL);

// Optional: Run it once on startup after 10 seconds
setTimeout(() => {
    console.log('[Scheduler] Running initial startup sync...');
    const workerPath = path.join(__dirname, 'scraper', 'workerScrapeAll.js');
    fork(workerPath);
}, 10000);
