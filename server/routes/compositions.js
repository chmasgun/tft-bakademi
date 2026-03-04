import express from 'express';
import { ObjectId } from 'mongodb';

export const compositionsRouter = (db) => {
  const router = express.Router();
  const compositionsCollection = db.collection('compositions');

  // Get all compositions
  router.get('/', async (req, res) => {
    try {
      const compositions = await compositionsCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      res.json(compositions);
    } catch (error) {
      console.error('Error fetching compositions:', error);
      res.status(500).json({ error: 'Failed to fetch compositions' });
    }
  });

  // Get a single composition by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const composition = await compositionsCollection.findOne({ _id: id });
      
      if (!composition) {
        return res.status(404).json({ error: 'Composition not found' });
      }
      
      res.json(composition);
    } catch (error) {
      console.error('Error fetching composition:', error);
      res.status(500).json({ error: 'Failed to fetch composition' });
    }
  });

  // Save a new composition
  router.post('/', async (req, res) => {
    try {
      const composition = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await compositionsCollection.insertOne(composition);
      res.status(201).json({ 
        id: result.insertedId,
        ...composition 
      });
    } catch (error) {
      console.error('Error saving composition:', error);
      res.status(500).json({ error: 'Failed to save composition' });
    }
  });

  // Update an existing composition
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const update = {
        ...req.body,
        updatedAt: new Date(),
      };
      
      // Remove _id from update if present
      delete update._id;
      
      const result = await compositionsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Composition not found' });
      }
      
      res.json({ success: true, id });
    } catch (error) {
      console.error('Error updating composition:', error);
      res.status(500).json({ error: 'Failed to update composition' });
    }
  });

  // Delete a composition
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await compositionsCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Composition not found' });
      }
      
      res.json({ success: true, id });
    } catch (error) {
      console.error('Error deleting composition:', error);
      res.status(500).json({ error: 'Failed to delete composition' });
    }
  });

  return router;
};
