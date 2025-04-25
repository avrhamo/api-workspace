const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

let mongoClient = null;

async function connectToMongo(connectionString) {
  if (mongoClient) {
    await mongoClient.close();
  }

  mongoClient = new MongoClient(connectionString);
  await mongoClient.connect();
  return mongoClient;
}

async function getCollections(client, database) {
  const db = client.db(database);
  const collections = await db.listCollections().toArray();
  return collections.map(c => c.name);
}

async function getCollectionFields(client, database, collection) {
  const db = client.db(database);
  const coll = db.collection(collection);
  const sample = await coll.findOne({});
  
  if (!sample) {
    return [];
  }

  return flattenObject(sample);
}

function flattenObject(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...acc, ...flattenObject(value, path)];
    }
    
    return [...acc, {
      path,
      type: Array.isArray(value) ? 'array' : typeof value,
      value
    }];
  }, []);
}

app.post('/api/mongodb', async (req, res) => {
  const { action, connectionString, database, collection } = req.body;

  try {
    const client = await connectToMongo(connectionString);

    switch (action) {
      case 'getCollections':
        const collections = await getCollections(client, database);
        return res.json({ collections });

      case 'getCollectionFields':
        const fields = await getCollectionFields(client, database, collection);
        return res.json({ fields });

      case 'findOne':
        const doc = await client.db(database).collection(collection).findOne({});
        return res.json({ success: true, document: doc });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 