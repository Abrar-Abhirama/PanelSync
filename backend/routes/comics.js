import express from 'express';
import prisma from '../prismaClient.js';
import AsuraAdapter from '../scraper/AsuraAdapter.js';
import MangaDexAdapter from '../scraper/MangaDexAdapter.js';

const router = express.Router();

// 1. Get all comics (List view with Pagination & Search)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.q || '';
    const genre = req.query.genre || '';
    const source = req.query.source || '';
    
    const skip = (page - 1) * limit;
    
    const whereClause = {};
    if (search) {
      whereClause.title = { contains: search, mode: 'insensitive' };
    }
    if (genre) {
      const genresList = genre.split(',').map(g => g.trim()).filter(Boolean);
      if (genresList.length > 0) {
        whereClause.genres = { hasEvery: genresList };
      }
    }
    if (source) {
      // e.g. "Asura Scans", "MangaDex"
      whereClause.sourceName = source;
    }

    const [comics, totalCount] = await Promise.all([
      prisma.comic.findMany({
        where: whereClause,
        orderBy: { id: 'asc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { chapters: true }
          }
        }
      }),
      prisma.comic.count({ where: whereClause })
    ]);

    res.json({
      data: comics,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comics' });
  }
});

// 1.5 Get all unique genres dynamically
router.get('/genres/list', async (req, res) => {
  try {
    // We use a raw SQL query to unnest the string arrays and get distinct values
    const result = await prisma.$queryRaw`SELECT DISTINCT unnest(genres) as genre FROM "Comic" ORDER BY genre ASC;`;
    const genres = result.map(r => r.genre).filter(Boolean);
    res.json(genres);
  } catch (error) {
    console.error('[Genres] Error fetching dynamic genres:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
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
    let chapter = await prisma.chapter.findUnique({
      where: { id: parseInt(chapterId) },
      include: {
        comic: true,
        pages: {
          orderBy: { pageNumber: 'asc' } // Ensure pages are in correct reading order!
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // ON-DEMAND SCRAPING: If pages are missing, fetch them instantly!
    if (chapter.pages.length === 0 && chapter.sourceUrl) {
      console.log(`[On-Demand] Scraping pages for chapter ${chapter.id} instantly...`);
      
      let adapter;
      if (chapter.comic.sourceName === 'Asura Scans') {
          adapter = new AsuraAdapter();
      } else if (chapter.comic.sourceName === 'MangaDex') {
          adapter = new MangaDexAdapter();
      }

      if (adapter) {
        try {
          let imageUrls = [];
          if (chapter.comic.sourceName === 'Asura Scans') {
              imageUrls = await adapter.getPages(chapter.sourceUrl);
          } else if (chapter.comic.sourceName === 'MangaDex') {
              imageUrls = await adapter.getPages(chapter.sourceId);
          }
          
        if (imageUrls && imageUrls.length > 0) {
          for (let i = 0; i < imageUrls.length; i++) {
              await prisma.page.create({
                  data: {
                      chapterId: chapter.id,
                      pageNumber: i + 1,
                      imageUrl: imageUrls[i]
                  }
              });
          }
          console.log(`[On-Demand] Instantly saved ${imageUrls.length} pages!`);
          
          // Re-fetch the chapter so we can return the fresh pages to the user
          chapter = await prisma.chapter.findUnique({
            where: { id: parseInt(chapterId) },
            include: {
              pages: {
                orderBy: { pageNumber: 'asc' }
              }
            }
          });
        }
          } catch (err) {
            console.error(`[On-Demand] Failed to scrape pages:`, err.message);
          } finally {
            if (adapter.close) await adapter.close(); // Make sure to close the hidden browser if any
          }
      }
    }

    // Find Previous and Next chapters for navigation
    const allChapters = await prisma.chapter.findMany({
      where: { comicId: chapter.comicId },
      orderBy: { chapterNumber: 'asc' },
      select: { id: true }
    });
    
    const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
    const prevChapterId = currentIndex > 0 ? allChapters[currentIndex - 1].id : null;
    const nextChapterId = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1].id : null;

    res.json({
      ...chapter,
      prevChapterId,
      nextChapterId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chapter pages' });
  }
});

// 4. Ghost Sync: On-Demand check for new chapters
router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;
  
  try {
    const comic = await prisma.comic.findUnique({
      where: { id: parseInt(id) },
      include: { chapters: true }
    });

    if (!comic || !comic.sourceId) {
      return res.status(404).json({ error: 'Comic not found or not linked to a source' });
    }

    console.log(`[Ghost Sync] Checking for new chapters for ${comic.title}...`);
    
    let adapter;
    if (comic.sourceName === 'Asura Scans') {
        adapter = new AsuraAdapter();
    } else if (comic.sourceName === 'MangaDex') {
        adapter = new MangaDexAdapter();
    }

    if (!adapter) {
        return res.status(400).json({ error: 'Unsupported source for ghost sync' });
    }

    try {
      let fetchedChapters = [];
      if (comic.sourceName === 'Asura Scans') {
          const url = `https://asurascans.com/comics/${comic.sourceId.replace('asura-', '')}`;
          const details = await adapter.getDetails(url);
          fetchedChapters = details.chapters || [];
      } else if (comic.sourceName === 'MangaDex') {
          fetchedChapters = await adapter.getChapters(comic.sourceId);
      }
      
      if (fetchedChapters && fetchedChapters.length > 0) {
        let newChaptersAdded = 0;
        const reversedChapters = [...fetchedChapters].reverse();
        
        for (const ch of reversedChapters) {
            // Check if we already have it
            const existing = comic.chapters.find(c => c.sourceId === ch.sourceId);
            if (!existing) {
                await prisma.chapter.create({
                    data: {
                        comicId: comic.id,
                        title: ch.title,
                        chapterNumber: ch.chapterNumber,
                        sourceId: ch.sourceId,
                        sourceUrl: ch.url
                    }
                });
                newChaptersAdded++;
            }
        }
        
        console.log(`[Ghost Sync] Sync complete. Found ${newChaptersAdded} new chapters.`);
        
        // Return updated chapter list if new chapters were found
        if (newChaptersAdded > 0) {
           const updatedComic = await prisma.comic.findUnique({
             where: { id: parseInt(id) },
             include: { 
               chapters: {
                 orderBy: { chapterNumber: 'desc' }
               } 
             }
           });
           return res.json({ updated: true, chapters: updatedComic.chapters });
        } else {
           return res.json({ updated: false });
        }
      }
      return res.json({ updated: false });
    } finally {
      if (adapter.close) await adapter.close();
    }
  } catch (error) {
    console.error(`[Ghost Sync] Error syncing comic ${id}:`, error);
    res.status(500).json({ error: 'Ghost sync failed' });
  }
});

export default router;
