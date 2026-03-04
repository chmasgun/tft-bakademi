# TFT Bakademi Backend Server

Backend API server for saving and fetching team compositions from MongoDB Atlas.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file in the `server/` directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tft-bakademi?retryWrites=true&w=majority
PORT=3001
```

3. Get your MongoDB Atlas connection string:
   - Go to MongoDB Atlas Dashboard
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with `tft-bakademi` (or your preferred database name)

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

- `GET /api/compositions` - Get all compositions
- `GET /api/compositions/:id` - Get a single composition by ID
- `POST /api/compositions` - Save a new composition
- `PUT /api/compositions/:id` - Update an existing composition
- `DELETE /api/compositions/:id` - Delete a composition
- `GET /health` - Health check endpoint

## Frontend Configuration

In your frontend `.env` file (or `.env.local`), add:
```env
VITE_API_URL=http://localhost:3001/api
```

For production, update this to your deployed backend URL.
