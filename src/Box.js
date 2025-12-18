/**
 * Box class represents a storage container that can hold items and other boxes
 */
class Box {
  constructor(id, name, description = '') {
    this.id = id;
    this.name = name;
    this.description = description;
    this.boxes = []; // Nested boxes
    this.items = []; // Items in this box
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update box details
   */
  update(updates) {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add a nested box
   */
  addBox(box) {
    this.boxes.push(box);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a nested box by ID
   */
  removeBox(boxId) {
    const index = this.boxes.findIndex(b => b.id === boxId);
    if (index !== -1) {
      this.boxes.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Add an item
   */
  addItem(item) {
    this.items.push(item);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove an item by ID
   */
  removeItem(itemId) {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Find a box by ID (recursive search)
   */
  findBox(boxId) {
    if (this.id === boxId) return this;
    
    for (const box of this.boxes) {
      const found = box.findBox(boxId);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Find an item by ID (recursive search)
   */
  findItem(itemId) {
    // Check items in this box
    const item = this.items.find(i => i.id === itemId);
    if (item) return item;
    
    // Check nested boxes
    for (const box of this.boxes) {
      const found = box.findItem(itemId);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Get total number of items (including nested boxes)
   */
  getTotalItemCount() {
    let count = this.items.length;
    for (const box of this.boxes) {
      count += box.getTotalItemCount();
    }
    return count;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      boxes: this.boxes.map(box => box.toJSON()),
      items: this.items.map(item => item.toJSON()),
      totalItems: this.getTotalItemCount(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Box from plain object
   */
  static fromJSON(data, Item) {
    const box = new Box(data.id, data.name, data.description);
    box.createdAt = data.createdAt || new Date().toISOString();
    box.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Restore nested boxes
    if (data.boxes) {
      box.boxes = data.boxes.map(b => Box.fromJSON(b, Item));
    }
    
    // Restore items
    if (data.items) {
      box.items = data.items.map(i => Item.fromJSON(i));
    }
    
    return box;
  }
}

module.exports = Box;
