import AsuraAdapter from './backend/scraper/AsuraAdapter.js';

async function test() {
    const adapter = new AsuraAdapter();
    const details = await adapter.getDetails('https://asurascans.com/comics/return-of-the-unrivaled-spear-knight-059befe1');
    const chapters = details.chapters;
    console.log("Chapters length:", chapters.length);
    
    const ids = new Set();
    const duplicates = [];
    for (const ch of chapters) {
        if (ids.has(ch.sourceId)) {
            duplicates.push(ch.sourceId);
        }
        ids.add(ch.sourceId);
    }
    console.log("Duplicates found:", duplicates.length);
    if (duplicates.length > 0) {
        console.log("Sample duplicates:", duplicates.slice(0, 5));
    }
}
test().catch(console.error);
