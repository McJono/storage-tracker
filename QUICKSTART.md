# Quick Start Guide

Get started with Storage Tracker in 5 minutes!

## Installation

```bash
# Clone the repository
git clone https://github.com/McJono/storage-tracker.git
cd storage-tracker

# Install dependencies
npm install
```

## Run the Demo

See the tracker in action:

```bash
npm run demo
```

This will create a sample storage hierarchy with boxes and items, showing all the features.

## Web Interface (Recommended)

Launch the web interface with passwordless authentication:

```bash
# First, set up SMTP for email login (optional)
cp .env.example .env
# Edit .env with your email settings (see below)

# Start the web server
npm run server
```

Then open your browser to `http://localhost:3000`

### Setting Up Email Login (Optional)

For passwordless authentication via email, configure SMTP in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Storage Tracker <your-email@gmail.com>
```

**For Gmail:**
1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the app password as `SMTP_PASS`

**Note:** If SMTP is not configured, you can still use password-based login.

## Command Line Interface

Launch the interactive CLI:

```bash
npm start
```

## Your First Storage Setup

Here's a simple workflow to get started:

### 1. Create Your First Box
```
storage-tracker> create-box Garage "Main storage area"
✓ Created box: Garage (ID: 1234567890-1)
```

### 2. Create a Nested Box
```
storage-tracker> create-box Toolbox "Red toolbox" 1234567890-1
✓ Created box: Toolbox (ID: 1234567891-2)
```

### 3. Add an Item
```
storage-tracker> create-item 1234567891-2 Hammer "16oz claw hammer"
✓ Created item: Hammer (ID: 1234567892-3)
```

### 4. Track Purchase Information
```
storage-tracker> update-item 1234567892-3 boughtAmount 1
✓ Updated item: Hammer (ID: 1234567892-3)

storage-tracker> update-item 1234567892-3 boughtPrice 25
✓ Updated item: Hammer (ID: 1234567892-3)
```

### 5. View Your Storage
```
storage-tracker> list

=== Storage Hierarchy ===
📦 Garage (ID: 1234567890-1)
   Main storage area
  📦 Toolbox (ID: 1234567891-2)
     Red toolbox
    📌 Hammer (ID: 1234567892-3)
       16oz claw hammer
       Bought: 1 @ $25 each
```

### 6. Save Your Work
```
storage-tracker> save
✓ Saved to file
```

## Common Commands

- `help` - See all available commands
- `list` - View your entire storage hierarchy
- `search <term>` - Find boxes or items
- `stats` - See storage statistics
- `save` - Save your data
- `exit` - Exit the program

## Next Steps

- Check out the full [README.md](README.md) for detailed documentation
- Run `help` in the CLI to see all available commands
- Explore the API by looking at files in the `src/` directory

## Tips

1. **IDs**: When creating nested boxes or items, you'll need the parent box ID. Use `list` or `find` to get IDs.

2. **Descriptions**: Use quotes for multi-word descriptions:
   ```
   create-box Basement "Storage in the basement"
   ```

3. **Search**: Use search to quickly find items:
   ```
   search hammer
   ```

4. **Financial Tracking**: Track buying and selling:
   ```
   update-item <id> boughtAmount 10
   update-item <id> boughtPrice 5
   update-item <id> soldAmount 7
   update-item <id> soldPrice 50
   ```
   The system automatically calculates average sold price and profit/loss!

Happy organizing! 📦
