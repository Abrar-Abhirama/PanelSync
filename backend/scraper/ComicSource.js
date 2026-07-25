/**
 * ComicSource Interface
 * 
 * Every comic website we want to scrape (Asura, MangaDex, etc.) MUST extend this class.
 * This guarantees that the rest of our application always gets data in the exact same format,
 * no matter how messy the original website's HTML is.
 */
export default class ComicSource {
    constructor() {
        this.sourceName = "Unknown";
    }

    /**
     * Scrapes the directory/browse page to find a list of comics.
     * @param {number} page - The page number to scrape.
     * @returns {Promise<Array<{sourceId: string, title: string, coverUrl: string, sourceUrl: string}>>}
     */
    async getBrowse(page = 1) {
        throw new Error("getBrowse() must be implemented by the adapter!");
    }

    /**
     * Scrapes a specific comic's page to get its description and chapter list.
     * @param {string} comicUrl - The URL of the comic details page.
     * @returns {Promise<{description: string, chapters: Array<{sourceId: string, chapterNumber: number, title: string, url: string}>}>}
     */
    async getDetails(comicUrl) {
        throw new Error("getDetails() must be implemented by the adapter!");
    }

    /**
     * Scrapes a specific chapter page to get all the image URLs.
     * @param {string} chapterUrl - The URL of the chapter reading page.
     * @returns {Promise<Array<string>>} Array of image URLs
     */
    async getPages(chapterUrl) {
        throw new Error("getPages() must be implemented by the adapter!");
    }
}
