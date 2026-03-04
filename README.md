# TFT Bakademi

A Teamfight Tactics guide website with team composition builder.

## Features

- Champion, Trait, Item, and Augment browsing
- Interactive team builder with hexagonal board
- Trait synergy calculation
- Save and load team compositions
- MongoDB Atlas integration via Vercel serverless functions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. MongoDB Atlas Configuration

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

3. Add environment variables:
   - Create `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tft-bakademi?retryWrites=true&w=majority
   MONGODB_DB=tft-bakademi
   ```

### 3. Development

For local development with API routes, use Vercel CLI:

```bash
# Install Vercel CLI globally (if not already installed)
npm i -g vercel

# Run development server with API routes
vercel dev
```

Or use regular Vite dev server (API routes won't work locally, but frontend will):

```bash
npm run dev
```

**Note:** For full functionality including saving compositions, use `vercel dev` which will run both the frontend and API routes locally.

### 4. Build

```bash
npm run build
```

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `MONGODB_DB` (optional, defaults to `tft-bakademi`)

Vercel will automatically detect and deploy your API routes from the `/api` directory.

## Project Structure

```
├── api/                    # Vercel serverless functions (API routes)
│   └── compositions/      # Composition CRUD endpoints
├── src/
│   ├── api/               # Frontend API client
│   ├── components/        # React components
│   ├── pages/             # Page components
│   └── utils/             # Utility functions
└── server/                # Legacy Express server (can be removed)
```

## API Routes

- `GET /api/compositions` - Get all compositions
- `POST /api/compositions` - Save a new composition
- `GET /api/compositions/[id]` - Get a single composition
- `PUT /api/compositions/[id]` - Update a composition
- `DELETE /api/compositions/[id]` - Delete a composition

## Environment Variables

- `MONGODB_URI` - MongoDB Atlas connection string (required)
- `MONGODB_DB` - Database name (optional, defaults to `tft-bakademi`)
