import AsuraAdapter from './AsuraAdapter.js';
import prisma from '../prismaClient.js';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorker() {
    console.log("=== Starting Robust Full-Library Scraper ===");
    
    // Find ALL comics that have 0 chapters
    const comicsToScrape = await prisma.comic.findMany({
        where: {
            chapters: { none: {} }
        },
        orderBy: { id: 'asc' } // Process in order
    });
    
    console.log(`Found ${comicsToScrape.length} comics that need their data downloaded.`);
    
    if (comicsToScrape.length === 0) {
        console.log("All comics are already fully scraped. Exiting.");
        return;
    }

    const adapter = new AsuraAdapter();
    
    try {
        // Initialize the browser ONE time
        await adapter.init();
        console.log("Browser initialized successfully.");
        
        for (let i = 0; i < comicsToScrape.length; i++) {
            const comic = comicsToScrape[i];
            console.log(`\n[${i+1}/${comicsToScrape.length}] Scraping: ${comic.title}`);
            
            try {
                // Reconstruct the Asura URL
                const url = `https://asurascans.com/comics/${comic.sourceId.replace('asura-', '')}`;
                const details = await adapter.getDetails(url);
                
                // Save Description & Rating
                await prisma.comic.update({
                    where: { id: comic.id },
                    data: {
                        description: details.description,
                        rating: details.rating,
                        author: details.author,
                        releaseDate: details.releaseDate
                    }
                });
                
                // Save Chapters
                if (details.chapters && details.chapters.length > 0) {
                    // Reverse it so Chapter 1 is inserted first, preserving correct ID order if needed
                    const reversedChapters = [...details.chapters].reverse();
                    
                    let savedCount = 0;
                    for (const ch of reversedChapters) {
                        await prisma.chapter.upsert({
                            where: { sourceId: ch.sourceId },
                            update: {}, // Don't overwrite if it exists
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
                
                // Wait 2 seconds before the next comic to avoid getting blocked by Cloudflare
                if (i < comicsToScrape.length - 1) {
                    console.log("Waiting 2 seconds...");
                    await delay(2000);
                }
                
            } catch (error) {
                console.error(`Failed to scrape ${comic.title}:`, error.message);
                // We do NOT exit on error, we just continue to the next comic!
            }
        }
        
    } catch (globalError) {
        console.error("Global Scraper Error:", globalError);
    } finally {
        // Always close the browser and DB connection
        console.log("Cleaning up resources...");
        await adapter.close();
        await prisma.$disconnect();
        console.log(`\n=== Full-Library Scrape Complete! ===`);
    }
}

runWorker();
