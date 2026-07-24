import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import comicRoutes from './routes/comics.js'; // Import our new routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/comics', comicRoutes);

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
