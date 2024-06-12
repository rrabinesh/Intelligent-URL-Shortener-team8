import AppwriteService from './appwrite.js';
import { generateShortCode, throwIfMissing } from './utils.js';
// import cors from 'cors';


export default async ({ res, req, log, error }) => {
  throwIfMissing(process.env, [
    'APPWRITE_API_KEY',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_COLLECTION_ID',
    'SHORT_BASE_URL',
  ]);
  // if (req.method === 'OPTIONS') {
  //   res.setHeader('Access-Control-Allow-Origin', '*');
  //   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  //   res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  //   res.status(204).send('');
  //   return;
  // }

  // Set CORS headers for the actual request
  // res.setHeader('Access-Control-Allow-Origin', '*');
  // res.setHeader('Access-Control-Allow-Methods', 'POST');
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   const appwrite = new AppwriteService();
  // app.use(cors({ origin: '*' }));

  if (
    (req.method === 'POST' || req.method === 'OPTIONS') &&
    req.headers['content-type'] === 'application/json'
  ) {
    try {
      throwIfMissing(req.body, ['url']);
      new URL(req.body.url);
    } catch (err) {
      error(err.message);
      return res.send({ ok: false, error: err.message }, 400);
    }
    const expirationDate = req.body.expirationDate || null; // Extract expiration date from request body

    console.log("Hello, world!");
    const urlEntry = await appwrite.createURLEntry(
      req.body.url,
      req.body.shortCode ?? generateShortCode(),
      req.body.expirationDate // Pass expiration date to the createURLEntry method
    );
    
    if (!urlEntry) {
      error('Failed to create url entry.');
      return res.json({ success: false, error: 'Failed to create url entry' }, 500);
    }
    
    //generate qr code
    try{
      const shortenedURL =  new URL(urlEntry.$id, process.env.SHORT_BASE_URL).toString()
      // const qrCodeFileId = await appwrite.generateQRCode(shortenedURL);
      return res.json({
        short: shortenedURL,
        short_code: urlEntry.$id,
        // qrCodeFileId: qrCodeFileId
      });
    }
    catch (err) {
      error(err.message);
      return res.send({ success: false, error: err.message }, 400);
    }
    
  }

  const shortId = req.path.replace(/^(\/)|(\/)$/g, '');
  log(`Fetching document with ID: ${shortId}`);

  const urlEntry = await appwrite.getURLEntry(shortId);

  if (!urlEntry) {
    return res.send('Invalid link.', 404);
  }

  if (urlEntry.expirationDate && new Date() > new Date(urlEntry.expirationDate)) {
    return res.send('This link has expired.', 410); // 410 - Gone status code indicates the resource is no longer available
  }

  return res.redirect(urlEntry.url);
};
