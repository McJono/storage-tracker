const fs = require('fs').promises;
const path = require('path');
const StorageTracker = require('./StorageTracker');

/**
 * MultiUserStorageTracker manages storage data for multiple users
 */
class MultiUserStorageTracker {
  constructor(dataPath = null) {
    this.userStorages = new Map(); // userId -> StorageTracker
    this.dataPath = dataPath || path.join(__dirname, '../data/multi-user-storage.json');
  }

  /**
   * Get or create storage tracker for a user
   */
  getUserStorage(userId) {
    if (!this.userStorages.has(userId)) {
      this.userStorages.set(userId, new StorageTracker(null));
    }
    return this.userStorages.get(userId);
  }

  /**
   * Save all user data to file
   */
  async save() {
    const data = {
      userStorages: {},
      savedAt: new Date().toISOString()
    };

    for (const [userId, tracker] of this.userStorages.entries()) {
      data.userStorages[userId] = tracker.toJSON();
    }

    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load all user data from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      for (const [userId, storageData] of Object.entries(parsed.userStorages || {})) {
        const tracker = new StorageTracker(null);
        // Manually restore the data
        const Box = require('./Box');
        const Item = require('./Item');
        tracker.rootBoxes = storageData.rootBoxes.map(b => Box.fromJSON(b, Item));
        tracker.nextId = storageData.stats ? storageData.stats.totalBoxes + storageData.stats.totalItems + 1 : 1;
        this.userStorages.set(userId, tracker);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start fresh
        return false;
      }
      throw error;
    }
  }
}

module.exports = MultiUserStorageTracker;
