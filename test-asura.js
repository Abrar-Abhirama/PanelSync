import AsuraAdapter from './backend/scraper/AsuraAdapter.js';

async function test() {
    const adapter = new AsuraAdapter();
    const details = await adapter.getDetails('https://asurascans.com/comics/return-of-the-unrivaled-spear-knight-059befe1');
    const chapters = details.chapters;
    console.log("Chapters length:", chapters.length);
    if (chapters.length > 0) {
        console.log("Sample chapter 1:", chapters[0]);
        console.log("Sample chapter 2:", chapters[1]);
        console.log("Sample chapter 3:", chapters[2]);
    }
}
test().catch(console.error);
