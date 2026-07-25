import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import comicsRouter from './routes/comics.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import userRouter from './routes/user.js';
import proxyRoutes from './routes/proxy.js'; // Import proxy

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
