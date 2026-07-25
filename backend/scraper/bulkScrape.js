import AsuraAdapter from './AsuraAdapter.js';
import prisma from '../prismaClient.js';

async function bulkScrape() {
    console.log("=== Starting Bulk Scraper (Fast Mode) ===");
    const adapter = new AsuraAdapter();

    let totalSaved = 0;

    let page = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`\nFetching Asura Browse Page ${page}...`);

        try {
            const comics = await adapter.getBrowse(page);
            if (comics.length === 0) {
                hasMore = false;
                break;
            }
            
            console.log(`Found ${comics.length} comics on page ${page}.`);

            for (const comicData of comics) {
                // Ensure we don't pass sourceUrl to Prisma, because it's not in the schema
                const { sourceUrl, ...dbData } = comicData;

                await prisma.comic.upsert({
                    where: { sourceId: dbData.sourceId },
                    update: {}, // Don't overwrite if it exists
                    create: dbData
                });
            }

            totalSaved += comics.length;
        } catch (error) {
            console.error(`Failed to scrape page ${page}:`, error);
        }
        page++;
    }

    console.log(`\n=== Bulk Scrape Complete! ===`);
    console.log(`Successfully processed ${totalSaved} comics into the database.`);
    await prisma.$disconnect();
}

bulkScrape();
