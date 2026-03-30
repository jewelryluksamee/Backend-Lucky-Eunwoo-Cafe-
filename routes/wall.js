const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, bucket, COLLECTION } = require('../config/firebase');
const upload = require('../middleware/upload');

const router = express.Router();

let wallCache = {
  data: null,
  lastFetch: 0
};
const CACHE_TTL_MS = 5000; // 5 seconds local fallback cache

// Middleware to invalidate in-memory cache on mutations
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    wallCache.lastFetch = 0;
  }
  next();
});

// ─── helpers ────────────────────────────────────────────────────────────────

function randomPos() {
  return { x: 60 + Math.random() * 300, y: 40 + Math.random() * 300 };
}

/**
 * Upload a buffer to Firebase Storage and return a public URL.
 * Files are stored under  wall-images/<uuid>.<ext>
 */
async function uploadToStorage(buffer, mimetype, originalname) {
  const ext      = originalname.split('.').pop().toLowerCase() || 'jpg';
  const filename = `wall-images/${uuidv4()}.${ext}`;
  const file     = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType: mimetype,
      // token used by the public download URL
      firebaseStorageDownloadTokens: uuidv4(),
    },
  });

  // Make file publicly readable
  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
  return publicUrl;
}

// ─── GET /api/wall ───────────────────────────────────────────────────────────
// Returns all wall items ordered by creation time (oldest first)
router.get('/', async (_req, res) => {
  try {
    // 1. Edge Caching directive (CDN level)
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');

    // 2. In-Memory Caching fallback (Lambda level)
    const now = Date.now();
    if (wallCache.data && (now - wallCache.lastFetch < CACHE_TTL_MS)) {
      return res.json({ success: true, items: wallCache.data, cached: true });
    }

    const snapshot = await db
      .collection(COLLECTION)
      .orderBy('createdAt', 'asc')
      .get();

    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Update local cache
    wallCache.data = items;
    wallCache.lastFetch = now;

    res.json({ success: true, items });
  } catch (err) {
    console.error('GET /wall error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// ─── POST /api/wall/sticker ──────────────────────────────────────────────────
// Body: { src, x?, y?, size?, rot? }
router.post('/sticker', async (req, res) => {
  try {
    const { src, x, y, size, rot } = req.body;

    if (!src?.trim()) {
      return res.status(400).json({ success: false, error: 'src is required' });
    }

    const pos = randomPos();
    const data = {
      type: 'sticker',
      src:  src.trim(),
      x:    typeof x    === 'number' ? x    : pos.x,
      y:    typeof y    === 'number' ? y    : pos.y,
      size: typeof size === 'number' ? size : 80 + Math.floor(Math.random() * 40),
      rot:  typeof rot  === 'number' ? rot  : (Math.random() * 30 - 15),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(COLLECTION).add(data);
    res.status(201).json({ success: true, id: docRef.id, ...data });
  } catch (err) {
    console.error('POST /wall/sticker error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/wall/polaroid ─────────────────────────────────────────────────
// multipart/form-data  fields: image (file), author, caption, x?, y?, rot?
router.post('/polaroid', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'image file is required' });
    }

    const { author, caption, x, y, rot } = req.body;

    // Upload image to Firebase Storage
    const imageUrl = await uploadToStorage(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const pos = randomPos();
    const data = {
      type:    'polaroid',
      src:     imageUrl,
      author:  author || 'Guest',
      caption: caption?.trim().slice(0, 40) || '',
      x:       x   != null ? parseFloat(x)   : pos.x,
      y:       y   != null ? parseFloat(y)   : pos.y,
      rot:     rot != null ? parseFloat(rot) : (Math.random() * 14 - 7),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(COLLECTION).add(data);
    res.status(201).json({ success: true, id: docRef.id, ...data });
  } catch (err) {
    console.error('POST /wall/polaroid error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/wall/:id/position ──────────────────────────────────────────────
// Body: { x, y }  – called when user drags an item
router.put('/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ success: false, error: 'x and y must be numbers' });
    }

    await db.collection(COLLECTION).doc(id).update({ x, y });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /wall/:id/position error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/wall/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docRef  = db.collection(COLLECTION).doc(id);
    const doc     = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // If it's a polaroid stored in Firebase Storage, delete the file too
    const data = doc.data();
    if (data.type === 'polaroid' && data.src?.includes('storage.googleapis.com')) {
      try {
        // Extract the path after the bucket name
        const url      = new URL(data.src);
        const filePath = decodeURIComponent(url.pathname.split('/').slice(2).join('/'));
        await bucket.file(filePath).delete();
      } catch (storageErr) {
        // Log but don't fail the request if storage deletion errors
        console.warn('Storage delete warning:', storageErr.message);
      }
    }

    await docRef.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /wall/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
