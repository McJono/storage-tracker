#!/usr/bin/env node

const readline = require('readline');
const StorageTracker = require('./src/StorageTracker');

const tracker = new StorageTracker();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'storage-tracker> '
});

/**
 * Print box hierarchy
 */
function printBox(box, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}📦 ${box.name} (ID: ${box.id})`);
  if (box.description) {
    console.log(`${prefix}   ${box.description}`);
  }
  
  // Print items
  for (const item of box.items) {
    console.log(`${prefix}  📌 ${item.name} (ID: ${item.id})`);
    if (item.description) {
      console.log(`${prefix}     ${item.description}`);
    }
    if (item.boughtAmount > 0 || item.boughtPrice > 0) {
      console.log(`${prefix}     Bought: ${item.boughtAmount} @ $${item.boughtPrice} each`);
    }
    if (item.soldAmount > 0 || item.soldPrice > 0) {
      console.log(`${prefix}     Sold: ${item.soldAmount} for $${item.soldPrice} total (avg: $${item.getAverageSoldPrice().toFixed(2)})`);
    }
    const profitLoss = item.getProfitLoss();
    if (profitLoss !== 0) {
      const sign = profitLoss > 0 ? '+' : '';
      console.log(`${prefix}     Profit/Loss: ${sign}$${profitLoss.toFixed(2)}`);
    }
  }
  
  // Print nested boxes
  for (const nestedBox of box.boxes) {
    printBox(nestedBox, indent + 1);
  }
}

/**
 * Print all boxes
 */
function printAllBoxes() {
  if (tracker.rootBoxes.length === 0) {
    console.log('No boxes yet. Create one with: create-box <name> [description]');
    return;
  }
  
  console.log('\n=== Storage Hierarchy ===');
  for (const box of tracker.rootBoxes) {
    printBox(box);
  }
  console.log('');
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Storage Tracker Commands:
  
Box Management:
  create-box <name> [description] [parentBoxId]  - Create a new box
  update-box <id> <name> [description]           - Update a box
  delete-box <id>                                 - Delete a box
  move-box <id> <newParentId>                    - Move box to new parent
  
Item Management:
  create-item <boxId> <name> [description]       - Create a new item
  update-item <id> <field> <value>               - Update an item field
  delete-item <id>                                - Delete an item
  move-item <id> <newBoxId>                      - Move item to new box
  
View & Search:
  list                                            - List all boxes and items
  find <id>                                       - Find a box or item by ID
  search <query>                                  - Search boxes and items
  stats                                           - Show statistics
  
Data Management:
  save                                            - Save to file
  load                                            - Load from file
  export                                          - Export as JSON
  
Other:
  help                                            - Show this help
  clear                                           - Clear screen
  exit                                            - Exit the program

Field names for update-item:
  name, description, boughtAmount, boughtPrice, soldAmount, soldPrice
  `);
}

/**
 * Parse command arguments (handles quoted strings)
 */
function parseArgs(line) {
  const args = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

/**
 * Process command
 */
async function processCommand(line) {
  const parts = parseArgs(line.trim());
  const cmd = parts[0] ? parts[0].toLowerCase() : '';
  
  try {
    switch (cmd) {
      case 'help':
        showHelp();
        break;
        
      case 'clear':
        console.clear();
        break;
        
      case 'create-box': {
        const name = parts[1];
        const description = parts[2] || '';
        const parentBoxId = parts[3] || null;
        
        if (!name) {
          console.log('Usage: create-box <name> [description] [parentBoxId]');
          break;
        }
        
        const box = tracker.createBox(name, description, parentBoxId);
        console.log(`✓ Created box: ${box.name} (ID: ${box.id})`);
        break;
      }
      
      case 'update-box': {
        const id = parts[1];
        const name = parts[2];
        const description = parts.slice(3).join(' ');
        
        if (!id || !name) {
          console.log('Usage: update-box <id> <name> [description]');
          break;
        }
        
        const updates = { name };
        if (description) updates.description = description;
        
        const box = tracker.updateBox(id, updates);
        console.log(`✓ Updated box: ${box.name} (ID: ${box.id})`);
        break;
      }
      
      case 'delete-box': {
        const id = parts[1];
        
        if (!id) {
          console.log('Usage: delete-box <id>');
          break;
        }
        
        const success = tracker.deleteBox(id);
        if (success) {
          console.log(`✓ Deleted box: ${id}`);
        } else {
          console.log(`✗ Box not found: ${id}`);
        }
        break;
      }
      
      case 'move-box': {
        const id = parts[1];
        const newParentId = parts[2] || null;
        
        if (!id) {
          console.log('Usage: move-box <id> <newParentId>');
          break;
        }
        
        const box = tracker.moveBox(id, newParentId);
        console.log(`✓ Moved box: ${box.name} (ID: ${box.id})`);
        break;
      }
      
      case 'create-item': {
        const boxId = parts[1];
        const name = parts[2];
        const description = parts.slice(3).join(' ');
        
        if (!boxId || !name) {
          console.log('Usage: create-item <boxId> <name> [description]');
          break;
        }
        
        const item = tracker.createItem(name, description, boxId);
        console.log(`✓ Created item: ${item.name} (ID: ${item.id})`);
        break;
      }
      
      case 'update-item': {
        const id = parts[1];
        const field = parts[2];
        const value = parts.slice(3).join(' ');
        
        if (!id || !field || !value) {
          console.log('Usage: update-item <id> <field> <value>');
          console.log('Fields: name, description, boughtAmount, boughtPrice, soldAmount, soldPrice');
          break;
        }
        
        const updates = {};
        if (['boughtAmount', 'boughtPrice', 'soldAmount', 'soldPrice'].includes(field)) {
          updates[field] = parseFloat(value);
        } else {
          updates[field] = value;
        }
        
        const item = tracker.updateItem(id, updates);
        console.log(`✓ Updated item: ${item.name} (ID: ${item.id})`);
        break;
      }
      
      case 'delete-item': {
        const id = parts[1];
        
        if (!id) {
          console.log('Usage: delete-item <id>');
          break;
        }
        
        const success = tracker.deleteItem(id);
        if (success) {
          console.log(`✓ Deleted item: ${id}`);
        } else {
          console.log(`✗ Item not found: ${id}`);
        }
        break;
      }
      
      case 'move-item': {
        const id = parts[1];
        const newBoxId = parts[2];
        
        if (!id || !newBoxId) {
          console.log('Usage: move-item <id> <newBoxId>');
          break;
        }
        
        const item = tracker.moveItem(id, newBoxId);
        console.log(`✓ Moved item: ${item.name} (ID: ${item.id})`);
        break;
      }
      
      case 'list':
        printAllBoxes();
        break;
        
      case 'find': {
        const id = parts[1];
        
        if (!id) {
          console.log('Usage: find <id>');
          break;
        }
        
        const box = tracker.findBox(id);
        if (box) {
          console.log('\nFound box:');
          printBox(box);
          break;
        }
        
        const item = tracker.findItem(id);
        if (item) {
          console.log('\nFound item:');
          console.log(`📌 ${item.name} (ID: ${item.id})`);
          if (item.description) {
            console.log(`   ${item.description}`);
          }
          console.log(`   Bought: ${item.boughtAmount} @ $${item.boughtPrice} each`);
          console.log(`   Sold: ${item.soldAmount} for $${item.soldPrice} total`);
          console.log(`   Avg Sold Price: $${item.getAverageSoldPrice().toFixed(2)}`);
          console.log(`   Profit/Loss: $${item.getProfitLoss().toFixed(2)}`);
          break;
        }
        
        console.log(`✗ Not found: ${id}`);
        break;
      }
      
      case 'search': {
        const query = parts.slice(1).join(' ');
        
        if (!query) {
          console.log('Usage: search <query>');
          break;
        }
        
        const results = tracker.search(query);
        console.log(`\nSearch results for "${query}":`);
        
        if (results.boxes.length > 0) {
          console.log('\nBoxes:');
          results.boxes.forEach(box => {
            console.log(`  📦 ${box.name} (ID: ${box.id})`);
          });
        }
        
        if (results.items.length > 0) {
          console.log('\nItems:');
          results.items.forEach(item => {
            console.log(`  📌 ${item.name} (ID: ${item.id})`);
          });
        }
        
        if (results.boxes.length === 0 && results.items.length === 0) {
          console.log('  No results found');
        }
        console.log('');
        break;
      }
      
      case 'stats': {
        const stats = tracker.getStats();
        console.log('\n=== Statistics ===');
        console.log(`Root Boxes: ${stats.rootBoxes}`);
        console.log(`Total Boxes: ${stats.totalBoxes}`);
        console.log(`Total Items: ${stats.totalItems}`);
        console.log('');
        break;
      }
      
      case 'save':
        await tracker.save();
        console.log('✓ Saved to file');
        break;
        
      case 'load':
        await tracker.load();
        console.log('✓ Loaded from file');
        break;
        
      case 'export':
        console.log(JSON.stringify(tracker.toJSON(), null, 2));
        break;
        
      case 'exit':
      case 'quit':
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        break;
        
      default:
        if (cmd) {
          console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
        }
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
  
  rl.prompt();
}

// Initialize
async function init() {
  console.log('Storage Tracker - Hierarchical Storage Organization');
  console.log('Type "help" for available commands\n');
  
  // Try to load existing data
  try {
    const loaded = await tracker.load();
    if (loaded) {
      console.log('✓ Loaded existing data\n');
    }
  } catch (error) {
    console.log('Starting with fresh data\n');
  }
  
  rl.prompt();
}

rl.on('line', processCommand);
rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

init();
