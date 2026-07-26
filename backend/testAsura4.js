import AsuraAdapter from './scraper/AsuraAdapter.js';
import * as cheerio from 'cheerio';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  const $ = cheerio.load(html);
  
  $('script').each((_, el) => {
      const text = $(el).html();
      if (text && text.includes('Solo Leveling') && text.includes('Action')) {
          console.log('Found possible state script! Length:', text.length);
          console.log(text.substring(0, 500));
      }
  });
})();
