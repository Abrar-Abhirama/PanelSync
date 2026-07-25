import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Middleware to verify JWT
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Toggle Bookmark
router.post('/toggle', requireAuth, async (req, res) => {
    try {
        const { comicId } = req.body;
        if (!comicId) {
            return res.status(400).json({ error: 'Comic ID is required' });
        }

        const existing = await prisma.bookmark.findUnique({
            where: {
                userId_comicId: {
                    userId: req.userId,
                    comicId: parseInt(comicId)
                }
            }
        });

        if (existing) {
            // Remove bookmark
            await prisma.bookmark.delete({
                where: {
                    userId_comicId: {
                        userId: req.userId,
                        comicId: parseInt(comicId)
                    }
                }
            });
            return res.json({ bookmarked: false });
        } else {
            // Add bookmark
            await prisma.bookmark.create({
                data: {
                    userId: req.userId,
                    comicId: parseInt(comicId)
                }
            });
            return res.json({ bookmarked: true });
        }
    } catch (error) {
        console.error('Bookmark error:', error);
        res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
});

// Get User's Bookmarks
router.get('/', requireAuth, async (req, res) => {
    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.userId },
            include: {
                comic: {
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                        rating: true,
                        _count: {
                            select: { chapters: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(bookmarks.map(b => b.comic));
    } catch (error) {
        console.error('Fetch bookmarks error:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// Check if a specific comic is bookmarked
router.get('/check/:comicId', requireAuth, async (req, res) => {
    try {
        const { comicId } = req.params;
        const bookmark = await prisma.bookmark.findUnique({
            where: {
                userId_comicId: {
                    userId: req.userId,
                    comicId: parseInt(comicId)
                }
            }
        });
        
        res.json({ bookmarked: !!bookmark });
    } catch (error) {
        console.error('Check bookmark error:', error);
        res.status(500).json({ error: 'Failed to check bookmark status' });
    }
});

export default router;
