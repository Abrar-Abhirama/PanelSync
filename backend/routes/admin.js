import express from 'express';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Apply middleware to all admin routes
router.use(verifyAdmin);

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const totalComics = await prisma.comic.count();
        const totalChapters = await prisma.chapter.count();
        const totalPages = await prisma.page.count();

        res.json({
            users: totalUsers,
            comics: totalComics,
            chapters: totalChapters,
            pages: totalPages
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Trigger Scraper
router.post('/scrape', (req, res) => {
    try {
        // We use spawn to run the scraper in the background without blocking the API response
        const scriptPath = path.resolve('scraper/workerScrapeAll.js');
        const logPath = path.resolve('scraper.log');
        
        // Open file in write mode to overwrite old logs
        const logStream = fs.openSync(logPath, 'w');
        
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: ['ignore', logStream, logStream] // Pipe stdout and stderr to the log file
        });

        // Detach the child process so it runs independently
        child.unref();

        res.json({ message: 'Scraping started in the background!' });
    } catch (error) {
        console.error('Error starting scraper:', error);
        res.status(500).json({ error: 'Failed to start scraper' });
    }
});

// Get Live Logs
router.get('/logs', (req, res) => {
    try {
        const logPath = path.resolve('scraper.log');
        if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf8');
            // Slice the last 10000 characters to keep the payload lightweight
            res.json({ logs: content.slice(-10000) });
        } else {
            res.json({ logs: 'Waiting for scraper to start... No logs yet.' });
        }
    } catch (error) {
        console.error('Error reading logs:', error);
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// --- USER MANAGEMENT CRUD ---

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, createdAt: true },
            orderBy: { id: 'asc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create a new user
router.post('/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { username, password: hashedPassword, role: role || 'USER' },
            select: { id: true, username: true, role: true, createdAt: true }
        });

        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update a user
router.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, password, role } = req.body;

        const dataToUpdate = {};
        if (username) dataToUpdate.username = username;
        if (role) dataToUpdate.role = role;
        if (password) dataToUpdate.password = await bcrypt.hash(password, 10);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { id: true, username: true, role: true, createdAt: true }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
