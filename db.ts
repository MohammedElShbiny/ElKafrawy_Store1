import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import seedData from './db.seed.json';

// Use MONGODB_URI from environment
const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/elkafrawy_db';

if (!process.env.MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI is not set. Using default local URI.');
}

let client: MongoClient | null = null;
let db: any; // Use any to allow both MongoDB Db and FileDb

try {
  if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
    client = new MongoClient(connectionString);
  } else {
    console.warn('Invalid MongoDB URI scheme. Expected mongodb:// or mongodb+srv://. Falling back to FileDb.');
  }
} catch (e) {
  console.error('Error creating MongoClient:', e);
}

// Mock MongoDB implementation for fallback
class FileDb {
  private data: any;
  private filePath: string;

  constructor() {
    // Try to use db.seed.json, fallback to db.json, or empty object
    const seedPath = path.join(process.cwd(), 'db.seed.json');
    const jsonPath = path.join(process.cwd(), 'db.json');
    
    this.filePath = fs.existsSync(seedPath) ? seedPath : jsonPath;
    
    // If neither exists, default to db.seed.json for creation
    if (!fs.existsSync(this.filePath)) {
        this.filePath = seedPath;
    }

    try {
        if (fs.existsSync(this.filePath)) {
            this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        } else {
            // Use imported seed data as fallback if file system read fails or file doesn't exist
            this.data = JSON.parse(JSON.stringify(seedData));
        }
    } catch (e) {
        console.error('Error reading file DB:', e);
        // Fallback to imported seed data
        this.data = JSON.parse(JSON.stringify(seedData));
    }
  }

  private save() {
    try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (e) {
        console.error('Error writing file DB:', e);
    }
  }

  listCollections() {
    return {
        toArray: async () => Object.keys(this.data).map(name => ({ name }))
    };
  }

  collection(name: string) {
    return {
        find: (query: any) => ({
            toArray: async () => {
                return this.data[name] || [];
            }
        }),
        insertOne: async (doc: any) => {
            if (!this.data[name]) this.data[name] = [];
            this.data[name].push(doc);
            this.save();
            return { insertedId: doc.id, acknowledged: true };
        },
        updateOne: async (filter: any, update: any) => {
            if (!this.data[name]) return { matchedCount: 0 };
            const item = this.data[name].find((i: any) => i.id === filter.id);
            if (!item) return { matchedCount: 0 };
            
            if (update.$set) {
                Object.assign(item, update.$set);
            }
            this.save();
            return { matchedCount: 1, modifiedCount: 1 };
        },
        deleteOne: async (filter: any) => {
            if (!this.data[name]) return { deletedCount: 0 };
            const initialLength = this.data[name].length;
            this.data[name] = this.data[name].filter((i: any) => i.id !== filter.id);
            this.save();
            return { deletedCount: initialLength - this.data[name].length };
        },
        deleteMany: async (filter: any) => {
             if (!this.data[name]) return { deletedCount: 0 };
             // Simplified: assume empty filter means delete all
             if (Object.keys(filter).length === 0) {
                 const count = this.data[name].length;
                 this.data[name] = [];
                 this.save();
                 return { deletedCount: count };
             }
             return { deletedCount: 0 };
        },
        countDocuments: async () => {
            return (this.data[name] || []).length;
        },
        insertMany: async (docs: any[]) => {
             if (!this.data[name]) this.data[name] = [];
             this.data[name].push(...docs);
             this.save();
             return { insertedCount: docs.length };
        }
    }
  }
}

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return db;
};

// Initialize the database
export const initDb = async () => {
  if (!client) {
    console.warn('No valid MongoDB client available. Using FileDb.');
    db = new FileDb();
    return;
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully.');
    
    // Extract DB name from URI or use default
    const dbName = connectionString.split('/').pop()?.split('?')[0] || 'elkafrawy_db';
    db = client.db(dbName);

    // Check if data exists (check products collection as a proxy)
    const count = await db.collection('products').countDocuments();

    if (count === 0) {
      console.log('Database appears empty. Seeding from db.seed.json if available...');
      const dbPath = path.join(process.cwd(), 'db.seed.json');
      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        
        for (const [collectionName, items] of Object.entries(data)) {
          if (Array.isArray(items) && items.length > 0) {
            const collection = db.collection(collectionName);
            await collection.insertMany(items);
            console.log(`Seeded ${items.length} items into ${collectionName}`);
          }
        }
        console.log('Seeding completed.');
      }
    }
  } catch (err: any) {
    console.error('Failed to connect to MongoDB.');
    console.error('Error details:', err.message);
    
    // Check for common connection errors or if client is invalid
    if (err.code === 'ECONNREFUSED' || err.name === 'MongoServerSelectionError' || err.name === 'MongoParseError') {
        console.warn('---------------------------------------------------------');
        console.warn('WARNING: MongoDB is not running or not accessible.');
        console.warn('Falling back to local file-based database (db.seed.json).');
        console.warn('This allows the app to run without a real database server.');
        console.warn('---------------------------------------------------------');
        
        db = new FileDb();
    } else {
        // For other errors, we might still want to crash or fallback. 
        // Let's fallback to be safe.
        console.warn('Unknown database error. Falling back to file-based DB.');
        db = new FileDb();
    }
  }
};

export { client };
