import AsuraAdapter from './scraper/AsuraAdapter.js';
import * as cheerio from 'cheerio';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  
  const $ = cheerio.load(html);
  
  $('span, p, div, h1, h2, h3, button').each((_, el) => {
     const text = $(el).text().trim();
     if (text === 'Genres') {
         console.log('Found word Genres, parent text:', $(el).parent().text().replace(/\s+/g, ' '));
     }
  });

  const dates = [];
  $('a[href*="/chapter/"]').each((_, el) => {
      const parent = $(el).parent().parent();
      const allText = parent.text().replace(/\s+/g, ' ');
      dates.push(allText);
  });
  console.log('Chapter block full text (first 3):', dates.slice(0, 3));
})();
