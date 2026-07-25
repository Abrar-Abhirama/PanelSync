import AsuraAdapter from './AsuraAdapter.js';
import prisma from '../prismaClient.js';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeChapters() {
    console.log("=== Starting Background Chapter Scraper ===");
    const adapter = new AsuraAdapter();
    
    // Find comics that have 0 chapters so we don't rescrape everything
    const comicsToScrape = await prisma.comic.findMany({
        where: {
            chapters: { none: {} }
        },
        take: 100 
    });
    
    console.log(`Found ${comicsToScrape.length} comics that need their chapter lists downloaded.`);
    
    for (let i = 0; i < comicsToScrape.length; i++) {
        const comic = comicsToScrape[i];
        console.log(`\n[${i+1}/${comicsToScrape.length}] Scraping chapters for: ${comic.title}`);
        
        try {
            // Reconstruct the Asura URL
            const url = `https://asurascans.com/comics/${comic.sourceId.replace('asura-', '')}`;
            const details = await adapter.getDetails(url);
            
            // Save Description & Rating & Genres
            await prisma.comic.update({
                where: { id: comic.id },
                data: {
                    description: details.description,
                    rating: details.rating,
                    author: details.author,
                    releaseDate: details.releaseDate,
                    genres: details.genres
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
            }
            
            // Wait 2 seconds before the next comic to avoid getting blocked by Cloudflare
            console.log("Waiting 2 seconds...");
            await delay(2000);
            
        } catch (error) {
            console.error(`Failed to scrape ${comic.title}:`, error);
        }
    }
    
    console.log(`\n=== Chapter Scrape Complete! ===`);
    await prisma.$disconnect();
}

scrapeChapters();
