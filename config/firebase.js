const admin = require('firebase-admin');

// Option A – service account JSON file path (recommended for local dev)
// Set FIREBASE_SERVICE_ACCOUNT_PATH in .env  e.g.  ./serviceAccountKey.json
//
// Option B – individual env vars (recommended for production / hosting)
// Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const serviceAccount = require(
    require('path').resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  );
  credential = admin.credential.cert(serviceAccount);
} else {
  credential = admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // env vars escape newlines – replace literal \n
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // e.g. your-project.appspot.com
  });
}

const db      = admin.firestore();
const bucket  = admin.storage().bucket();
const COLLECTION = 'wallItems';

module.exports = { db, bucket, COLLECTION };
