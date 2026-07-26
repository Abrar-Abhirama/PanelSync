import AsuraAdapter from './scraper/AsuraAdapter.js';
import fs from 'fs';

(async () => {
  const adapter = new AsuraAdapter();
  const html = await adapter._fetchHtml('https://asuracomic.net/series/solo-leveling-35cd6');
  fs.writeFileSync('test_html.html', html);
  console.log('Saved to test_html.html');
})();
