#!/usr/bin/env node

/**
 * Demo script showing the Storage Tracker functionality
 */

const StorageTracker = require('./src/StorageTracker');
const path = require('path');

async function runDemo() {
  console.log('='.repeat(60));
  console.log('Storage Tracker Demo');
  console.log('='.repeat(60));
  console.log();

  // Create a new tracker
  const tracker = new StorageTracker(path.join(__dirname, 'data', 'demo-storage.json'));

  console.log('1. Creating storage hierarchy...\n');

  // Create root boxes
  const garage = tracker.createBox('Garage', 'Main garage storage area');
  console.log(`   ✓ Created: ${garage.name}`);

  const basement = tracker.createBox('Basement', 'Basement storage area');
  console.log(`   ✓ Created: ${basement.name}`);

  // Create nested boxes
  const toolbox = tracker.createBox('Red Toolbox', 'Large red metal toolbox', garage.id);
  console.log(`   ✓ Created: ${toolbox.name} (inside ${garage.name})`);

  const plasticBin = tracker.createBox('Plastic Storage Bin', 'Clear plastic bin for seasonal items', garage.id);
  console.log(`   ✓ Created: ${plasticBin.name} (inside ${garage.name})`);

  const electronicsBox = tracker.createBox('Electronics Box', 'Old electronics and cables', basement.id);
  console.log(`   ✓ Created: ${electronicsBox.name} (inside ${basement.name})`);

  console.log();
  console.log('2. Adding items with purchase information...\n');

  // Add items to toolbox
  const hammer = tracker.createItem('Hammer', '16oz claw hammer', toolbox.id);
  tracker.updateItem(hammer.id, {
    boughtAmount: 1,
    boughtPrice: 25
  });
  console.log(`   ✓ Added: ${hammer.name} - Bought 1 @ $25`);

  const screwdrivers = tracker.createItem('Screwdriver Set', '6-piece precision screwdriver set', toolbox.id);
  tracker.updateItem(screwdrivers.id, {
    boughtAmount: 2,
    boughtPrice: 15,
    soldAmount: 1,
    soldPrice: 20
  });
  console.log(`   ✓ Added: ${screwdrivers.name} - Bought 2 @ $15, Sold 1 for $20 (Avg: $${screwdrivers.getAverageSoldPrice()})`);

  // Add items to plastic bin
  const decorations = tracker.createItem('Holiday Decorations', 'Christmas lights and ornaments', plasticBin.id);
  tracker.updateItem(decorations.id, {
    boughtAmount: 1,
    boughtPrice: 50
  });
  console.log(`   ✓ Added: ${decorations.name} - Bought 1 @ $50`);

  // Add items to garage (not in a box)
  const bicycle = tracker.createItem('Bicycle', 'Mountain bike, blue color', garage.id);
  tracker.updateItem(bicycle.id, {
    boughtAmount: 1,
    boughtPrice: 300,
    soldAmount: 1,
    soldPrice: 350
  });
  console.log(`   ✓ Added: ${bicycle.name} - Bought 1 @ $300, Sold 1 for $350 (Profit: $${bicycle.getProfitLoss()})`);

  // Add items to electronics box
  const laptop = tracker.createItem('Old Laptop', 'Dell laptop from 2015', electronicsBox.id);
  tracker.updateItem(laptop.id, {
    boughtAmount: 1,
    boughtPrice: 800,
    soldAmount: 1,
    soldPrice: 200
  });
  console.log(`   ✓ Added: ${laptop.name} - Bought 1 @ $800, Sold 1 for $200 (Loss: $${Math.abs(laptop.getProfitLoss())})`);

  const cables = tracker.createItem('USB Cables', 'Various USB cables', electronicsBox.id);
  tracker.updateItem(cables.id, {
    boughtAmount: 10,
    boughtPrice: 2,
    soldAmount: 5,
    soldPrice: 15
  });
  console.log(`   ✓ Added: ${cables.name} - Bought 10 @ $2, Sold 5 for $15 (Avg: $${cables.getAverageSoldPrice()})`);

  console.log();
  console.log('3. Storage Hierarchy:\n');

  // Print hierarchy
  function printBox(box, indent = 0) {
    const prefix = '   ' + '  '.repeat(indent);
    console.log(`${prefix}📦 ${box.name}`);
    if (box.description) {
      console.log(`${prefix}   ${box.description}`);
    }
    
    // Print items
    for (const item of box.items) {
      console.log(`${prefix}  📌 ${item.name}`);
      if (item.description) {
        console.log(`${prefix}     ${item.description}`);
      }
      if (item.boughtAmount > 0) {
        console.log(`${prefix}     Bought: ${item.boughtAmount} @ $${item.boughtPrice} each`);
      }
      if (item.soldAmount > 0) {
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

  for (const box of tracker.rootBoxes) {
    printBox(box);
  }

  console.log();
  console.log('4. Statistics:\n');

  const stats = tracker.getStats();
  console.log(`   Total Root Boxes: ${stats.rootBoxes}`);
  console.log(`   Total Boxes: ${stats.totalBoxes}`);
  console.log(`   Total Items: ${stats.totalItems}`);

  console.log();
  console.log('5. Searching for items...\n');

  const searchResults = tracker.search('hammer');
  console.log(`   Search results for "hammer":`);
  searchResults.items.forEach(item => {
    console.log(`     📌 ${item.name} (ID: ${item.id})`);
  });

  console.log();
  console.log('6. Saving data...\n');

  await tracker.save();
  console.log(`   ✓ Data saved to: ${tracker.dataPath}`);

  console.log();
  console.log('='.repeat(60));
  console.log('Demo Complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('To interact with the storage tracker, run:');
  console.log('  npm start');
  console.log();
}

runDemo().catch(console.error);
