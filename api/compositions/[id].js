// @ts-check
// Runtime: nodejs18.x
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'tft-bakademi';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const compositionsCollection = db.collection('compositions');

    switch (req.method) {
      case 'GET':
        // Get a single composition by ID
        const composition = await compositionsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!composition) {
          return res.status(404).json({ error: 'Composition not found' });
        }

        res.status(200).json(composition);
        break;

      case 'PUT':
        // Update an existing composition
        const update = {
          ...req.body,
          updatedAt: new Date(),
        };
        delete update._id;

        const updateResult = await compositionsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: update }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ error: 'Composition not found' });
        }

        res.status(200).json({ success: true, id });
        break;

      case 'DELETE':
        // Delete a composition
        const deleteResult = await compositionsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ error: 'Composition not found' });
        }

        res.status(200).json({ success: true, id });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
