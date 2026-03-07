import express from 'express';
import { initDb, getDb } from './db.ts';

const router = express.Router();

// Initialize DB when this module is loaded (or lazily)
// For serverless, we might need to ensure initDb is called.
// We'll wrap routes to ensure DB is ready or handle it in the handler.

// API Routes
router.get('/db', async (req, res) => {
  try {
    const db = getDb();
    const collections = await db.listCollections().toArray();
    const result: Record<string, any[]> = {};

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
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

router.post('/db/:collection', async (req, res) => {
  const { collection } = req.params;
  const newItem = { ...req.body };
  
  if (!newItem.id) {
    newItem.id = Math.random().toString(36).substr(2, 9);
  }
  
  try {
    const db = getDb();
    await db.collection(collection).insertOne(newItem);
    const { _id, ...rest } = newItem;
    res.json(rest);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const updatedItem = { ...req.body };
  
  if (updatedItem.id !== id) {
    updatedItem.id = id;
  }
  
  try {
    const db = getDb();
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

router.delete('/db/:collection/:id', async (req, res) => {
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

router.delete('/db/orders', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('orders').deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
