const fs = require('fs').promises;
const path = require('path');
const FamilyShare = require('./FamilyShare');

/**
 * FamilyShareManager handles family sharing between users
 */
class FamilyShareManager {
  constructor(dataPath = null) {
    this.shares = [];
    this.dataPath = dataPath || path.join(__dirname, '../data/family-shares.json');
    this.nextId = 1;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `share-${Date.now()}-${this.nextId++}`;
  }

  /**
   * Create a new share invitation
   */
  createShare(ownerUserId, sharedWithEmail) {
    // Check if share already exists (pending or accepted)
    const existingShare = this.shares.find(
      s => s.ownerUserId === ownerUserId && 
           s.sharedWithEmail === sharedWithEmail &&
           (s.status === 'pending' || s.status === 'accepted')
    );

    if (existingShare) {
      throw new Error('Share already exists with this email');
    }

    const share = new FamilyShare(this.generateId(), ownerUserId, sharedWithEmail);
    this.shares.push(share);
    return share;
  }

  /**
   * Find share by ID
   */
  findShareById(shareId) {
    return this.shares.find(s => s.id === shareId);
  }

  /**
   * Get all shares for a user (both as owner and shared with)
   */
  getUserShares(userId) {
    return {
      outgoing: this.shares.filter(s => s.ownerUserId === userId),
      incoming: this.shares.filter(s => s.sharedWithUserId === userId && s.status === 'accepted')
    };
  }

  /**
   * Get pending shares for an email
   */
  getPendingSharesForEmail(email) {
    return this.shares.filter(s => s.sharedWithEmail === email && s.status === 'pending');
  }

  /**
   * Accept a share invitation
   */
  acceptShare(shareId, userId) {
    const share = this.findShareById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    if (share.status !== 'pending') {
      throw new Error('Share is not pending');
    }

    share.accept(userId);
    return share;
  }

  /**
   * Reject a share invitation
   */
  rejectShare(shareId) {
    const share = this.findShareById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    if (share.status !== 'pending') {
      throw new Error('Share is not pending');
    }

    share.reject();
    return share;
  }

  /**
   * Delete/revoke a share
   */
  deleteShare(shareId) {
    const index = this.shares.findIndex(s => s.id === shareId);
    if (index !== -1) {
      this.shares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get the primary storage owner for a user
   * Returns the user's own ID if they own the storage,
   * or the owner's ID if they have accepted a share
   * 
   * Note: The application enforces that a user can only have one active incoming share
   * at a time (enforced in the API accept endpoint), so this method will return the
   * single accepted share if one exists.
   */
  getPrimaryStorageOwner(userId) {
    // Check if user has accepted any incoming shares
    const acceptedShare = this.shares.find(
      s => s.sharedWithUserId === userId && s.status === 'accepted'
    );

    if (acceptedShare) {
      return acceptedShare.ownerUserId;
    }

    // User is the primary owner
    return userId;
  }

  /**
   * Check if a user can access another user's storage
   */
  canAccessStorage(userId, storageOwnerId) {
    // User can always access their own storage
    if (userId === storageOwnerId) {
      return true;
    }

    // Check if user has accepted share from storage owner
    const hasAccess = this.shares.some(
      s => s.ownerUserId === storageOwnerId && 
           s.sharedWithUserId === userId && 
           s.status === 'accepted'
    );

    return hasAccess;
  }

  /**
   * Save shares to file
   */
  async save() {
    const data = {
      shares: this.shares.map(s => s.toJSON()),
      nextId: this.nextId,
      savedAt: new Date().toISOString()
    };

    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load shares from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.shares = parsed.shares.map(s => FamilyShare.fromJSON(s));
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
}

module.exports = FamilyShareManager;
