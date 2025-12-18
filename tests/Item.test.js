const Item = require('../src/Item');

describe('Item', () => {
  test('should create an item with basic properties', () => {
    const item = new Item('item-1', 'Laptop', 'Dell XPS 13');
    
    expect(item.id).toBe('item-1');
    expect(item.name).toBe('Laptop');
    expect(item.description).toBe('Dell XPS 13');
    expect(item.amount).toBe(0);
    expect(item.boughtAmount).toBe(0);
    expect(item.boughtPrice).toBe(0);
    expect(item.soldAmount).toBe(0);
    expect(item.soldPrice).toBe(0);
  });

  test('should update item properties', () => {
    const item = new Item('item-1', 'Laptop');
    
    item.update({
      name: 'Gaming Laptop',
      description: 'High-end gaming laptop',
      amount: 3,
      boughtAmount: 2,
      boughtPrice: 1000,
      soldAmount: 1,
      soldPrice: 1200
    });
    
    expect(item.name).toBe('Gaming Laptop');
    expect(item.description).toBe('High-end gaming laptop');
    expect(item.amount).toBe(3);
    expect(item.boughtAmount).toBe(2);
    expect(item.boughtPrice).toBe(1000);
    expect(item.soldAmount).toBe(1);
    expect(item.soldPrice).toBe(1200);
  });

  test('should calculate average sold price correctly', () => {
    const item = new Item('item-1', 'Widget');
    
    item.update({
      soldAmount: 5,
      soldPrice: 250 // Total sold for $250
    });
    
    expect(item.getAverageSoldPrice()).toBe(50); // $250 / 5 = $50 per unit
  });

  test('should return 0 for average sold price when nothing sold', () => {
    const item = new Item('item-1', 'Widget');
    
    expect(item.getAverageSoldPrice()).toBe(0);
  });

  test('should calculate profit/loss correctly', () => {
    const item = new Item('item-1', 'Widget');
    
    item.update({
      boughtAmount: 10,
      boughtPrice: 40, // $40 per unit, total $400
      soldAmount: 10,
      soldPrice: 500 // Sold for $500 total
    });
    
    expect(item.getProfitLoss()).toBe(100); // $500 - $400 = $100 profit
  });

  test('should serialize to JSON correctly', () => {
    const item = new Item('item-1', 'Widget', 'Blue widget');
    item.update({
      amount: 8,
      boughtAmount: 5,
      boughtPrice: 10,
      soldAmount: 3,
      soldPrice: 45
    });
    
    const json = item.toJSON();
    
    expect(json.id).toBe('item-1');
    expect(json.name).toBe('Widget');
    expect(json.description).toBe('Blue widget');
    expect(json.amount).toBe(8);
    expect(json.boughtAmount).toBe(5);
    expect(json.boughtPrice).toBe(10);
    expect(json.soldAmount).toBe(3);
    expect(json.soldPrice).toBe(45);
    expect(json.averageSoldPrice).toBe(15);
    expect(json.profitLoss).toBe(-5); // $45 - (5 * $10) = -$5
  });

  test('should restore from JSON correctly', () => {
    const data = {
      id: 'item-1',
      name: 'Widget',
      description: 'Blue widget',
      amount: 8,
      boughtAmount: 5,
      boughtPrice: 10,
      soldAmount: 3,
      soldPrice: 45,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z'
    };
    
    const item = Item.fromJSON(data);
    
    expect(item.id).toBe('item-1');
    expect(item.name).toBe('Widget');
    expect(item.description).toBe('Blue widget');
    expect(item.amount).toBe(8);
    expect(item.boughtAmount).toBe(5);
    expect(item.boughtPrice).toBe(10);
    expect(item.soldAmount).toBe(3);
    expect(item.soldPrice).toBe(45);
  });
});
