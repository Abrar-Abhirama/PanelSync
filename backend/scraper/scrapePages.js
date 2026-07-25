import prisma from '../prismaClient.js';
import AsuraAdapter from './AsuraAdapter.js';

const adapter = new AsuraAdapter();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePages() {
    console.log("Starting background page scraper...");

    while (true) {
        try {
            // Find chapters that don't have any pages yet
            const chapters = await prisma.chapter.findMany({
                where: { pages: { none: {} } },
                take: 10,
                orderBy: { id: 'desc' }
            });

            if (chapters.length === 0) {
                console.log("All chapters have pages! Sleeping for 60 seconds...");
                await delay(60000);
                continue;
            }

            for (const chapter of chapters) {
                if (!chapter.sourceUrl) {
                    console.log(`Chapter ${chapter.id} has no sourceUrl. Skipping...`);
                    continue;
                }

                console.log(`Scraping pages for chapter ID ${chapter.id} at ${chapter.sourceUrl}`);

                try {
                    const imageUrls = await adapter.getPages(chapter.sourceUrl);

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
