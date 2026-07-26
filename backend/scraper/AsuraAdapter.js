import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import ComicSource from './ComicSource.js';

export default class AsuraAdapter extends ComicSource {
    constructor() {
        super();
        this.sourceName = "Asura Scans";
        this.baseUrl = "https://asurascans.com";
        this.browser = null;
        this.context = null;
    }

    async init() {
        // No-op: Playwright is no longer needed since AsuraScans moved to Astro (SSR)!
        // We keep the method signature so other scripts don't break.
        return;
    }

    async close() {
        // No-op
        return;
    }

    async _fetchHtml(url) {
        console.log(`[AsuraAdapter] Fetching: ${url}`);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error(`[AsuraAdapter] Failed to fetch HTML:`, error);
            throw error;
        }
    }

    async getBrowse(page = 1) {
        const url = `${this.baseUrl}/browse?page=${page}`;
        const html = await this._fetchHtml(url);
        const $ = cheerio.load(html);
        
        const comics = [];
        const elements = $('.grid-cols-2.sm\\:grid-cols-3.md\\:grid-cols-4.lg\\:grid-cols-5 > div, #series-grid .series-card').toArray();

        for (const element of elements) {
            const $el = $(element);
            const rawUrl = $el.find('a').first().attr('href') || '';
            const sourceUrl = rawUrl.startsWith('http') ? rawUrl : `${this.baseUrl}${rawUrl}`;
            
            const urlParts = rawUrl.split('/').filter(Boolean);
            const sourceId = urlParts[urlParts.length - 1] || ''; 

            const title = $el.find('h3, .text-[15px]').first().text().trim() || $el.find('.title').text().trim();
            const rawCoverUrl = $el.find('img').attr('src') || '';

            if (title && sourceId && rawCoverUrl) {
                comics.push({
                    sourceId: `asura-${sourceId}`,
                    title: title,
                    coverUrl: rawCoverUrl,
                    sourceUrl: sourceUrl
                });
            }
        }
        return comics;
    }

    async getDetails(comicUrl) {
        const html = await this._fetchHtml(comicUrl);
        const $ = cheerio.load(html);
        
        // --- EXTRACT DESCRIPTION ---
        // Asura's new layout nests things weirdly. We will find the longest block of pure text in a span or p tag.
        let description = "";
        $('span, p, div').each((_, el) => {
            // Clone the element and remove any child elements (like links, buttons, genres)
            // so we only get the pure text nodes belonging directly to this element.
            const clone = $(el).clone();
            clone.children().remove();
            const text = clone.text().trim();
            
            // The actual synopsis is usually the longest single block of text on the page
            if (text.length > 80 && text.length > description.length && !text.includes('Early chapters')) {
                description = text;
            }
        });
        
        if (!description) description = "Description not found.";

        // --- EXTRACT METADATA ---
        let rating = null;
        let ratingText = $('.num, .rating .num').first().text().trim();
        if (!ratingText) {
            // New Asura Layout
            ratingText = $('body').text().match(/Rating\s+([\d.]+)/)?.[1];
        }
        if (ratingText) rating = parseFloat(ratingText);

        const genres = [];
        $('.mgen a, .genres a').each((_, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });

        let author = null;
        let releaseDate = null;
        
        // Try parsing `.imptdt` blocks which contain key-value pairs (Old Layout)
        $('.imptdt').each((_, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('author')) {
                author = $(el).find('i').text().trim() || $(el).text().replace(/author/i, '').trim();
            }
            if (text.includes('released')) {
                releaseDate = $(el).find('i').text().trim() || $(el).text().replace(/released/i, '').trim();
            }
        });

        // Backup for New Asura Layout
        if (!author) {
            const authorMatch = $('body').text().match(/(?:Author|Artist)\s+([A-Za-z0-9 ]+)/i);
            if (authorMatch) author = authorMatch[1].trim();
        }
        if (!releaseDate) {
            const releaseMatch = $('body').text().match(/Released\s+([A-Za-z0-9, ]+)/i);
            if (releaseMatch) releaseDate = releaseMatch[1].trim();
        }

        // Status extraction (Ongoing/Completed)
        let status = null;
        if ($('body').text().match(/(Ongoing|Completed|Hiatus)/i)) {
            status = $('body').text().match(/(Ongoing|Completed|Hiatus)/i)[1];
            // capitalize
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        }

        const language = "English";

        const chapters = [];
        // Use a generic selector for chapter links to be safe against class changes
        const chapterElements = $('a[href*="/chapter/"]').toArray();

        for (const element of chapterElements) {
            const $el = $(element);
            const rawUrl = $el.attr('href') || '';
            const chapterUrl = rawUrl.startsWith('http') ? rawUrl : `${this.baseUrl}${rawUrl}`;
            
            const title = $el.find('.font-medium').text().trim().replace('<!-- -->', '') || `Chapter ${chapters.length + 1}`;
            
            // Extract chapter release date from parent text
            const parentText = $el.parent().parent().text().replace(/\s+/g, ' ').trim();
            let releaseDate = parentText.replace(title, '').trim();
            if (releaseDate.startsWith(title)) releaseDate = releaseDate.replace(title, '').trim();
            if (releaseDate.length > 50) releaseDate = null; // sanity check

            // Extract a unique chapter ID from the URL (e.g. /chapter/6 -> 6)
            const urlParts = rawUrl.split('/').filter(Boolean);
            const chapterId = urlParts[urlParts.length - 1] || '';

            // Extract chapter number robustly from title (e.g. "Chapter 1-2" -> 1.2, "Prologue" -> 0)
            let chapterNumber = 0;
            const titleLower = title.toLowerCase();
            
            if (titleLower.includes('prologue')) {
                chapterNumber = 0;
            } else {
                // Match patterns like "1", "1.5", "1-2", "1,2"
                const numMatch = title.match(/(\d+)(?:[.,-](\d+))?/);
                if (numMatch) {
                    if (numMatch[2]) {
                        // It has a decimal/dash part, e.g. "1" and "2" -> 1.2
                        chapterNumber = parseFloat(`${numMatch[1]}.${numMatch[2]}`);
                    } else {
                        // Just a whole number
                        chapterNumber = parseFloat(numMatch[1]);
                    }
                } else {
                    // Fallback if no number is found (e.g., "Special Episode")
                    chapterNumber = 9999 - chapters.length; // Ensure they sort to the end, but uniquely
                }
            }

            // The comic slug is the part before /chapter/
            const comicSlug = urlParts[urlParts.length - 3] || 'unknown';

            if (chapterUrl && chapterId) {
                chapters.push({
                    sourceId: chapterId,
                    title: title,
                    chapterNumber: chapterNumber,
                    sourceUrl: chapterUrl,
                    releaseDate: releaseDate || null
                });
            }
        }

        return {
            sourceId: `asura-${comicUrl.split('/').filter(Boolean).pop()}`,
            title,
            description,
            coverUrl,
            sourceUrl: comicUrl,
            author,
            rating,
            genres,
            releaseDate: releaseDate, // Comic release Date
            status,
            language,
            sourceName: this.sourceName,
            chapters
        };
    }

    async getPages(chapterUrl) {
        const html = await this._fetchHtml(chapterUrl);
        const $ = cheerio.load(html);
        
        const pages = [];
        
        // Asura removed #readerarea in their new layout.
        // Now we just find all images and filter for those that look like chapter pages.
        const imageElements = $('img').toArray();

        for (const element of imageElements) {
            const imgUrl = $(element).attr('src') || $(element).attr('data-src');
            // Check if it's a chapter image and not a random avatar or logo
            if (imgUrl && imgUrl.includes('/chapters/') && !pages.includes(imgUrl)) {
                pages.push(imgUrl);
            }
        }

        return pages;
    }
}
