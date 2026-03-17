require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const wallRoutes = require('./routes/wall');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/wall', wallRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Lucky Eunwoo Cafe backend running on port ${PORT}`);
});
