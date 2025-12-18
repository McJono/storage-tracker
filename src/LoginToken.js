const crypto = require('crypto');

/**
 * LoginToken represents a magic link token for passwordless authentication
 */
class LoginToken {
  constructor(id, userId, email, token, expiresAt) {
    this.id = id;
    this.userId = userId;
    this.email = email;
    this.token = token;
    this.expiresAt = expiresAt;
    this.createdAt = new Date().toISOString();
    this.used = false;
    this.usedAt = null;
  }

  /**
   * Generate a secure random token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if token is expired
   */
  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if token is valid (not expired and not used)
   */
  isValid() {
    return !this.isExpired() && !this.used;
  }

  /**
   * Mark token as used
   */
  markAsUsed() {
    this.used = true;
    this.usedAt = new Date().toISOString();
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      email: this.email,
      token: this.token,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      used: this.used,
      usedAt: this.usedAt
    };
  }

  /**
   * Create LoginToken from plain object
   */
  static fromJSON(data) {
    const token = new LoginToken(
      data.id,
      data.userId,
      data.email,
      data.token,
      data.expiresAt
    );
    token.createdAt = data.createdAt || new Date().toISOString();
    token.used = data.used || false;
    token.usedAt = data.usedAt || null;
    return token;
  }
}

module.exports = LoginToken;
