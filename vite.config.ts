import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MongoClient, ObjectId, type Db, type MongoClient as MongoClientType } from 'mongodb'
import dotenv from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

// Source - https://stackoverflow.com/a/76734768
// Posted by alvescleiton
// Retrieved 2026-03-02, License - CC BY-SA 4.0

// MongoDB connection cache
let cachedClient: MongoClientType | null = null
let cachedDb: Db | null = null

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const MONGODB_URI = process.env.MONGODB_URI
  const MONGODB_DB = process.env.MONGODB_DB || 'tft-bakademi'

  if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable in .env.local')
  }

  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db(MONGODB_DB)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle API routes in development
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use(async (req: any, res: any, next: () => void) => {
          // Skip CDragon proxy requests - let Vite proxy handle them
          if (req.url?.startsWith('/api/cdragon')) {
            next();
            return;
          }
          // Handle API routes
          if (req.url?.startsWith('/api/')) {
            try {
              // Set CORS headers
              res.setHeader('Access-Control-Allow-Credentials', 'true')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
              res.setHeader(
                'Access-Control-Allow-Headers',
                'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
              )

              if (req.method === 'OPTIONS') {
                res.statusCode = 200
                res.end()
                return
              }

              const { db } = await connectToDatabase()
              const compositionsCollection = db.collection('compositions')

              // Handle /api/compositions routes
              if (req.url === '/api/compositions' || req.url === '/api/compositions/') {
                if (req.method === 'GET') {
                  const compositions = await compositionsCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .toArray()
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify(compositions))
                } else if (req.method === 'POST') {
                  const body = await parseBody(req)
                  const newComposition = {
                    ...body,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                  const result = await compositionsCollection.insertOne(newComposition)
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 201
                  res.end(JSON.stringify({
                    _id: result.insertedId.toString(),
                    ...newComposition,
                  }))
                } else {
                  res.statusCode = 405
                  res.setHeader('Allow', 'GET, POST')
                  res.end(`Method ${req.method} Not Allowed`)
                }
              }
              // Handle /api/compositions/[id] routes
              else if (req.url.startsWith('/api/compositions/')) {
                const id = req.url.split('/').pop()
                if (!id || id === 'compositions') {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'ID is required' }))
                  return
                }

                if (req.method === 'GET') {
                  const composition = await compositionsCollection.findOne({
                    _id: new ObjectId(id),
                  })
                  if (!composition) {
                    res.statusCode = 404
                    res.end(JSON.stringify({ error: 'Composition not found' }))
                    return
                  }
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify(composition))
                } else if (req.method === 'PUT') {
                  const body = await parseBody(req)
                  const update = {
                    ...body,
                    updatedAt: new Date(),
                  }
                  delete update._id
                  const updateResult = await compositionsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: update }
                  )
                  if (updateResult.matchedCount === 0) {
                    res.statusCode = 404
                    res.end(JSON.stringify({ error: 'Composition not found' }))
                    return
                  }
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, id }))
                } else if (req.method === 'DELETE') {
                  const deleteResult = await compositionsCollection.deleteOne({
                    _id: new ObjectId(id),
                  })
                  if (deleteResult.deletedCount === 0) {
                    res.statusCode = 404
                    res.end(JSON.stringify({ error: 'Composition not found' }))
                    return
                  }
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, id }))
                } else {
                  res.statusCode = 405
                  res.setHeader('Allow', 'GET, PUT, DELETE')
                  res.end(`Method ${req.method} Not Allowed`)
                }
              } else {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Not found' }))
              }
            } catch (error: any) {
              console.error('API error:', error)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Internal server error', message: error.message }))
            }
          } else {
            next()
          }
        })
      }
    }
  ],
  server: {
    watch: {
      usePolling: true
    },
    proxy: {
      '/api/cdragon': {
        target: 'https://raw.communitydragon.org',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove /api/cdragon prefix to get the actual path
          return path.replace(/^\/api\/cdragon/, '');
        },
      },
    }
  }
})
