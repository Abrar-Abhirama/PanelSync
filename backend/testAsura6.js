import AsuraAdapter from './scraper/AsuraAdapter.js';
import * as cheerio from 'cheerio';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  const $ = cheerio.load(html);
  
  // Find Genres! Let's just find "Action" in the whole text.
  let genres = [];
  $('button, span').each((_, el) => {
      const text = $(el).text().trim();
      if (['Action', 'Adventure', 'Fantasy', 'Romance', 'Comedy', 'Drama', 'Sci-Fi', 'Slice of Life'].includes(text)) {
          genres.push(text);
      }
  });
  console.log('Found genres:', [...new Set(genres)]);

  const chapters = [];
  $('a[href*="/chapter/"]').each((_, el) => {
      const title = $(el).find('.font-medium').text().trim().replace('<!-- -->', '');
      const parentText = $(el).parent().parent().text().replace(/\s+/g, ' ').trim();
      let dateStr = parentText.replace(title, '').trim();
      // Asura chapter items have text like "Chapter 8 4 hours ago".
      // if title is "Chapter 8", parentText is "Chapter 8 4 hours ago", so dateStr will be "4 hours ago"
      if (dateStr.startsWith(title)) dateStr = dateStr.replace(title, '').trim();
      chapters.push({title, dateStr});
  });
  console.log('Chapter dates:', chapters.slice(0, 3));
})();
