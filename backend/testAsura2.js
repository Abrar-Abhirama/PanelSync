import AsuraAdapter from './scraper/AsuraAdapter.js';
import * as cheerio from 'cheerio';
import fs from 'fs';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  
  const $ = cheerio.load(html);
  
  // Try to find the word 'Genres' and see its next siblings
  span, p, div, h1, h2, h3.each((_, el) => {
     const text = $(el).text().trim();
     if (text === 'Genres') {
         console.log('Found word Genres, parent HTML:', $(el).parent().html());
     }
  });

  // Chapter dates
  // Find all elements containing 'ago' or '202'
  const dates = [];
  $('a[href*="/chapter/"]').each((_, el) => {
      // get the text of the sibling div or span
      const parent = $(el).parent();
      const allText = parent.text().replace(/\s+/g, ' ');
      dates.push(allText);
  });
  console.log('Chapter block full text (first 3):', dates.slice(0, 3));
})();
