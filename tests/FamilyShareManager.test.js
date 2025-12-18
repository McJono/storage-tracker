const FamilyShareManager = require('../src/FamilyShareManager');
const fs = require('fs').promises;
const path = require('path');

describe('FamilyShareManager', () => {
  let shareManager;
  let testDataPath;

  beforeEach(() => {
    testDataPath = path.join(__dirname, '../data/test-family-shares.json');
    shareManager = new FamilyShareManager(testDataPath);
  });

  afterEach(async () => {
    // Clean up test data file
    try {
      await fs.unlink(testDataPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('createShare', () => {
    it('should create a new share invitation', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      
      expect(share).toBeDefined();
      expect(share.ownerUserId).toBe('user-1');
      expect(share.sharedWithEmail).toBe('family@example.com');
      expect(share.status).toBe('pending');
      expect(share.id).toBeDefined();
    });

    it('should throw error if share already exists with same email', () => {
      shareManager.createShare('user-1', 'family@example.com');
      
      expect(() => {
        shareManager.createShare('user-1', 'family@example.com');
      }).toThrow('Share already exists with this email');
    });

    it('should allow creating new share after previous was rejected', () => {
      const share1 = shareManager.createShare('user-1', 'family@example.com');
      share1.reject();
      
      const share2 = shareManager.createShare('user-1', 'family@example.com');
      expect(share2).toBeDefined();
      expect(share2.id).not.toBe(share1.id);
    });
  });

  describe('findShareById', () => {
    it('should find share by ID', () => {
      const created = shareManager.createShare('user-1', 'family@example.com');
      const found = shareManager.findShareById(created.id);
      
      expect(found).toBe(created);
    });

    it('should return undefined for non-existent share', () => {
      const found = shareManager.findShareById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getUserShares', () => {
    it('should return empty arrays for user with no shares', () => {
      const shares = shareManager.getUserShares('user-1');
      
      expect(shares.outgoing).toEqual([]);
      expect(shares.incoming).toEqual([]);
    });

    it('should return outgoing shares', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      const shares = shareManager.getUserShares('user-1');
      
      expect(shares.outgoing).toHaveLength(1);
      expect(shares.outgoing[0]).toBe(share);
      expect(shares.incoming).toHaveLength(0);
    });

    it('should return incoming shares when accepted', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.accept('user-2');
      
      const shares = shareManager.getUserShares('user-2');
      
      expect(shares.incoming).toHaveLength(1);
      expect(shares.incoming[0]).toBe(share);
      expect(shares.outgoing).toHaveLength(0);
    });

    it('should not return pending shares as incoming', () => {
      shareManager.createShare('user-1', 'family@example.com');
      
      const shares = shareManager.getUserShares('user-2');
      
      expect(shares.incoming).toHaveLength(0);
    });
  });

  describe('getPendingSharesForEmail', () => {
    it('should return pending shares for email', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      const pending = shareManager.getPendingSharesForEmail('family@example.com');
      
      expect(pending).toHaveLength(1);
      expect(pending[0]).toBe(share);
    });

    it('should not return accepted shares', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.accept('user-2');
      
      const pending = shareManager.getPendingSharesForEmail('family@example.com');
      
      expect(pending).toHaveLength(0);
    });

    it('should return empty array for email with no pending shares', () => {
      const pending = shareManager.getPendingSharesForEmail('nobody@example.com');
      expect(pending).toEqual([]);
    });
  });

  describe('acceptShare', () => {
    it('should accept a pending share', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      const accepted = shareManager.acceptShare(share.id, 'user-2');
      
      expect(accepted.status).toBe('accepted');
      expect(accepted.sharedWithUserId).toBe('user-2');
      expect(accepted.acceptedAt).toBeDefined();
    });

    it('should throw error if share not found', () => {
      expect(() => {
        shareManager.acceptShare('non-existent', 'user-2');
      }).toThrow('Share not found');
    });

    it('should throw error if share is not pending', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.reject();
      
      expect(() => {
        shareManager.acceptShare(share.id, 'user-2');
      }).toThrow('Share is not pending');
    });
  });

  describe('rejectShare', () => {
    it('should reject a pending share', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      const rejected = shareManager.rejectShare(share.id);
      
      expect(rejected.status).toBe('rejected');
    });

    it('should throw error if share not found', () => {
      expect(() => {
        shareManager.rejectShare('non-existent');
      }).toThrow('Share not found');
    });

    it('should throw error if share is not pending', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.accept('user-2');
      
      expect(() => {
        shareManager.rejectShare(share.id);
      }).toThrow('Share is not pending');
    });
  });

  describe('deleteShare', () => {
    it('should delete a share', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      const success = shareManager.deleteShare(share.id);
      
      expect(success).toBe(true);
      expect(shareManager.findShareById(share.id)).toBeUndefined();
    });

    it('should return false if share not found', () => {
      const success = shareManager.deleteShare('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('getPrimaryStorageOwner', () => {
    it('should return user ID if user owns storage', () => {
      const owner = shareManager.getPrimaryStorageOwner('user-1');
      expect(owner).toBe('user-1');
    });

    it('should return owner ID if user has accepted share', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.accept('user-2');
      
      const owner = shareManager.getPrimaryStorageOwner('user-2');
      expect(owner).toBe('user-1');
    });

    it('should return user ID if share is pending', () => {
      shareManager.createShare('user-1', 'family@example.com');
      
      const owner = shareManager.getPrimaryStorageOwner('user-2');
      expect(owner).toBe('user-2');
    });
  });

  describe('canAccessStorage', () => {
    it('should allow user to access their own storage', () => {
      const canAccess = shareManager.canAccessStorage('user-1', 'user-1');
      expect(canAccess).toBe(true);
    });

    it('should allow access if user has accepted share', () => {
      const share = shareManager.createShare('user-1', 'family@example.com');
      share.accept('user-2');
      
      const canAccess = shareManager.canAccessStorage('user-2', 'user-1');
      expect(canAccess).toBe(true);
    });

    it('should not allow access if share is pending', () => {
      shareManager.createShare('user-1', 'family@example.com');
      
      const canAccess = shareManager.canAccessStorage('user-2', 'user-1');
      expect(canAccess).toBe(false);
    });

    it('should not allow access if no share exists', () => {
      const canAccess = shareManager.canAccessStorage('user-2', 'user-1');
      expect(canAccess).toBe(false);
    });
  });

  describe('save and load', () => {
    it('should save and load shares', async () => {
      const share1 = shareManager.createShare('user-1', 'family1@example.com');
      const share2 = shareManager.createShare('user-2', 'family2@example.com');
      share2.accept('user-3');
      
      await shareManager.save();
      
      // Create new manager and load
      const newManager = new FamilyShareManager(testDataPath);
      await newManager.load();
      
      expect(newManager.shares).toHaveLength(2);
      expect(newManager.findShareById(share1.id)).toBeDefined();
      expect(newManager.findShareById(share2.id).status).toBe('accepted');
    });

    it('should return false when loading non-existent file', async () => {
      const result = await shareManager.load();
      expect(result).toBe(false);
    });
  });
});
