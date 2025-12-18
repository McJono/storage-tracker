const bcrypt = require('bcryptjs');

/**
 * User class represents a user account
 */
class User {
  constructor(id, username, email, passwordHash) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Hash a plain text password
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Update user details
   */
  update(updates) {
    if (updates.username !== undefined) this.username = updates.username;
    if (updates.email !== undefined) this.email = updates.email;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Convert to plain object (without password hash)
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create User from plain object
   */
  static fromJSON(data) {
    const user = new User(data.id, data.username, data.email, data.passwordHash);
    user.createdAt = data.createdAt || new Date().toISOString();
    user.updatedAt = data.updatedAt || new Date().toISOString();
    return user;
  }
}

module.exports = User;
