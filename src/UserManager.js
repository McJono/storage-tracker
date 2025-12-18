const fs = require('fs').promises;
const path = require('path');
const User = require('./User');

/**
 * UserManager handles user authentication and management
 */
class UserManager {
  constructor(dataPath = null) {
    this.users = [];
    this.dataPath = dataPath || path.join(__dirname, '../data/users.json');
    this.nextId = 1;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `user-${Date.now()}-${this.nextId++}`;
  }

  /**
   * Create a new user
   * Password is now optional for passwordless authentication
   */
  async createUser(username, email, password = null) {
    // Check if username already exists
    if (this.findUserByUsername(username)) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    if (this.findUserByEmail(email)) {
      throw new Error('Email already exists');
    }

    // Hash password if provided (for backward compatibility)
    const passwordHash = password ? await User.hashPassword(password) : null;
    const user = new User(this.generateId(), username, email, passwordHash);
    this.users.push(user);
    
    return user;
  }

  /**
   * Create a user with email only (passwordless)
   */
  async createUserWithEmail(email, username = null) {
    // Use email as username if not provided
    const finalUsername = username || email.split('@')[0];
    
    // Check if email already exists
    if (this.findUserByEmail(email)) {
      throw new Error('Email already exists');
    }

    // Check if generated username already exists, make it unique
    let uniqueUsername = finalUsername;
    let counter = 1;
    while (this.findUserByUsername(uniqueUsername)) {
      uniqueUsername = `${finalUsername}${counter}`;
      counter++;
    }

    const user = new User(this.generateId(), uniqueUsername, email, null);
    this.users.push(user);
    
    return user;
  }

  /**
   * Find user by username
   */
  findUserByUsername(username) {
    return this.users.find(u => u.username === username);
  }

  /**
   * Find user by email
   */
  findUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  /**
   * Find user by ID
   */
  findUserById(userId) {
    return this.users.find(u => u.id === userId);
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    const user = this.findUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  /**
   * Update user
   */
  updateUser(userId, updates) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.update(updates);
    return user;
  }

  /**
   * Delete user
   */
  deleteUser(userId) {
    const index = this.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Save users to file
   */
  async save() {
    const data = {
      users: this.users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        passwordHash: u.passwordHash,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      })),
      nextId: this.nextId,
      savedAt: new Date().toISOString()
    };

    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load users from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.users = parsed.users.map(u => User.fromJSON(u));
      this.nextId = parsed.nextId || 1;
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start fresh
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all users (without sensitive data)
   */
  getAllUsers() {
    return this.users.map(u => u.toJSON());
  }
}

module.exports = UserManager;
