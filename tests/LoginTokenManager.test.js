const fs = require('fs').promises;
const path = require('path');
const LoginTokenManager = require('../src/LoginTokenManager');

describe('LoginTokenManager', () => {
  let manager;
  const testDataPath = path.join(__dirname, '../data/test-login-tokens.json');

  beforeEach(() => {
    manager = new LoginTokenManager(testDataPath);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testDataPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('createToken', () => {
    it('should create a login token with 14 day default expiry', () => {
      const token = manager.createToken('user-1', 'test@example.com');
      
      expect(token.userId).toBe('user-1');
      expect(token.email).toBe('test@example.com');
      expect(token.token).toBeTruthy();
      expect(token.token.length).toBe(64);
      
      const expiryDate = new Date(token.expiresAt);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 14);
      
      // Allow 1 second difference for test execution time
      expect(Math.abs(expiryDate - expectedDate)).toBeLessThan(1000);
    });

    it('should create a login token with custom expiry', () => {
      const token = manager.createToken('user-1', 'test@example.com', 7);
      
      const expiryDate = new Date(token.expiresAt);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      
      expect(Math.abs(expiryDate - expectedDate)).toBeLessThan(1000);
    });
  });

  describe('findByToken', () => {
    it('should find token by token string', () => {
      const token = manager.createToken('user-1', 'test@example.com');
      const found = manager.findByToken(token.token);
      
      expect(found).toBeTruthy();
      expect(found.id).toBe(token.id);
    });

    it('should return undefined for non-existent token', () => {
      const found = manager.findByToken('non-existent');
      
      expect(found).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify and consume a valid token', () => {
      const token = manager.createToken('user-1', 'test@example.com');
      const result = manager.verifyToken(token.token);
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      
      // Token should now be marked as used
      const foundToken = manager.findByToken(token.token);
      expect(foundToken.used).toBe(true);
    });

    it('should reject invalid token', () => {
      const result = manager.verifyToken('invalid-token');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should reject expired token', () => {
      // Create the token with a valid expiry first, then manually expire it
      const token = manager.createToken('user-1', 'test@example.com', 1);
      // Manually set the expiry to the past
      token.expiresAt = new Date(Date.now() - 1000).toISOString();
      const result = manager.verifyToken(token.token);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should reject already used token', () => {
      const token = manager.createToken('user-1', 'test@example.com');
      manager.verifyToken(token.token); // Use it once
      const result = manager.verifyToken(token.token); // Try to use again
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has already been used');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens', () => {
      const validToken = manager.createToken('user-2', 'test2@example.com', 1);
      
      // Manually add an expired token
      const expiredToken = manager.createToken('user-1', 'test@example.com', 1);
      expiredToken.expiresAt = new Date(Date.now() - 1000).toISOString();
      
      expect(manager.tokens.length).toBe(2);
      
      manager.cleanupExpiredTokens();
      
      expect(manager.tokens.length).toBe(1);
      expect(manager.tokens[0].id).toBe(validToken.id);
    });
  });

  describe('getUserTokens', () => {
    it('should get all tokens for a user', () => {
      manager.createToken('user-1', 'test1@example.com');
      manager.createToken('user-1', 'test1@example.com');
      manager.createToken('user-2', 'test2@example.com');
      
      const userTokens = manager.getUserTokens('user-1');
      
      expect(userTokens.length).toBe(2);
      expect(userTokens.every(t => t.userId === 'user-1')).toBe(true);
    });
  });

  describe('revokeUserTokens', () => {
    it('should revoke all tokens for a user', () => {
      manager.createToken('user-1', 'test1@example.com');
      manager.createToken('user-1', 'test1@example.com');
      manager.createToken('user-2', 'test2@example.com');
      
      expect(manager.tokens.length).toBe(3);
      
      manager.revokeUserTokens('user-1');
      
      expect(manager.tokens.length).toBe(1);
      expect(manager.tokens[0].userId).toBe('user-2');
    });
  });

  describe('save and load', () => {
    it('should save and load tokens', async () => {
      const token1 = manager.createToken('user-1', 'test1@example.com');
      const token2 = manager.createToken('user-2', 'test2@example.com');
      
      await manager.save();
      
      const newManager = new LoginTokenManager(testDataPath);
      const loaded = await newManager.load();
      
      expect(loaded).toBe(true);
      expect(newManager.tokens.length).toBe(2);
      
      const foundToken = newManager.findByToken(token1.token);
      expect(foundToken).toBeTruthy();
      expect(foundToken.userId).toBe('user-1');
    });

    it('should return false when loading non-existent file', async () => {
      const newManager = new LoginTokenManager(testDataPath);
      const loaded = await newManager.load();
      
      expect(loaded).toBe(false);
    });

    it('should cleanup expired tokens after loading', async () => {
      // Create tokens
      manager.createToken('user-2', 'test2@example.com', 1); // Valid
      const expiredToken = manager.createToken('user-1', 'test1@example.com', 1);
      // Manually expire it
      expiredToken.expiresAt = new Date(Date.now() - 1000).toISOString();
      
      await manager.save();
      
      const newManager = new LoginTokenManager(testDataPath);
      await newManager.load();
      
      expect(newManager.tokens.length).toBe(1);
      expect(newManager.tokens[0].userId).toBe('user-2');
    });
  });
});
