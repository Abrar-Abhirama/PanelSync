import AsuraAdapter from './scraper/AsuraAdapter.js';
import * as cheerio from 'cheerio';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  
  const $ = cheerio.load(html);
  
  const genres = [];
  $('.mgen a, .genres a').each((_, el) => {
      genres.push($(el).text().trim());
  });
  console.log('Old selectors genres:', genres);
  
  const newGenres = [];
  $('button, a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('genre=')) {
          newGenres.push($(el).text().trim());
      }
  });
  console.log('Genres from href="genre=":', newGenres);

  const chapterDates = [];
  $('a[href*="/chapter/"]').each((_, el) => {
      const parent = $(el).parent();
      const text = $(el).closest('div').text().trim();
      chapterDates.push(text.substring(0, 50).replace(/\n/g, ' '));
  });
  console.log('Chapter block text sample (first 3):', chapterDates.slice(0, 3));
})();
