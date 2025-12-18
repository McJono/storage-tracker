const User = require('../src/User');

describe('User', () => {
  describe('constructor', () => {
    it('should create a user with required fields', () => {
      const user = new User('user-1', 'testuser', 'test@example.com', 'hashedpass');
      
      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashedpass');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mypassword123';
      const hash = await User.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should create different hashes for same password', async () => {
      const password = 'mypassword123';
      const hash1 = await User.hashPassword(password);
      const hash2 = await User.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'mypassword123';
      const hash = await User.hashPassword(password);
      const user = new User('user-1', 'testuser', 'test@example.com', hash);
      
      const isValid = await user.verifyPassword(password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mypassword123';
      const hash = await User.hashPassword(password);
      const user = new User('user-1', 'testuser', 'test@example.com', hash);
      
      const isValid = await user.verifyPassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update username', () => {
      const user = new User('user-1', 'testuser', 'test@example.com', 'hash');
      const oldUpdatedAt = user.updatedAt;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        user.update({ username: 'newusername' });
        
        expect(user.username).toBe('newusername');
        expect(user.updatedAt).not.toBe(oldUpdatedAt);
      }, 10);
    });

    it('should update email', () => {
      const user = new User('user-1', 'testuser', 'test@example.com', 'hash');
      user.update({ email: 'newemail@example.com' });
      
      expect(user.email).toBe('newemail@example.com');
    });
  });

  describe('toJSON', () => {
    it('should not include password hash', () => {
      const user = new User('user-1', 'testuser', 'test@example.com', 'hashedpass');
      const json = user.toJSON();
      
      expect(json.id).toBe('user-1');
      expect(json.username).toBe('testuser');
      expect(json.email).toBe('test@example.com');
      expect(json.passwordHash).toBeUndefined();
    });
  });

  describe('fromJSON', () => {
    it('should create user from JSON data', () => {
      const data = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpass',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      };
      
      const user = User.fromJSON(data);
      
      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashedpass');
      expect(user.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(user.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });
  });
});
