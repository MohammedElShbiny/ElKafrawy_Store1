import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { initDb } from '../../db.ts';
import apiRouter from '../../api-routes.ts';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize DB before handling requests
// In serverless, this might run on every cold start
// We can optimize by checking if already connected in db.ts
// But for now, just call it.
// Note: initDb is async, but express middleware is synchronous in setup.
// We can wrap the handler to ensure DB is ready.

app.use('/api', async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('DB Init Error:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.use('/api', apiRouter);

export const handler = serverless(app);
