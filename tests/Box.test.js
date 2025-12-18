const Box = require('../src/Box');
const Item = require('../src/Item');

describe('Box', () => {
  test('should create a box with basic properties', () => {
    const box = new Box('box-1', 'Garage', 'Main garage storage');
    
    expect(box.id).toBe('box-1');
    expect(box.name).toBe('Garage');
    expect(box.description).toBe('Main garage storage');
    expect(box.boxes).toEqual([]);
    expect(box.items).toEqual([]);
  });

  test('should add and remove nested boxes', () => {
    const parentBox = new Box('box-1', 'Garage');
    const childBox = new Box('box-2', 'Tool Box');
    
    parentBox.addBox(childBox);
    expect(parentBox.boxes).toHaveLength(1);
    expect(parentBox.boxes[0]).toBe(childBox);
    
    const removed = parentBox.removeBox('box-2');
    expect(removed).toBe(true);
    expect(parentBox.boxes).toHaveLength(0);
  });

  test('should add and remove items', () => {
    const box = new Box('box-1', 'Garage');
    const item = new Item('item-1', 'Hammer');
    
    box.addItem(item);
    expect(box.items).toHaveLength(1);
    expect(box.items[0]).toBe(item);
    
    const removed = box.removeItem('item-1');
    expect(removed).toBe(true);
    expect(box.items).toHaveLength(0);
  });

  test('should find nested boxes recursively', () => {
    const root = new Box('box-1', 'Root');
    const child1 = new Box('box-2', 'Child 1');
    const child2 = new Box('box-3', 'Child 2');
    const grandchild = new Box('box-4', 'Grandchild');
    
    root.addBox(child1);
    root.addBox(child2);
    child1.addBox(grandchild);
    
    expect(root.findBox('box-1')).toBe(root);
    expect(root.findBox('box-2')).toBe(child1);
    expect(root.findBox('box-4')).toBe(grandchild);
    expect(root.findBox('box-999')).toBeNull();
  });

  test('should find items recursively', () => {
    const root = new Box('box-1', 'Root');
    const child = new Box('box-2', 'Child');
    const item1 = new Item('item-1', 'Item 1');
    const item2 = new Item('item-2', 'Item 2');
    
    root.addBox(child);
    root.addItem(item1);
    child.addItem(item2);
    
    expect(root.findItem('item-1')).toBe(item1);
    expect(root.findItem('item-2')).toBe(item2);
    expect(root.findItem('item-999')).toBeNull();
  });

  test('should count total items recursively', () => {
    const root = new Box('box-1', 'Root');
    const child1 = new Box('box-2', 'Child 1');
    const child2 = new Box('box-3', 'Child 2');
    
    root.addBox(child1);
    root.addBox(child2);
    
    root.addItem(new Item('item-1', 'Item 1'));
    root.addItem(new Item('item-2', 'Item 2'));
    child1.addItem(new Item('item-3', 'Item 3'));
    child2.addItem(new Item('item-4', 'Item 4'));
    child2.addItem(new Item('item-5', 'Item 5'));
    
    expect(root.getTotalItemCount()).toBe(5);
  });

  test('should serialize to JSON correctly', () => {
    const root = new Box('box-1', 'Root', 'Root box');
    const child = new Box('box-2', 'Child');
    const item = new Item('item-1', 'Item');
    
    root.addBox(child);
    root.addItem(item);
    
    const json = root.toJSON();
    
    expect(json.id).toBe('box-1');
    expect(json.name).toBe('Root');
    expect(json.description).toBe('Root box');
    expect(json.boxes).toHaveLength(1);
    expect(json.items).toHaveLength(1);
    expect(json.totalItems).toBe(1);
  });

  test('should restore from JSON correctly', () => {
    const data = {
      id: 'box-1',
      name: 'Root',
      description: 'Root box',
      boxes: [
        {
          id: 'box-2',
          name: 'Child',
          description: '',
          boxes: [],
          items: []
        }
      ],
      items: [
        {
          id: 'item-1',
          name: 'Item',
          description: '',
          boughtAmount: 0,
          boughtPrice: 0,
          soldAmount: 0,
          soldPrice: 0
        }
      ]
    };
    
    const box = Box.fromJSON(data, Item);
    
    expect(box.id).toBe('box-1');
    expect(box.name).toBe('Root');
    expect(box.boxes).toHaveLength(1);
    expect(box.items).toHaveLength(1);
    expect(box.boxes[0].id).toBe('box-2');
    expect(box.items[0].id).toBe('item-1');
  });
});
