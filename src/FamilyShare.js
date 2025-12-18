/**
 * FamilyShare class represents a sharing relationship between users
 */
class FamilyShare {
  constructor(id, ownerUserId, sharedWithEmail, status = 'pending') {
    this.id = id;
    this.ownerUserId = ownerUserId; // User who owns the data and is sharing it
    this.sharedWithEmail = sharedWithEmail; // Email of user to share with
    this.sharedWithUserId = null; // Will be set when user accepts (or already exists)
    this.status = status; // 'pending', 'accepted', 'rejected'
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.acceptedAt = null;
  }

  /**
   * Accept the share invitation
   */
  accept(userId) {
    this.status = 'accepted';
    this.sharedWithUserId = userId;
    this.acceptedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Reject the share invitation
   */
  reject() {
    this.status = 'rejected';
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      ownerUserId: this.ownerUserId,
      sharedWithEmail: this.sharedWithEmail,
      sharedWithUserId: this.sharedWithUserId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      acceptedAt: this.acceptedAt
    };
  }

  /**
   * Create FamilyShare from plain object
   */
  static fromJSON(data) {
    const share = new FamilyShare(
      data.id,
      data.ownerUserId,
      data.sharedWithEmail,
      data.status
    );
    share.sharedWithUserId = data.sharedWithUserId || null;
    share.createdAt = data.createdAt || new Date().toISOString();
    share.updatedAt = data.updatedAt || new Date().toISOString();
    share.acceptedAt = data.acceptedAt || null;
    return share;
  }
}

module.exports = FamilyShare;
