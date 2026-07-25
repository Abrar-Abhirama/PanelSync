import AsuraAdapter from './AsuraAdapter.js';
import MangaDexAdapter from './MangaDexAdapter.js';
import prisma from '../prismaClient.js';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorker() {
    console.log("=== Starting Multi-Source Full-Library Scraper ===");
    const targetSource = process.argv[2];
    if (targetSource) console.log(`[Target Source]: ${targetSource}`);
    
    const allAdapters = [new AsuraAdapter(), new MangaDexAdapter()];
    const adapters = targetSource 
        ? allAdapters.filter(a => a.sourceName === targetSource)
        : allAdapters;

    try {
        for (const adapter of adapters) {
            console.log(`\n--- Initializing Adapter: ${adapter.sourceName} ---`);
            if (typeof adapter.init === 'function') {
                await adapter.init();
            }

            // Step 1: Fetch latest comics from this adapter and add them to DB if they don't exist
            console.log(`Fetching latest comics from ${adapter.sourceName}...`);
            let latestComics = [];
            try {
                if (typeof adapter.getBrowse === 'function') {
                    // Fetch until the page is empty (unlimited)
                    for (let p = 1; ; p++) {
                        console.log(`Fetching page ${p} for ${adapter.sourceName}...`);
                        const pageComics = await adapter.getBrowse(p);
                        if (!pageComics || pageComics.length === 0) break;
                        latestComics = latestComics.concat(pageComics);
                        await delay(1000); // Wait 1s between pages to avoid ban
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch latest comics from ${adapter.sourceName}:`, err.message);
            }

            let newComicsAdded = 0;
            for (const c of latestComics) {
                try {
                    // sourceId must be unique globally. To prevent collisions between sources,
                    // we can prefix mangadex sourceIds if needed, but they are UUIDs so it's fine.
                    // Asura uses strings like 'asura-slug'.
                    const existing = await prisma.comic.findUnique({ where: { sourceId: c.sourceId } });
                    if (!existing) {
                        await prisma.comic.create({
                            data: {
                                sourceId: c.sourceId,
                                title: c.title,
                                coverUrl: c.coverUrl,
                                sourceName: adapter.sourceName
                            }
                        });
                        newComicsAdded++;
                    }
                } catch (e) {
                    // Ignore unique constraint errors
                }
            }
            console.log(`Added ${newComicsAdded} new comics from ${adapter.sourceName}.`);

            // Step 2: Find all comics for THIS source that have 0 chapters and scrape their details/chapters
            const comicsToScrape = await prisma.comic.findMany({
                where: {
                    sourceName: adapter.sourceName,
                    chapters: { none: {} }
                },
                orderBy: { id: 'asc' }
            });
            
            console.log(`Found ${comicsToScrape.length} comics from ${adapter.sourceName} needing chapters.`);
            
            for (let i = 0; i < comicsToScrape.length; i++) {
                const comic = comicsToScrape[i];
                console.log(`\n[${i+1}/${comicsToScrape.length}] Scraping: ${comic.title}`);
                
                try {
                    let details = null;
                    let chapters = [];

                    if (adapter.sourceName === 'Asura Scans') {
                        const url = `https://asurascans.com/comics/${comic.sourceId.replace('asura-', '')}`;
                        details = await adapter.getDetails(url);
                        chapters = details.chapters || [];
                    } else if (adapter.sourceName === 'MangaDex') {
                        details = await adapter.getComicDetails(comic.sourceId);
                        chapters = await adapter.getChapters(comic.sourceId);
                    }

                    if (details) {
                        await prisma.comic.update({
                            where: { id: comic.id },
                            data: {
                                description: details.description,
                                rating: details.rating ? parseFloat(details.rating) : null,
                                author: details.author,
                                releaseDate: details.releaseDate || null,
                                genres: details.genres || [],
                                ...(details.coverUrl ? { coverUrl: details.coverUrl } : {})
                            }
                        });
                    }
                    
                    if (chapters.length > 0) {
                        const reversedChapters = [...chapters].reverse();
                        let savedCount = 0;
                        for (const ch of reversedChapters) {
                            await prisma.chapter.upsert({
                                where: { sourceId: ch.sourceId },
                                update: {},
                                create: {
                                    comicId: comic.id,
                                    title: ch.title,
                                    chapterNumber: ch.chapterNumber,
                                    sourceId: ch.sourceId,
                                    sourceUrl: ch.url
                                }
                            });
                            savedCount++;
                        }
                        console.log(`Successfully saved ${savedCount} chapters!`);
                    } else {
                        console.log(`No chapters found for this comic.`);
                    }
                    
                    if (i < comicsToScrape.length - 1) {
                        await delay(500);
                    }
                    
                } catch (error) {
                    console.error(`Failed to scrape ${comic.title}:`, error.message);
                }
            }

            if (typeof adapter.close === 'function') {
                await adapter.close();
            }
        }
        
    } catch (globalError) {
        console.error("Global Scraper Error:", globalError);
    } finally {
        await prisma.$disconnect();
        console.log(`\n=== Full-Library Scrape Complete! ===`);
    }
}

runWorker();
