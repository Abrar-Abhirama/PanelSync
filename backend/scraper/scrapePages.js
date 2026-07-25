import prisma from '../prismaClient.js';
import AsuraAdapter from './AsuraAdapter.js';
import MangaDexAdapter from './MangaDexAdapter.js';

const adapters = {
    'AsuraScans': new AsuraAdapter(),
    'MangaDex': new MangaDexAdapter()
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePages() {
    console.log("Starting background page scraper...");

    while (true) {
        try {
            // Find chapters that don't have any pages yet, also include the comic sourceName
            const chapters = await prisma.chapter.findMany({
                where: { pages: { none: {} } },
                include: { comic: true },
                take: 10,
                orderBy: { id: 'desc' }
            });

            if (chapters.length === 0) {
                console.log("All chapters have pages! Sleeping for 60 seconds...");
                await delay(60000);
                continue;
            }

            for (const chapter of chapters) {
                if (!chapter.sourceUrl && chapter.comic.sourceName !== 'MangaDex') {
                    // MangaDex doesn't need sourceUrl for pages, it uses chapter sourceId
                    console.log(`Chapter ${chapter.id} has no sourceUrl. Skipping...`);
                    continue;
                }

                console.log(`Scraping pages for chapter ID ${chapter.id} (Source: ${chapter.comic.sourceName})`);

                try {
                    const adapter = adapters[chapter.comic.sourceName];
                    if (!adapter) {
                        console.error(`Unknown source: ${chapter.comic.sourceName}`);
                        continue;
                    }

                    // Asura uses URL, MangaDex uses sourceId
                    const target = chapter.comic.sourceName === 'MangaDex' ? chapter.sourceId : chapter.sourceUrl;
                    const imageUrls = await adapter.getPages(target);

                    if (imageUrls && imageUrls.length > 0) {
                        let savedCount = 0;
                        for (let i = 0; i < imageUrls.length; i++) {
                            await prisma.page.create({
                                data: {
                                    chapterId: chapter.id,
                                    pageNumber: i + 1,
                                    imageUrl: imageUrls[i]
                                }
                            });
                            savedCount++;
                        }
                        console.log(`Saved ${savedCount} pages for chapter ${chapter.id}`);
                    } else {
                        console.log(`No images found for chapter ${chapter.id}`);
                    }
                } catch (err) {
                    console.error(`Failed to scrape pages for chapter ${chapter.id}:`, err.message);
                }

                // Wait to avoid rate limits
                console.log("Waiting 0.5 second to avoid rate limits...");
                await delay(500);
            }
        } catch (error) {
            console.error("Error in background scraper loop:", error);
            await delay(10000);
        }
    }
}

scrapePages().catch(console.error);
