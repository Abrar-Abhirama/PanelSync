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

    async _fetchHtml(url, retries = 4) {
        console.log(`[AsuraAdapter] Fetching: ${url}`);
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive'
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, { headers });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                return await response.text();
            } catch (error) {
                if (attempt < retries) {
                    const delay = attempt * 3000; // 3s, 6s, 9s
                    console.warn(`[AsuraAdapter] Attempt ${attempt}/${retries} failed (${error.message}). Retrying in ${delay/1000}s...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    console.error(`[AsuraAdapter] All ${retries} attempts failed for: ${url}`);
                    throw error;
                }
            }
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

        // --- EXTRACT TITLE & COVER ---
        let title = $('meta[property="og:title"]').attr('content') || $('title').text().split('-')[0].trim() || $('h1').first().text().trim();
        let coverUrl = $('meta[property="og:image"]').attr('content') || $('img').filter((_, el) => $(el).attr('src')?.includes('cover')).attr('src') || '';
        
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
        let artist = null;
        let releaseDate = null;
        let type = 'Manhwa'; // Default Asura
        let serialization = null;
        let altTitles = [];
        let demographic = null;

        // Try parsing `.imptdt` blocks which contain key-value pairs (Old Layout)
        $('.imptdt').each((_, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('author')) {
                author = $(el).find('i').text().trim() || $(el).text().replace(/author/i, '').trim();
            }
            if (text.includes('artist')) {
                artist = $(el).find('i').text().trim() || $(el).text().replace(/artist/i, '').trim();
            }
            if (text.includes('released')) {
                releaseDate = $(el).find('i').text().trim() || $(el).text().replace(/released/i, '').trim();
            }
            if (text.includes('type')) {
                const foundType = $(el).find('a').text().trim() || $(el).text().replace(/type/i, '').trim();
                if (foundType) type = foundType;
            }
            if (text.includes('serialization')) {
                serialization = $(el).find('i').text().trim() || $(el).text().replace(/serialization/i, '').trim();
            }
        });

        // Backup for New Asura Layout
        if (!author) {
            const authorMatch = $('body').text().match(/Author\s+([A-Za-z0-9 ]+)/i);
            if (authorMatch) author = authorMatch[1].trim();
        }
        if (!artist) {
            const artistMatch = $('body').text().match(/Artist\s+([A-Za-z0-9 ]+)/i);
            if (artistMatch) artist = artistMatch[1].trim();
        }
        if (!releaseDate) {
            const releaseMatch = $('body').text().match(/Released\s+([A-Za-z0-9, ]+)/i);
            if (releaseMatch) releaseDate = releaseMatch[1].trim();
        }
        
        // Extract Alternative Titles (Synonyms)
        const altMatch = $('body').text().match(/(?:Alternative|Synonyms)\s+([^\n]+)/i);
        if (altMatch) {
            altTitles = altMatch[1].split(',').map(t => t.trim()).filter(Boolean);
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
            
            // Extract chapter release date (usually in a span with text-sm or text-white/40)
            let releaseDate = $el.find('.text-sm, .text-white\\/40, .text-gray-400, .text-gray-500').last().text().trim();
            if (!releaseDate) {
                // Fallback: remove title from full text
                const fullText = $el.text().replace(/\s+/g, ' ').trim();
                releaseDate = fullText.replace(title, '').trim();
            }
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
                const sourceId = `asura-${comicSlug}-${chapterId}`;
                if (!chapters.some(c => c.sourceId === sourceId)) {
                    chapters.push({
                        sourceId: sourceId,
                        title: title,
                        chapterNumber: chapterNumber,
                        sourceUrl: chapterUrl,
                        releaseDate: releaseDate || null,
                        translator: "Asura Scans"
                    });
                }
            }
        }

        return {
            sourceId: `asura-${comicUrl.split('/').filter(Boolean).pop()}`,
            title,
            description,
            coverUrl,
            sourceUrl: comicUrl,
            author,
            artist,
            rating,
            genres,
            releaseDate: releaseDate, // Comic release Date
            status,
            language,
            type,
            altTitles,
            demographic,
            serialization,
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
