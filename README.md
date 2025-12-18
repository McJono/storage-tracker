# Storage Tracker

A hierarchical storage location tracker built with Node.js that allows you to organize and track items within nested boxes. Similar to the "UNDER MY ROOF" iPad app, this tool helps you keep track of what you have, where it's stored, and maintain financial records for items.

## Features

- 📦 **Nested Storage Hierarchy**: Create boxes within boxes for unlimited organizational depth
- 📌 **Item Tracking**: Add items to any box with detailed descriptions
- 💰 **Financial Tracking**: Track bought amount, bought price, sold amount, and sold price
- 📊 **Automatic Calculations**: Automatically calculates average sold price per unit and profit/loss
- 🔍 **Search Functionality**: Quickly find boxes and items by name or description
- 💾 **Data Persistence**: Save and load your storage data to/from JSON files
- 🖥️ **Interactive CLI**: Easy-to-use command-line interface

## Installation

```bash
npm install
```

## Usage

Start the interactive CLI:

```bash
npm start
```

Or if installed globally:

```bash
storage-tracker
```

## Commands

### Box Management

- `create-box <name> [description] [parentBoxId]` - Create a new box
  ```
  create-box Garage "Main storage area"
  create-box Toolbox "Red toolbox" <garage-id>
  ```

- `update-box <id> <name> [description]` - Update a box
  ```
  update-box <box-id> "Updated Name" "New description"
  ```

- `delete-box <id>` - Delete a box
  ```
  delete-box <box-id>
  ```

- `move-box <id> <newParentId>` - Move box to new parent
  ```
  move-box <box-id> <parent-box-id>
  ```

### Item Management

- `create-item <boxId> <name> [description]` - Create a new item
  ```
  create-item <box-id> Hammer "Claw hammer"
  ```

- `update-item <id> <field> <value>` - Update an item field
  ```
  update-item <item-id> boughtAmount 5
  update-item <item-id> boughtPrice 10.50
  update-item <item-id> soldAmount 3
  update-item <item-id> soldPrice 45.00
  update-item <item-id> description "Updated description"
  ```
  
  Available fields: `name`, `description`, `boughtAmount`, `boughtPrice`, `soldAmount`, `soldPrice`

- `delete-item <id>` - Delete an item
  ```
  delete-item <item-id>
  ```

- `move-item <id> <newBoxId>` - Move item to new box
  ```
  move-item <item-id> <new-box-id>
  ```

### View & Search

- `list` - List all boxes and items in hierarchical view
- `find <id>` - Find a specific box or item by ID
- `search <query>` - Search boxes and items by name or description
  ```
  search tools
  search hammer
  ```
- `stats` - Show statistics (total boxes, items, etc.)

### Data Management

- `save` - Save current data to file
- `load` - Load data from file
- `export` - Export all data as JSON

### Other

- `help` - Show help menu
- `clear` - Clear screen
- `exit` - Exit the program

## Example Workflow

```bash
# Start the CLI
npm start

# Create a root box for your garage
storage-tracker> create-box Garage "Main garage storage"
✓ Created box: Garage (ID: 1234567890-1)

# Create a toolbox inside the garage
storage-tracker> create-box Toolbox "Red metal toolbox" 1234567890-1
✓ Created box: Toolbox (ID: 1234567891-2)

# Add a hammer to the toolbox
storage-tracker> create-item 1234567891-2 Hammer "16oz claw hammer"
✓ Created item: Hammer (ID: 1234567892-3)

# Update the hammer's purchase info
storage-tracker> update-item 1234567892-3 boughtAmount 1
✓ Updated item: Hammer (ID: 1234567892-3)

storage-tracker> update-item 1234567892-3 boughtPrice 25.00
✓ Updated item: Hammer (ID: 1234567892-3)

# If you sold it later
storage-tracker> update-item 1234567892-3 soldAmount 1
storage-tracker> update-item 1234567892-3 soldPrice 30.00

# View your storage hierarchy
storage-tracker> list

=== Storage Hierarchy ===
📦 Garage (ID: 1234567890-1)
   Main garage storage
  📦 Toolbox (ID: 1234567891-2)
     Red metal toolbox
    📌 Hammer (ID: 1234567892-3)
       16oz claw hammer
       Bought: 1 @ $25 each
       Sold: 1 for $30 total (avg: $30.00)
       Profit/Loss: +$5.00

# Search for items
storage-tracker> search hammer

Search results for "hammer":

Items:
  📌 Hammer (ID: 1234567892-3)

# Save your data
storage-tracker> save
✓ Saved to file

# Exit
storage-tracker> exit
Goodbye!
```

## Data Model

### Box
- `id` - Unique identifier
- `name` - Box name
- `description` - Optional description
- `boxes` - Array of nested boxes
- `items` - Array of items in this box
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Item
- `id` - Unique identifier
- `name` - Item name
- `description` - Optional description
- `boughtAmount` - Quantity purchased
- `boughtPrice` - Price per unit when purchased
- `soldAmount` - Quantity sold
- `soldPrice` - Total amount received from sales
- `averageSoldPrice` - Calculated: soldPrice / soldAmount
- `profitLoss` - Calculated: soldPrice - (boughtAmount * boughtPrice)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Development

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Data Storage

By default, data is stored in `data/storage.json`. This file is automatically created when you save your data and loaded when you start the application.

## Architecture

The project follows a clean, modular architecture:

- `src/Item.js` - Item class with financial tracking
- `src/Box.js` - Box class with nesting capabilities
- `src/StorageTracker.js` - Main tracker with CRUD operations
- `index.js` - Interactive CLI interface
- `tests/` - Comprehensive test suite

## API Usage

You can also use the classes programmatically:

```javascript
const StorageTracker = require('./src/StorageTracker');

const tracker = new StorageTracker();

// Create boxes
const garage = tracker.createBox('Garage', 'Main storage');
const toolbox = tracker.createBox('Toolbox', 'Red toolbox', garage.id);

// Create items
const hammer = tracker.createItem('Hammer', 'Claw hammer', toolbox.id);

// Update item with financial data
tracker.updateItem(hammer.id, {
  boughtAmount: 5,
  boughtPrice: 10,
  soldAmount: 3,
  soldPrice: 45
});

// Get average sold price
console.log(hammer.getAverageSoldPrice()); // 15

// Get profit/loss
console.log(hammer.getProfitLoss()); // -5 (spent $50, received $45)

// Save data
await tracker.save();

// Load data
await tracker.load();
```

## License

ISC
