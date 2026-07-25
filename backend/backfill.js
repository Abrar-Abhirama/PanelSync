import prisma from './prismaClient.js';
import MangaDexAdapter from './scraper/MangaDexAdapter.js';

async function backfill() {
    console.log("Starting backfill for MangaDex comics...");
    const adapter = new MangaDexAdapter();
    
    const comics = await prisma.comic.findMany({
        where: { sourceName: 'MangaDex' }
    });

    console.log(`Found ${comics.length} MangaDex comics to update.`);

    for (const comic of comics) {
        console.log(`Updating details for: ${comic.title}...`);
        try {
            const details = await adapter.getComicDetails(comic.sourceId);
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
                console.log(`  -> Updated! (Rating: ${details.rating}, Genres: ${details.genres?.length})`);
            }
        } catch (e) {
            console.error(`  -> Failed to update ${comic.title}:`, e.message);
        }
    }
    console.log("Backfill complete!");
}

backfill();
