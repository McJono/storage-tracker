const express = require('express');
const cors = require('cors');
const path = require('path');
const UserManager = require('./src/UserManager');
const MultiUserStorageTracker = require('./src/MultiUserStorageTracker');
const { generateToken, authenticate } = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize managers
const userManager = new UserManager();
const storageManager = new MultiUserStorageTracker();

// Load data on startup
(async () => {
  await userManager.load();
  await storageManager.load();
  console.log('Data loaded successfully');
})();

// Helper function to save data
async function saveData() {
  await userManager.save();
  await storageManager.save();
}

// ============= Authentication Routes =============

/**
 * Register a new user
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await userManager.createUser(username, email, password);
    await saveData();

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login user
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await userManager.authenticate(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user info
 */
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = userManager.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user.toJSON());
});

// ============= Box Routes =============

/**
 * Get all boxes for current user
 */
app.get('/api/boxes', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    res.json(tracker.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new box
 */
app.post('/api/boxes', authenticate, async (req, res) => {
  try {
    const { name, description, parentBoxId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Box name is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const box = tracker.createBox(name, description || '', parentBoxId || null);
    await saveData();

    res.status(201).json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get a specific box
 */
app.get('/api/boxes/:id', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const box = tracker.findBox(req.params.id);
    
    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }

    res.json(box.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a box
 */
app.put('/api/boxes/:id', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const box = tracker.updateBox(req.params.id, updates);
    await saveData();

    res.json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete a box
 */
app.delete('/api/boxes/:id', authenticate, async (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const success = tracker.deleteBox(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Box not found' });
    }

    await saveData();
    res.json({ message: 'Box deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move a box
 */
app.post('/api/boxes/:id/move', authenticate, async (req, res) => {
  try {
    const { newParentBoxId } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const box = tracker.moveBox(req.params.id, newParentBoxId || null);
    await saveData();

    res.json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= Item Routes =============

/**
 * Create a new item
 */
app.post('/api/items', authenticate, async (req, res) => {
  try {
    const { name, description, boxId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (!boxId) {
      return res.status(400).json({ error: 'Box ID is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.createItem(name, description || '', boxId);
    await saveData();

    res.status(201).json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get a specific item
 */
app.get('/api/items/:id', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.findItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update an item
 */
app.put('/api/items/:id', authenticate, async (req, res) => {
  try {
    const { name, description, boughtAmount, boughtPrice, soldAmount, soldPrice } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (boughtAmount !== undefined) updates.boughtAmount = parseFloat(boughtAmount);
    if (boughtPrice !== undefined) updates.boughtPrice = parseFloat(boughtPrice);
    if (soldAmount !== undefined) updates.soldAmount = parseFloat(soldAmount);
    if (soldPrice !== undefined) updates.soldPrice = parseFloat(soldPrice);

    const item = tracker.updateItem(req.params.id, updates);
    await saveData();

    res.json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete an item
 */
app.delete('/api/items/:id', authenticate, async (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const success = tracker.deleteItem(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await saveData();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move an item
 */
app.post('/api/items/:id/move', authenticate, async (req, res) => {
  try {
    const { newBoxId } = req.body;

    if (!newBoxId) {
      return res.status(400).json({ error: 'New box ID is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.moveItem(req.params.id, newBoxId);
    await saveData();

    res.json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= Search & Stats Routes =============

/**
 * Search boxes and items
 */
app.get('/api/search', authenticate, (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const results = tracker.search(q);

    res.json({
      query: q,
      boxes: results.boxes.map(b => b.toJSON()),
      items: results.items.map(i => i.toJSON())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get statistics
 */
app.get('/api/stats', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const stats = tracker.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Error Handling =============

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ============= Start Server =============

app.listen(PORT, () => {
  console.log(`Storage Tracker API server running on http://localhost:${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});

module.exports = app;
