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
            const offset = (page - 1) * 50;
            let url = `${this.baseUrl}/manga?includes[]=cover_art&hasAvailableChapters=true&availableTranslatedLanguage[]=en&limit=50&offset=${offset}&order[updatedAt]=desc`;

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
            throw error; // Throw error so worker can catch it and handle retries
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

            const artistRel = manga.relationships.find(rel => rel.type === 'artist');
            const artist = artistRel?.attributes?.name || null;

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


            let status = manga.attributes.status || null;
            if (status) status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

            let language = 'English';
            if (manga.attributes.availableTranslatedLanguages?.includes('id')) {
                language = 'Indonesian / English';
            } else if (manga.attributes.availableTranslatedLanguages?.includes('en')) {
                language = 'English';
            }

            const originalLang = manga.attributes.originalLanguage;
            let type = null;
            if (originalLang === 'ja') type = 'Manga';
            else if (originalLang === 'ko') type = 'Manhwa';
            else if (originalLang === 'zh' || originalLang === 'zh-hk') type = 'Manhua';

            const altTitles = manga.attributes.altTitles ? manga.attributes.altTitles.map(t => Object.values(t)[0]) : [];
            const demographic = manga.attributes.publicationDemographic || null;
            // Publisher/serialization is complicated in MangaDex without extra relationship queries, we leave it null or map from tags if needed
            const serialization = null; 

            return {
                title,
                description,
                author,
                artist,
                coverUrl,
                genres,
                status: status,
                language: language,
                type,
                altTitles,
                demographic,
                serialization,
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
            const res = await axios.get(`${this.baseUrl}/manga/${sourceId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=100&includes[]=scanlation_group`, {
                headers: { 'User-Agent': 'PanelSync-App/1.0 (Mozilla/5.0)' },
                httpsAgent
            });
            const data = res.data;

            // MangaDex can return multiple groups translating the same chapter. 
            // We should filter to unique chapter numbers to avoid duplicates, keeping the first one found.
            const uniqueChapters = [];
            const seenNumbers = new Set();

            for (const ch of data.data) {
                const chapterNumber = ch.attributes.chapter ? parseFloat(ch.attributes.chapter) : 0;
                
                // If we haven't seen this chapter number yet, add it
                if (!seenNumbers.has(chapterNumber)) {
                    seenNumbers.add(chapterNumber);

                    // Extract release Date from publishAt
                    let releaseDate = null;
                    if (ch.attributes.publishAt) {
                        const dateObj = new Date(ch.attributes.publishAt);
                        releaseDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }

                    const scanlationRel = ch.relationships?.find(r => r.type === 'scanlation_group');
                    const translator = scanlationRel?.attributes?.name || null;

                    uniqueChapters.push({
                        sourceId: ch.id,
                        title: ch.attributes.title || `Chapter ${ch.attributes.chapter}`,
                        chapterNumber: chapterNumber,
                        sourceUrl: `https://mangadex.org/chapter/${ch.id}`,
                        releaseDate: releaseDate,
                        translator: translator
                    });
                }
            }return uniqueChapters;
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
