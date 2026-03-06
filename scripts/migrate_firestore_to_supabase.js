
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// 1. Firebase Setup
// Download your service account key from Firebase Console -> Project Settings -> Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Supabase Setup
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Use Service Role Key for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateCollection(collectionName, tableName) {
  console.log(`Migrating ${collectionName} to ${tableName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  const records = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // Adjust data structure if necessary to match Supabase schema
    records.push({
      id: doc.id,
      ...data
    });
  });

  if (records.length === 0) {
    console.log(`No records found in ${collectionName}.`);
    return;
  }

  const { error } = await supabase.from(tableName).upsert(records);
  
  if (error) {
    console.error(`Error migrating ${collectionName}:`, error);
  } else {
    console.log(`Successfully migrated ${records.length} records from ${collectionName} to ${tableName}.`);
  }
}

async function migrate() {
  try {
    // Map Firestore Collections to Supabase Tables
    await migrateCollection('products', 'products');
    await migrateCollection('orders', 'orders');
    await migrateCollection('promos', 'promos');
    await migrateCollection('users', 'users');
    await migrateCollection('support_sessions', 'support_sessions');
    await migrateCollection('support_messages', 'support_messages');
    await migrateCollection('notifications', 'notifications');
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
