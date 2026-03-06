
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDb, getDb } from './db.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/db', async (req, res) => {
  try {
    const db = getDb();
    const collections = await db.listCollections().toArray();
    const result: Record<string, any[]> = {};

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      // Remove MongoDB internal _id for frontend compatibility if needed, 
      // or keep it. The frontend expects 'id'.
      result[col.name] = docs.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/db/:collection', async (req, res) => {
  const { collection } = req.params;
  const newItem = { ...req.body };
  
  if (!newItem.id) {
    newItem.id = Math.random().toString(36).substr(2, 9);
  }
  
  try {
    const db = getDb();
    await db.collection(collection).insertOne(newItem);
    // Return item without _id to match frontend expectations
    const { _id, ...rest } = newItem;
    res.json(rest);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const updatedItem = { ...req.body };
  
  // Ensure ID matches
  if (updatedItem.id !== id) {
    updatedItem.id = id;
  }
  
  try {
    const db = getDb();
    // Remove _id from update payload if present to avoid immutable field error
    const { _id, ...updateData } = updatedItem;
    
    const result = await db.collection(collection).updateOne(
      { id: id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  
  try {
    const db = getDb();
    const result = await db.collection(collection).deleteOne({ id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Special route for clearing orders
app.delete('/api/db/orders', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('orders').deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  // Initialize DB
  await initDb();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
