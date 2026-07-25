import ComicSource from './ComicSource.js';
import dns from 'dns';
import axios from 'axios';
import https from 'https';

// Fix Node 18+ fetch failing on IPv6 networks
dns.setDefaultResultOrder('ipv4first');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export default class MangaDexAdapter extends ComicSource {
    constructor() {
        super();
        this.sourceName = 'MangaDex';
        this.baseUrl = 'https://api.mangadex.org';
        this.uploadsUrl = 'https://uploads.mangadex.org';
    }

    async getBrowse(page = 1) {
        // We'll just fetch the latest updated comics.
        // Pagination is offset = (page-1)*10.
        try {
            const offset = (page - 1) * 10;
            let url = `${this.baseUrl}/manga?includes[]=cover_art&hasAvailableChapters=true&availableTranslatedLanguage[]=en&limit=10&offset=${offset}&order[updatedAt]=desc`;

            const res = await axios.get(url, {
                headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                httpsAgent
            });
            const data = res.data;

            const comics = data.data.map(manga => {
                const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
                const coverRel = manga.relationships.find(rel => rel.type === 'cover_art');
                const coverFileName = coverRel?.attributes?.fileName;
                const coverUrl = coverFileName ? `${this.uploadsUrl}/covers/${manga.id}/${coverFileName}` : null;

                return {
                    sourceId: manga.id,
                    title: title,
                    coverUrl: coverUrl,
                    url: `https://mangadex.org/title/${manga.id}`
                };
            });

            return comics;
        } catch (error) {
            console.error(`[MangaDexAdapter] Error searching comics: ${error.message}`);
            return [];
        }
    }

    async getComicDetails(sourceId) {
        try {
            const res = await axios.get(`${this.baseUrl}/manga/${sourceId}?includes[]=author&includes[]=artist&includes[]=cover_art`, {
                headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                httpsAgent
            });
            const data = res.data;
            const manga = data.data;

            const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
            const description = manga.attributes.description.en || Object.values(manga.attributes.description)[0] || 'No description available.';

            const authorRel = manga.relationships.find(rel => rel.type === 'author');
            const author = authorRel?.attributes?.name || 'Unknown Author';

            const coverRel = manga.relationships.find(rel => rel.type === 'cover_art');
            const coverFileName = coverRel?.attributes?.fileName;
            const coverUrl = coverFileName ? `${this.uploadsUrl}/covers/${manga.id}/${coverFileName}` : null;

            const genres = manga.attributes.tags
                .filter(tag => tag.attributes.group === 'genre')
                .map(tag => tag.attributes.name.en);

            // Fetch rating from statistics endpoint
            let rating = null;
            try {
                const statRes = await axios.get(`${this.baseUrl}/statistics/manga/${sourceId}`, {
                    headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                    httpsAgent
                });
                const stats = statRes.data.statistics[sourceId];
                if (stats && stats.rating && stats.rating.average) {
                    rating = stats.rating.average.toFixed(2);
                }
            } catch (err) {
                console.log(`[MangaDexAdapter] Could not fetch rating for ${sourceId}`);
            }

            return {
                title,
                description,
                author,
                coverUrl,
                genres,
                status: manga.attributes.status,
                rating,
                releaseDate: manga.attributes.year?.toString() || null
            };
        } catch (error) {
            console.error(`[MangaDexAdapter] Error getting details for ${sourceId}: ${error.message}`);
            return null;
        }
    }

    async getChapters(sourceId) {
        try {
            // Fetch English chapters, ordered descending
            const res = await axios.get(`${this.baseUrl}/manga/${sourceId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=100`, {
                headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                httpsAgent
            });
            const data = res.data;

            // MangaDex can return multiple groups translating the same chapter. 
            // We should filter to unique chapter numbers to avoid duplicates, keeping the first one found.
            const uniqueChapters = [];
            const seenNumbers = new Set();

            for (const ch of data.data) {
                const chapNum = parseFloat(ch.attributes.chapter);
                if (isNaN(chapNum) || seenNumbers.has(chapNum)) continue;

                seenNumbers.add(chapNum);

                uniqueChapters.push({
                    sourceId: ch.id,
                    title: ch.attributes.title || `Chapter ${chapNum}`,
                    chapterNumber: chapNum,
                    url: `https://mangadex.org/chapter/${ch.id}`
                });
            }

            return uniqueChapters;
        } catch (error) {
            console.error(`[MangaDexAdapter] Error getting chapters for ${sourceId}: ${error.message}`);
            return [];
        }
    }

    async getPages(chapterSourceId) {
        try {
            const res = await axios.get(`${this.baseUrl}/at-home/server/${chapterSourceId}`, {
                headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                httpsAgent
            });
            const data = res.data;

            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            const files = data.chapter.data;

            // Construct full image URLs
            const pages = files.map(filename => {
                return `${baseUrl}/data/${hash}/${filename}`;
            });

            return pages;
        } catch (error) {
            console.error(`[MangaDexAdapter] Error getting pages for ${chapterSourceId}: ${error.message}`);
            return [];
        }
    }
}
