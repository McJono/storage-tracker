const fs = require('fs').promises;
const path = require('path');
const LoginToken = require('./LoginToken');

/**
 * LoginTokenManager handles magic link token management
 */
class LoginTokenManager {
  constructor(dataPath = null) {
    this.tokens = [];
    this.dataPath = dataPath || path.join(__dirname, '../data/login-tokens.json');
    this.nextId = 1;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `token-${Date.now()}-${this.nextId++}`;
  }

  /**
   * Create a new login token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {number} expiryDays - Number of days until token expires (default: 14)
   */
  createToken(userId, email, expiryDays = 14) {
    const token = LoginToken.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const loginToken = new LoginToken(
      this.generateId(),
      userId,
      email,
      token,
      expiresAt.toISOString()
    );

    this.tokens.push(loginToken);
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return loginToken;
  }

  /**
   * Find token by token string
   */
  findByToken(token) {
    return this.tokens.find(t => t.token === token);
  }

  /**
   * Verify and consume a token
   */
  verifyToken(token) {
    const loginToken = this.findByToken(token);
    
    if (!loginToken) {
      return { valid: false, error: 'Invalid token' };
    }

    // Check expiry first
    if (loginToken.isExpired()) {
      return { valid: false, error: 'Token has expired' };
    }
    
    // Check if already used
    if (loginToken.used) {
      return { valid: false, error: 'Token has already been used' };
    }

    // Mark token as used
    loginToken.markAsUsed();

    return {
      valid: true,
      userId: loginToken.userId,
      email: loginToken.email
    };
  }

  /**
   * Clean up expired and used tokens
   */
  cleanupExpiredTokens() {
    const now = new Date();
    // Remove tokens that are expired or were used more than 1 day ago
    this.tokens = this.tokens.filter(token => {
      if (token.used && token.usedAt) {
        const usedDate = new Date(token.usedAt);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return usedDate > oneDayAgo;
      }
      return !token.isExpired();
    });
  }

  /**
   * Get all tokens for a user
   */
  getUserTokens(userId) {
    return this.tokens.filter(t => t.userId === userId);
  }

  /**
   * Revoke all tokens for a user
   */
  revokeUserTokens(userId) {
    this.tokens = this.tokens.filter(t => t.userId !== userId);
  }

  /**
   * Save tokens to file
   */
  async save() {
    // Clean up before saving
    this.cleanupExpiredTokens();

    const data = {
      tokens: this.tokens.map(t => t.toJSON()),
      nextId: this.nextId,
      savedAt: new Date().toISOString()
    };

    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load tokens from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.tokens = parsed.tokens.map(t => LoginToken.fromJSON(t));
      this.nextId = parsed.nextId || 1;
      
      // Clean up expired tokens after loading
      this.cleanupExpiredTokens();
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start fresh
        return false;
      }
      throw error;
    }
  }
}

module.exports = LoginTokenManager;
