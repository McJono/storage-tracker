const fs = require('fs').promises;
const path = require('path');
const Box = require('./Box');
const Item = require('./Item');

/**
 * StorageTracker manages the hierarchy of boxes and items
 */
class StorageTracker {
  constructor(dataPath = null) {
    this.rootBoxes = []; // Top-level boxes
    this.dataPath = dataPath || path.join(__dirname, '../data/storage.json');
    this.nextId = 1;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${this.nextId++}`;
  }

  /**
   * Create a new box
   */
  createBox(name, description = '', parentBoxId = null) {
    const box = new Box(this.generateId(), name, description);
    
    if (parentBoxId) {
      const parentBox = this.findBox(parentBoxId);
      if (!parentBox) {
        throw new Error(`Parent box with ID ${parentBoxId} not found`);
      }
      parentBox.addBox(box);
    } else {
      this.rootBoxes.push(box);
    }
    
    return box;
  }

  /**
   * Create a new item
   */
  createItem(name, description = '', boxId = null) {
    const item = new Item(this.generateId(), name, description);
    
    if (boxId) {
      const box = this.findBox(boxId);
      if (!box) {
        throw new Error(`Box with ID ${boxId} not found`);
      }
      box.addItem(item);
    } else {
      throw new Error('Items must be added to a box');
    }
    
    return item;
  }

  /**
   * Find a box by ID
   */
  findBox(boxId) {
    for (const box of this.rootBoxes) {
      const found = box.findBox(boxId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Find an item by ID
   */
  findItem(itemId) {
    for (const box of this.rootBoxes) {
      const found = box.findItem(itemId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Update a box
   */
  updateBox(boxId, updates) {
    const box = this.findBox(boxId);
    if (!box) {
      throw new Error(`Box with ID ${boxId} not found`);
    }
    box.update(updates);
    return box;
  }

  /**
   * Update an item
   */
  updateItem(itemId, updates) {
    const item = this.findItem(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    item.update(updates);
    return item;
  }

  /**
   * Delete a box
   */
  deleteBox(boxId) {
    // Try to remove from root boxes
    const rootIndex = this.rootBoxes.findIndex(b => b.id === boxId);
    if (rootIndex !== -1) {
      this.rootBoxes.splice(rootIndex, 1);
      return true;
    }
    
    // Try to remove from nested boxes
    for (const box of this.rootBoxes) {
      if (box.removeBox(boxId)) {
        return true;
      }
      // Recursive search in nested boxes
      const found = this._removeBoxRecursive(box, boxId);
      if (found) return true;
    }
    
    return false;
  }

  /**
   * Helper method for recursive box removal
   */
  _removeBoxRecursive(parentBox, boxId) {
    for (const box of parentBox.boxes) {
      if (box.removeBox(boxId)) {
        return true;
      }
      if (this._removeBoxRecursive(box, boxId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Delete an item
   */
  deleteItem(itemId) {
    for (const box of this.rootBoxes) {
      if (box.removeItem(itemId)) {
        return true;
      }
      // Recursive search in nested boxes
      const found = this._removeItemRecursive(box, itemId);
      if (found) return true;
    }
    return false;
  }

  /**
   * Helper method for recursive item removal
   */
  _removeItemRecursive(parentBox, itemId) {
    for (const box of parentBox.boxes) {
      if (box.removeItem(itemId)) {
        return true;
      }
      if (this._removeItemRecursive(box, itemId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Move a box to a different parent
   */
  moveBox(boxId, newParentBoxId) {
    const box = this.findBox(boxId);
    if (!box) {
      throw new Error(`Box with ID ${boxId} not found`);
    }

    let newParent = null;
    // Check if trying to move to a new parent
    if (newParentBoxId) {
      newParent = this.findBox(newParentBoxId);
      if (!newParent) {
        throw new Error(`New parent box with ID ${newParentBoxId} not found`);
      }
      
      // Prevent circular reference: check if newParent is a descendant of box
      if (box.findBox(newParentBoxId)) {
        throw new Error('Cannot move a box into one of its own descendants');
      }
    }

    // Remove from current location
    this.deleteBox(boxId);

    // Add to new location
    if (newParent) {
      newParent.addBox(box);
    } else {
      this.rootBoxes.push(box);
    }

    return box;
  }

  /**
   * Move an item to a different box
   */
  moveItem(itemId, newBoxId) {
    const item = this.findItem(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    const newBox = this.findBox(newBoxId);
    if (!newBox) {
      throw new Error(`New box with ID ${newBoxId} not found`);
    }

    // Remove from current location
    this.deleteItem(itemId);

    // Add to new location
    newBox.addItem(item);

    return item;
  }

  /**
   * Search boxes and items by name
   */
  search(query) {
    const results = { boxes: [], items: [] };
    const lowerQuery = query.toLowerCase();

    for (const box of this.rootBoxes) {
      this._searchRecursive(box, lowerQuery, results, []);
    }

    return results;
  }

  /**
   * Helper method for recursive search
   */
  _searchRecursive(box, query, results, parentPath) {
    // Current path including this box
    const currentPath = [...parentPath, { id: box.id, name: box.name }];
    
    // Search box
    if (box.name.toLowerCase().includes(query) || 
        box.description.toLowerCase().includes(query)) {
      results.boxes.push({
        box: box,
        path: parentPath // Path does not include the matched box itself
      });
    }

    // Search items in this box
    for (const item of box.items) {
      if (item.name.toLowerCase().includes(query) || 
          item.description.toLowerCase().includes(query)) {
        results.items.push({
          item: item,
          path: currentPath // Path includes all boxes containing the item
        });
      }
    }

    // Search nested boxes
    for (const nestedBox of box.boxes) {
      this._searchRecursive(nestedBox, query, results, currentPath);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalBoxes = 0;
    let totalItems = 0;

    const countRecursive = (box) => {
      totalBoxes++;
      totalItems += box.items.length;
      box.boxes.forEach(b => countRecursive(b));
    };

    this.rootBoxes.forEach(box => countRecursive(box));

    return {
      totalBoxes,
      totalItems,
      rootBoxes: this.rootBoxes.length
    };
  }

  /**
   * Save to file
   */
  async save() {
    const data = {
      rootBoxes: this.rootBoxes.map(box => box.toJSON()),
      nextId: this.nextId,
      savedAt: new Date().toISOString()
    };

    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.rootBoxes = parsed.rootBoxes.map(b => Box.fromJSON(b, Item));
      this.nextId = parsed.nextId || 1;
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start fresh
        return false;
      }
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      rootBoxes: this.rootBoxes.map(box => box.toJSON()),
      stats: this.getStats()
    };
  }
}

module.exports = StorageTracker;
