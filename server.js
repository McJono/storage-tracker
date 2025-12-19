// Load environment variables from .env file
// Note: dotenv is required - if you get an error here, run 'npm install'
try {
  require('dotenv').config();
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('Error: dotenv module not found. Please run "npm install" to install dependencies.');
    console.error('This is required after pulling new code changes.');
    process.exit(1);
  }
  throw error;
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const UserManager = require('./src/UserManager');
const MultiUserStorageTracker = require('./src/MultiUserStorageTracker');
const LoginTokenManager = require('./src/LoginTokenManager');
const EmailService = require('./src/EmailService');
const FamilyShareManager = require('./src/FamilyShareManager');
const { generateToken, authenticate } = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize managers
const userManager = new UserManager();
const familyShareManager = new FamilyShareManager();
const storageManager = new MultiUserStorageTracker(null, familyShareManager);
const tokenManager = new LoginTokenManager();
const emailService = new EmailService();

// Configure email service
emailService.configure();

// Load data on startup
(async () => {
  try {
    await userManager.load();
    await storageManager.load();
    await tokenManager.load();
    await familyShareManager.load();
    console.log('Data loaded successfully');
    
    if (emailService.isConfigured()) {
      console.log('Email service configured - passwordless authentication enabled');
    } else {
      console.warn('Email service not configured - passwordless authentication disabled');
      console.warn('Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables to enable');
    }
  } catch (error) {
    console.error('Error loading data:', error.message);
    console.error('The server will continue to run, but some features may not work correctly.');
  }
})();

// Helper function to save data
async function saveData() {
  await userManager.save();
  await storageManager.save();
  await tokenManager.save();
  await familyShareManager.save();
}

// ============= Authentication Routes =============

/**
 * Request a magic link (passwordless login)
 */
app.post('/api/auth/request-magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Email service not configured. Please contact the administrator to set up SMTP.' 
      });
    }

    // Find or create user
    let user = userManager.findUserByEmail(email);
    if (!user) {
      // Create new user with email
      user = await userManager.createUserWithEmail(email);
      await saveData();
    }

    // Create login token (14 day expiry)
    const expiryDays = 14;
    const loginToken = tokenManager.createToken(user.id, email, expiryDays);
    await saveData();

    // Send magic link email with expiry info
    await emailService.sendMagicLink(email, loginToken.token, process.env.APP_URL, expiryDays);

    res.json({
      message: 'Magic link sent! Check your email to log in.',
      email
    });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify magic link token
 */
app.post('/api/auth/verify-magic-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      console.warn('Token verification failed: No token provided');
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate token format (should be 64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      console.warn('Token verification failed: Invalid token format', { token: token.substring(0, 10) + '...' });
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Verify token
    const result = tokenManager.verifyToken(token);
    
    if (!result.valid) {
      console.warn('Token verification failed:', result.error, { token: token.substring(0, 10) + '...' });
      return res.status(401).json({ error: result.error });
    }

    // Get user
    const user = userManager.findUserById(result.userId);
    if (!user) {
      console.error('Token verification failed: User not found', { userId: result.userId });
      return res.status(404).json({ error: 'User not found' });
    }

    // Save token state
    await saveData();

    // Generate JWT token
    const jwtToken = generateToken(user);

    console.log('Magic link verification successful', { email: user.email });
    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token: jwtToken
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register a new user (legacy endpoint - now password is optional)
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Password is now optional
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await userManager.createUser(username || email.split('@')[0], email, password);
    await saveData();

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login user (legacy password-based login - kept for backward compatibility)
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await userManager.authenticate(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user info
 */
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = userManager.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user.toJSON());
});

/**
 * Serve a simple page to handle magic link verification
 * This is a GET endpoint that redirects to the app with the token
 */
app.get('/auth/verify', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invalid Link</h1>
          <p>This magic link is invalid or missing.</p>
          <a href="/" style="color: #007bff;">Go to Login</a>
        </body>
      </html>
    `);
  }

  // Validate and sanitize token (should be hex string)
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invalid Link</h1>
          <p>This magic link is invalid or malformed.</p>
          <a href="/" style="color: #007bff;">Go to Login</a>
        </body>
      </html>
    `);
  }

  // Token is validated as hex, safe to use directly
  const encodedToken = encodeURIComponent(token);
  
  // Redirect to the main app with the token as a hash parameter
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Verifying...</title>
        <meta http-equiv="refresh" content="5;url=/#token=${encodedToken}">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: #f5f5f5;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .fallback-link {
            margin-top: 30px;
            color: #007bff;
            text-decoration: none;
          }
          .fallback-link:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1>Verifying your login...</h1>
        <div class="spinner"></div>
        <p>Please wait while we log you in.</p>
        <p><small>If you are not redirected automatically, <a href="/#token=${encodedToken}" class="fallback-link">click here</a>.</small></p>
        <script>
          // Redirect to main page with token in hash
          window.location.href = '/#token=${encodedToken}';
        </script>
      </body>
    </html>
  `);
});


// ============= Box Routes =============

/**
 * Get all boxes for current user
 */
app.get('/api/boxes', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    res.json(tracker.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new box
 */
app.post('/api/boxes', authenticate, async (req, res) => {
  try {
    const { name, description, parentBoxId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Box name is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const box = tracker.createBox(name, description || '', parentBoxId || null);
    await saveData();

    res.status(201).json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get a specific box
 */
app.get('/api/boxes/:id', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const box = tracker.findBox(req.params.id);
    
    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }

    res.json(box.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a box
 */
app.put('/api/boxes/:id', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const box = tracker.updateBox(req.params.id, updates);
    await saveData();

    res.json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete a box
 */
app.delete('/api/boxes/:id', authenticate, async (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const success = tracker.deleteBox(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Box not found' });
    }

    await saveData();
    res.json({ message: 'Box deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move a box
 */
app.post('/api/boxes/:id/move', authenticate, async (req, res) => {
  try {
    const { newParentBoxId } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const box = tracker.moveBox(req.params.id, newParentBoxId || null);
    await saveData();

    res.json(box.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= Item Routes =============

/**
 * Create a new item
 */
app.post('/api/items', authenticate, async (req, res) => {
  try {
    const { name, description, boxId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (!boxId) {
      return res.status(400).json({ error: 'Box ID is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.createItem(name, description || '', boxId);
    await saveData();

    res.status(201).json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get a specific item
 */
app.get('/api/items/:id', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.findItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update an item
 */
app.put('/api/items/:id', authenticate, async (req, res) => {
  try {
    const { name, description, amount, boughtAmount, boughtPrice, soldAmount, soldPrice } = req.body;
    const tracker = storageManager.getUserStorage(req.user.id);
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (boughtAmount !== undefined) updates.boughtAmount = parseFloat(boughtAmount);
    if (boughtPrice !== undefined) updates.boughtPrice = parseFloat(boughtPrice);
    if (soldAmount !== undefined) updates.soldAmount = parseFloat(soldAmount);
    if (soldPrice !== undefined) updates.soldPrice = parseFloat(soldPrice);

    const item = tracker.updateItem(req.params.id, updates);
    await saveData();

    res.json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete an item
 */
app.delete('/api/items/:id', authenticate, async (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const success = tracker.deleteItem(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await saveData();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move an item
 */
app.post('/api/items/:id/move', authenticate, async (req, res) => {
  try {
    const { newBoxId } = req.body;

    if (!newBoxId) {
      return res.status(400).json({ error: 'New box ID is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const item = tracker.moveItem(req.params.id, newBoxId);
    await saveData();

    res.json(item.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= Search & Stats Routes =============

/**
 * Search boxes and items
 */
app.get('/api/search', authenticate, (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const tracker = storageManager.getUserStorage(req.user.id);
    const results = tracker.search(q);

    res.json({
      query: q,
      boxes: results.boxes.map(result => ({
        ...result.box.toJSON(),
        path: result.path
      })),
      items: results.items.map(result => ({
        ...result.item.toJSON(),
        path: result.path
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get statistics
 */
app.get('/api/stats', authenticate, (req, res) => {
  try {
    const tracker = storageManager.getUserStorage(req.user.id);
    const stats = tracker.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Family Sharing Routes =============

/**
 * Create a new family share invitation
 */
app.post('/api/shares', authenticate, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Don't allow sharing with yourself
    const currentUser = userManager.findUserById(req.user.id);
    if (currentUser.email === email) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }

    // Check if user already has accepted shares (can't share if you're already sharing)
    const existingShares = familyShareManager.getUserShares(req.user.id);
    if (existingShares.incoming.length > 0) {
      return res.status(400).json({ 
        error: 'You are already sharing someone else\'s account. You cannot share your account while using a shared account.' 
      });
    }

    // Create the share
    const share = familyShareManager.createShare(req.user.id, email);
    await saveData();

    // Try to send email notification if possible
    if (emailService.isConfigured()) {
      try {
        const inviterUser = userManager.findUserById(req.user.id);
        await emailService.sendShareInvitation(email, inviterUser.email, inviterUser.username, process.env.APP_URL);
      } catch (emailError) {
        console.error('Failed to send share invitation email:', emailError);
        // Continue anyway - the share is created
      }
    }

    res.status(201).json(share.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all shares for current user
 */
app.get('/api/shares', authenticate, (req, res) => {
  try {
    const currentUser = userManager.findUserById(req.user.id);
    const shares = familyShareManager.getUserShares(req.user.id);
    const pendingInvites = familyShareManager.getPendingSharesForEmail(currentUser.email);

    // Enrich shares with user information
    const enrichShare = (share) => {
      const shareData = share.toJSON();
      const owner = userManager.findUserById(share.ownerUserId);
      const sharedWith = share.sharedWithUserId ? userManager.findUserById(share.sharedWithUserId) : null;
      
      return {
        ...shareData,
        ownerEmail: owner ? owner.email : null,
        ownerUsername: owner ? owner.username : null,
        sharedWithUsername: sharedWith ? sharedWith.username : null
      };
    };

    res.json({
      outgoing: shares.outgoing.map(enrichShare),
      incoming: shares.incoming.map(enrichShare),
      pending: pendingInvites.map(enrichShare)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Accept a share invitation
 */
app.post('/api/shares/:id/accept', authenticate, async (req, res) => {
  try {
    const share = familyShareManager.findShareById(req.params.id);
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const currentUser = userManager.findUserById(req.user.id);
    
    // Verify the share is for this user's email
    if (share.sharedWithEmail !== currentUser.email) {
      return res.status(403).json({ error: 'This share is not for you' });
    }

    // Check if user already has any accepted shares
    const existingShares = familyShareManager.getUserShares(req.user.id);
    if (existingShares.incoming.length > 0) {
      return res.status(400).json({ 
        error: 'You are already sharing an account. Please remove the existing share first.' 
      });
    }

    // Check if user has any outgoing shares (can't accept if you're sharing your own account)
    if (existingShares.outgoing.length > 0) {
      return res.status(400).json({ 
        error: 'You cannot accept a share while you are sharing your account with others. Please remove your outgoing shares first.' 
      });
    }

    familyShareManager.acceptShare(req.params.id, req.user.id);
    await saveData();

    res.json(share.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject a share invitation
 */
app.post('/api/shares/:id/reject', authenticate, async (req, res) => {
  try {
    const share = familyShareManager.findShareById(req.params.id);
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const currentUser = userManager.findUserById(req.user.id);
    
    // Verify the share is for this user's email
    if (share.sharedWithEmail !== currentUser.email) {
      return res.status(403).json({ error: 'This share is not for you' });
    }

    familyShareManager.rejectShare(req.params.id);
    await saveData();

    res.json(share.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete/revoke a share
 */
app.delete('/api/shares/:id', authenticate, async (req, res) => {
  try {
    const share = familyShareManager.findShareById(req.params.id);
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Only owner or shared user can delete
    if (share.ownerUserId !== req.user.id && share.sharedWithUserId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this share' });
    }

    familyShareManager.deleteShare(req.params.id);
    await saveData();

    res.json({ message: 'Share deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Error Handling =============

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ============= Start Server =============

// Check if SSL certificates are configured
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;
const useSSL = sslKeyPath && sslCertPath;

if (useSSL) {
  // Try to load SSL certificates
  try {
    if (!fs.existsSync(sslKeyPath)) {
      console.error(`SSL key file not found: ${sslKeyPath}`);
      console.error('Starting server in HTTP mode instead.');
      startHTTPServer(false);
    } else if (!fs.existsSync(sslCertPath)) {
      console.error(`SSL certificate file not found: ${sslCertPath}`);
      console.error('Starting server in HTTP mode instead.');
      startHTTPServer(false);
    } else {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      // Optionally load CA certificate if provided
      if (process.env.SSL_CA_PATH && fs.existsSync(process.env.SSL_CA_PATH)) {
        httpsOptions.ca = fs.readFileSync(process.env.SSL_CA_PATH);
      }
      
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`Storage Tracker API server running on https://localhost:${PORT}`);
        console.log(`Frontend available at https://localhost:${PORT}`);
        console.log('SSL/HTTPS enabled');
      });
    }
  } catch (error) {
    console.error('Error loading SSL certificates:', error.message);
    console.error('Starting server in HTTP mode instead.');
    startHTTPServer(false);
  }
} else {
  startHTTPServer(true);
}

function startHTTPServer(showNote) {
  http.createServer(app).listen(PORT, () => {
    console.log(`Storage Tracker API server running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    if (showNote) {
      console.log('');
      console.log('Note: Running in HTTP mode. For HTTPS, configure SSL_KEY_PATH and SSL_CERT_PATH in .env');
    }
  });
}

module.exports = app;
