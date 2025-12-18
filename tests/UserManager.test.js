const UserManager = require('../src/UserManager');
const fs = require('fs').promises;
const path = require('path');

describe('UserManager', () => {
  let userManager;
  let testDataPath;

  beforeEach(() => {
    testDataPath = path.join(__dirname, '../data/test-users.json');
    userManager = new UserManager(testDataPath);
  });

  afterEach(async () => {
    // Clean up test data file
    try {
      await fs.unlink(testDataPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const user = await userManager.createUser('testuser', 'test@example.com', 'password123');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
      expect(user.passwordHash).toBeDefined();
    });

    it('should throw error if username already exists', async () => {
      await userManager.createUser('testuser', 'test1@example.com', 'password123');
      
      await expect(
        userManager.createUser('testuser', 'test2@example.com', 'password456')
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error if email already exists', async () => {
      await userManager.createUser('testuser1', 'test@example.com', 'password123');
      
      await expect(
        userManager.createUser('testuser2', 'test@example.com', 'password456')
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('findUserByUsername', () => {
    it('should find user by username', async () => {
      await userManager.createUser('testuser', 'test@example.com', 'password123');
      const user = userManager.findUserByUsername('testuser');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
    });

    it('should return undefined for non-existent user', () => {
      const user = userManager.findUserByUsername('nonexistent');
      expect(user).toBeUndefined();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      await userManager.createUser('testuser', 'test@example.com', 'password123');
      const user = userManager.findUserByEmail('test@example.com');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const created = await userManager.createUser('testuser', 'test@example.com', 'password123');
      const found = userManager.findUserById(created.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with correct credentials', async () => {
      await userManager.createUser('testuser', 'test@example.com', 'password123');
      const user = await userManager.authenticate('testuser', 'password123');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
    });

    it('should return null for incorrect password', async () => {
      await userManager.createUser('testuser', 'test@example.com', 'password123');
      const user = await userManager.authenticate('testuser', 'wrongpassword');
      
      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await userManager.authenticate('nonexistent', 'password123');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user details', async () => {
      const user = await userManager.createUser('testuser', 'test@example.com', 'password123');
      const updated = userManager.updateUser(user.id, { username: 'newusername' });
      
      expect(updated.username).toBe('newusername');
    });

    it('should throw error for non-existent user', () => {
      expect(() => {
        userManager.updateUser('nonexistent', { username: 'test' });
      }).toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const user = await userManager.createUser('testuser', 'test@example.com', 'password123');
      const result = userManager.deleteUser(user.id);
      
      expect(result).toBe(true);
      expect(userManager.findUserById(user.id)).toBeUndefined();
    });

    it('should return false for non-existent user', () => {
      const result = userManager.deleteUser('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('save and load', () => {
    it('should save and load users', async () => {
      const user1 = await userManager.createUser('user1', 'user1@example.com', 'password123');
      const user2 = await userManager.createUser('user2', 'user2@example.com', 'password456');
      
      await userManager.save();
      
      const newManager = new UserManager(testDataPath);
      await newManager.load();
      
      expect(newManager.users.length).toBe(2);
      expect(newManager.findUserByUsername('user1')).toBeDefined();
      expect(newManager.findUserByUsername('user2')).toBeDefined();
    });

    it('should return false when loading non-existent file', async () => {
      const result = await userManager.load();
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without sensitive data', async () => {
      await userManager.createUser('user1', 'user1@example.com', 'password123');
      await userManager.createUser('user2', 'user2@example.com', 'password456');
      
      const users = userManager.getAllUsers();
      
      expect(users.length).toBe(2);
      expect(users[0].passwordHash).toBeUndefined();
      expect(users[1].passwordHash).toBeUndefined();
    });
  });
});
