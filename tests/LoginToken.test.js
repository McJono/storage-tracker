const LoginToken = require('../src/LoginToken');

describe('LoginToken', () => {
  describe('constructor', () => {
    it('should create a login token with required fields', () => {
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.id).toBe('id-1');
      expect(token.userId).toBe('user-1');
      expect(token.email).toBe('test@example.com');
      expect(token.token).toBe('token123');
      expect(token.expiresAt).toBe(expiresAt);
      expect(token.used).toBe(false);
      expect(token.usedAt).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate a random token', () => {
      const token1 = LoginToken.generateToken();
      const token2 = LoginToken.generateToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });
  });

  describe('isExpired', () => {
    it('should return false for non-expired token', () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.isExpired()).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.isExpired()).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true for valid token', () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.isValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      const expiresAt = new Date(Date.now() - 1000).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.isValid()).toBe(false);
    });

    it('should return false for used token', () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      token.markAsUsed();
      
      expect(token.isValid()).toBe(false);
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used', () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      
      expect(token.used).toBe(false);
      expect(token.usedAt).toBeNull();
      
      token.markAsUsed();
      
      expect(token.used).toBe(true);
      expect(token.usedAt).toBeTruthy();
    });
  });

  describe('toJSON/fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const token = new LoginToken('id-1', 'user-1', 'test@example.com', 'token123', expiresAt);
      token.markAsUsed();
      
      const json = token.toJSON();
      const restored = LoginToken.fromJSON(json);
      
      expect(restored.id).toBe(token.id);
      expect(restored.userId).toBe(token.userId);
      expect(restored.email).toBe(token.email);
      expect(restored.token).toBe(token.token);
      expect(restored.expiresAt).toBe(token.expiresAt);
      expect(restored.used).toBe(token.used);
      expect(restored.usedAt).toBe(token.usedAt);
    });
  });
});
