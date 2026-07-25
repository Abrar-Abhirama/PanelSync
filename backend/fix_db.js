import prisma from './prismaClient.js';

async function fix() {
    console.log("Fixing MangaDex chapter sourceIds...");
    const chapters = await prisma.chapter.findMany({
        where: { comic: { sourceName: 'MangaDex' } }
    });
    
    let fixed = 0;
    for (const c of chapters) {
        if (c.sourceId && c.sourceId.includes('mangadex.org/chapter/')) {
            const uuid = c.sourceId.split('/').pop();
            await prisma.chapter.update({
                where: { id: c.id },
                data: { sourceId: uuid }
            });
            fixed++;
        }
    }
    console.log(`Fixed ${fixed} chapters!`);
}

fix();
