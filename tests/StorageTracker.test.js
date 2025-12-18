const path = require('path');
const fs = require('fs').promises;
const StorageTracker = require('../src/StorageTracker');

describe('StorageTracker', () => {
  let tracker;
  const testDataPath = path.join(__dirname, 'test-storage.json');

  beforeEach(() => {
    tracker = new StorageTracker(testDataPath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testDataPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  test('should create root boxes', () => {
    const box1 = tracker.createBox('Garage');
    const box2 = tracker.createBox('Basement');
    
    expect(tracker.rootBoxes).toHaveLength(2);
    expect(box1.name).toBe('Garage');
    expect(box2.name).toBe('Basement');
  });

  test('should create nested boxes', () => {
    const garage = tracker.createBox('Garage');
    const toolBox = tracker.createBox('Tool Box', 'Red tool box', garage.id);
    
    expect(tracker.rootBoxes).toHaveLength(1);
    expect(garage.boxes).toHaveLength(1);
    expect(garage.boxes[0]).toBe(toolBox);
  });

  test('should throw error when creating nested box with invalid parent', () => {
    expect(() => {
      tracker.createBox('Tool Box', '', 'invalid-id');
    }).toThrow('Parent box with ID invalid-id not found');
  });

  test('should create items in boxes', () => {
    const garage = tracker.createBox('Garage');
    const hammer = tracker.createItem('Hammer', 'Claw hammer', garage.id);
    
    expect(garage.items).toHaveLength(1);
    expect(garage.items[0]).toBe(hammer);
  });

  test('should throw error when creating item without box', () => {
    expect(() => {
      tracker.createItem('Hammer', '', null);
    }).toThrow('Items must be added to a box');
  });

  test('should find boxes by ID', () => {
    const garage = tracker.createBox('Garage');
    const toolBox = tracker.createBox('Tool Box', '', garage.id);
    
    expect(tracker.findBox(garage.id)).toBe(garage);
    expect(tracker.findBox(toolBox.id)).toBe(toolBox);
    expect(tracker.findBox('invalid-id')).toBeNull();
  });

  test('should find items by ID', () => {
    const garage = tracker.createBox('Garage');
    const hammer = tracker.createItem('Hammer', '', garage.id);
    
    expect(tracker.findItem(hammer.id)).toBe(hammer);
    expect(tracker.findItem('invalid-id')).toBeNull();
  });

  test('should update boxes', () => {
    const box = tracker.createBox('Old Name');
    
    tracker.updateBox(box.id, {
      name: 'New Name',
      description: 'Updated description'
    });
    
    expect(box.name).toBe('New Name');
    expect(box.description).toBe('Updated description');
  });

  test('should update items', () => {
    const box = tracker.createBox('Garage');
    const item = tracker.createItem('Widget', '', box.id);
    
    tracker.updateItem(item.id, {
      name: 'Updated Widget',
      boughtAmount: 10,
      boughtPrice: 5,
      soldAmount: 5,
      soldPrice: 35
    });
    
    expect(item.name).toBe('Updated Widget');
    expect(item.boughtAmount).toBe(10);
    expect(item.boughtPrice).toBe(5);
    expect(item.soldAmount).toBe(5);
    expect(item.soldPrice).toBe(35);
  });

  test('should delete root boxes', () => {
    const box = tracker.createBox('Garage');
    
    const deleted = tracker.deleteBox(box.id);
    
    expect(deleted).toBe(true);
    expect(tracker.rootBoxes).toHaveLength(0);
  });

  test('should delete nested boxes', () => {
    const garage = tracker.createBox('Garage');
    const toolBox = tracker.createBox('Tool Box', '', garage.id);
    
    const deleted = tracker.deleteBox(toolBox.id);
    
    expect(deleted).toBe(true);
    expect(garage.boxes).toHaveLength(0);
  });

  test('should delete items', () => {
    const box = tracker.createBox('Garage');
    const item = tracker.createItem('Hammer', '', box.id);
    
    const deleted = tracker.deleteItem(item.id);
    
    expect(deleted).toBe(true);
    expect(box.items).toHaveLength(0);
  });

  test('should move boxes to new parent', () => {
    const garage = tracker.createBox('Garage');
    const basement = tracker.createBox('Basement');
    const toolBox = tracker.createBox('Tool Box', '', garage.id);
    
    tracker.moveBox(toolBox.id, basement.id);
    
    expect(garage.boxes).toHaveLength(0);
    expect(basement.boxes).toHaveLength(1);
    expect(basement.boxes[0]).toBe(toolBox);
  });

  test('should move items to new box', () => {
    const box1 = tracker.createBox('Box 1');
    const box2 = tracker.createBox('Box 2');
    const item = tracker.createItem('Item', '', box1.id);
    
    tracker.moveItem(item.id, box2.id);
    
    expect(box1.items).toHaveLength(0);
    expect(box2.items).toHaveLength(1);
    expect(box2.items[0]).toBe(item);
  });

  test('should search boxes and items', () => {
    const garage = tracker.createBox('Garage', 'Storage for tools');
    const basement = tracker.createBox('Basement');
    const hammer = tracker.createItem('Hammer', 'Claw hammer', garage.id);
    const screwdriver = tracker.createItem('Screwdriver', '', basement.id);
    
    const results1 = tracker.search('garage');
    expect(results1.boxes).toHaveLength(1);
    expect(results1.boxes[0]).toBe(garage);
    
    const results2 = tracker.search('hammer');
    expect(results2.items).toHaveLength(1);
    expect(results2.items[0]).toBe(hammer);
    
    const results3 = tracker.search('tool');
    expect(results3.boxes).toHaveLength(1);
  });

  test('should get statistics', () => {
    const garage = tracker.createBox('Garage');
    const toolBox = tracker.createBox('Tool Box', '', garage.id);
    const basement = tracker.createBox('Basement');
    
    tracker.createItem('Hammer', '', garage.id);
    tracker.createItem('Screwdriver', '', toolBox.id);
    tracker.createItem('Paint', '', basement.id);
    
    const stats = tracker.getStats();
    
    expect(stats.rootBoxes).toBe(2);
    expect(stats.totalBoxes).toBe(3);
    expect(stats.totalItems).toBe(3);
  });

  test('should save and load data', async () => {
    const garage = tracker.createBox('Garage', 'Main storage');
    const hammer = tracker.createItem('Hammer', 'Claw hammer', garage.id);
    hammer.update({ boughtAmount: 1, boughtPrice: 25 });
    
    await tracker.save();
    
    const newTracker = new StorageTracker(testDataPath);
    await newTracker.load();
    
    expect(newTracker.rootBoxes).toHaveLength(1);
    expect(newTracker.rootBoxes[0].name).toBe('Garage');
    expect(newTracker.rootBoxes[0].description).toBe('Main storage');
    expect(newTracker.rootBoxes[0].items).toHaveLength(1);
    expect(newTracker.rootBoxes[0].items[0].name).toBe('Hammer');
    expect(newTracker.rootBoxes[0].items[0].boughtAmount).toBe(1);
    expect(newTracker.rootBoxes[0].items[0].boughtPrice).toBe(25);
  });

  test('should handle loading non-existent file', async () => {
    const loaded = await tracker.load();
    expect(loaded).toBe(false);
  });

  test('should export to JSON', () => {
    const garage = tracker.createBox('Garage');
    tracker.createItem('Hammer', '', garage.id);
    
    const json = tracker.toJSON();
    
    expect(json.rootBoxes).toHaveLength(1);
    expect(json.stats.totalBoxes).toBe(1);
    expect(json.stats.totalItems).toBe(1);
  });
});
