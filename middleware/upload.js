const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB   = 5;

const storage = multer.memoryStorage(); // keep file in memory, upload to Firebase Storage

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed (jpeg, png, gif, webp)`));
    }
  },
});

module.exports = upload;
