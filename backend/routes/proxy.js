import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    return res.status(400).send("No image URL provided");
  }

  try {
    console.log(`[Proxy] Fetching: ${imageUrl}`);
    
    // Determine the referer based on the image URL
    let referer = 'https://asurascans.com/';
    if (imageUrl.includes('mangadex.org')) {
        referer = 'https://mangadex.org/';
    }

    // We use the built-in Node fetch to grab the image
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Target rejected the proxy request with status: ${response.status}`);
    }
    
    // Grab the Content-Type (e.g. image/webp) and tell our frontend what it is
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Stream the image directly to the Next.js frontend!
    // This allows the browser to show the image progressively as it downloads,
    // instead of waiting for the entire file to finish buffering.
    const { Readable } = await import('stream');
    const readableStream = Readable.fromWeb(response.body);
    readableStream.pipe(res);

  } catch (error) {
    console.error("[Proxy Error]:", error.message);
    res.status(500).send("Error fetching image through proxy");
  }
});

export default router;
