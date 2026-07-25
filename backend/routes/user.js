import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 1. Track Reading Progress
router.post('/read/:comicId/:chapterId', authenticateToken, async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    const chapterId = parseInt(req.params.chapterId);
    const userId = req.user.id;
    const pageNumber = req.body.pageNumber || 1;

    // Check if the chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Upsert ReadingProgress (so they only have ONE progress per comic)
    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_comicId: {
          userId,
          comicId
        }
      },
      update: {
        chapterId,
        pageNumber,
        updatedAt: new Date() // Force timestamp update
      },
      create: {
        userId,
        comicId,
        chapterId,
        pageNumber
      }
    });

    // Also add an entry to ReadingHistory for analytics (optional but good)
    await prisma.readingHistory.create({
      data: {
        userId,
        comicId,
        chapterId
      }
    });

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Failed to track progress:', error);
    res.status(500).json({ error: 'Failed to track reading progress' });
  }
});

// 2. Get User's Recent Reads
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const recentReads = await prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        comic: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            rating: true
          }
        },
        chapter: {
          select: {
            id: true,
            chapterNumber: true,
            title: true
          }
        }
      }
    });

    res.json(recentReads);
  } catch (error) {
    console.error('Failed to fetch recent reads:', error);
    res.status(500).json({ error: 'Failed to fetch recent reads' });
  }
});

// 3. Get progress for a specific comic
router.get('/progress/:comicId', authenticateToken, async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    const userId = req.user.id;

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_comicId: {
          userId,
          comicId
        }
      },
      include: {
        chapter: {
          select: {
            id: true,
            chapterNumber: true,
            title: true
          }
        }
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;
