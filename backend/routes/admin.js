import express from 'express';
import jwt from 'jsonwebtoken';
import { spawn, execSync } from 'child_process';
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
        const { source } = req.body;
        // We use spawn to run the scraper in the background without blocking the API response
        const scriptPath = path.join(__dirname, '../scraper/workerScrapeAll.js');
        const logPath = path.join(__dirname, '../scraper.log');
        
        const args = [scriptPath];
        if (source) {
            args.push(source);
        }
        
        // Prevent multiple instances of the scraper from running simultaneously
        try {
            if (process.platform === 'win32') {
                const tasklist = execSync('wmic process where "commandline like \'%workerScrapeAll.js%\'" get commandline').toString();
                if (tasklist.split('\n').filter(line => line.includes('workerScrapeAll.js')).length > 1) { // >1 because wmic itself might show up, or the check itself
                   return res.status(429).json({ error: 'Scraper is already running!' });
                }
            } else {
                execSync('pgrep -f "[w]orkerScrapeAll.js"');
                return res.status(429).json({ error: 'Scraper is already running!' });
            }
        } catch (e) {
            // pgrep throws an error (exit code 1) if no process is found, which means we are good to go!
            // For Windows, it might throw if wmic fails, but we'll proceed anyway.
        }

        // Open file in write mode to overwrite old logs only AFTER passing the check
        fs.writeFileSync(logPath, '');

        
        const child = spawn('node', args, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Pipe to file manually to avoid block-buffering delays
        child.stdout.on('data', (data) => {
            fs.appendFile(logPath, data, (err) => { if(err) console.error('Log write error:', err); });
        });
        child.stderr.on('data', (data) => {
            fs.appendFile(logPath, data, (err) => { if(err) console.error('Log write error:', err); });
        });

        // Detach the child process so it runs independently
        child.unref();

        res.json({ message: `Scraping started in the background${source ? ' for ' + source : ''}!` });
    } catch (error) {
        console.error('Error starting scraper:', error);
        res.status(500).json({ error: 'Failed to start scraper' });
    }
});

// Stop Scraper
router.post('/scrape/stop', (req, res) => {
    try {
        if (process.platform === 'win32') {
             execSync('wmic process where "commandline like \'%workerScrapeAll.js%\'" call terminate');
        } else {
             execSync('pkill -f workerScrapeAll.js');
        }
        res.json({ message: 'Scraping stopped successfully!' });
    } catch (error) {
        // If pkill fails, it usually means no process was found
        res.json({ message: 'No active scraping process found.' });
    }
});

// Get Live Logs
router.get('/logs', (req, res) => {
    try {
        const logPath = path.join(__dirname, '../scraper.log');
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
