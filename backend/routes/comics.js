import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// 1. Get all comics (List view)
router.get('/', async (req, res) => {
  try {
    const comics = await prisma.comic.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(comics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comics' });
  }
});

// 2. Get a single comic with its chapters
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comic = await prisma.comic.findUnique({
      where: { id: parseInt(id) },
      include: { 
        chapters: {
          orderBy: { chapterNumber: 'desc' }
        } 
      }
    });

    if (!comic) {
      return res.status(404).json({ error: 'Comic not found' });
    }
    res.json(comic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comic details' });
  }
});

// 3. Get a specific chapter with its image pages
router.get('/chapters/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const chapter = await prisma.chapter.findUnique({
      where: { id: parseInt(chapterId) },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' } // Ensure pages are in correct reading order!
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    res.json(chapter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chapter pages' });
  }
});

export default router;
