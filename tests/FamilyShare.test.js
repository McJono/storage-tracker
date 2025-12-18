const FamilyShare = require('../src/FamilyShare');

describe('FamilyShare', () => {
  describe('constructor', () => {
    it('should create a new family share with default pending status', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com');
      
      expect(share.id).toBe('share-1');
      expect(share.ownerUserId).toBe('user-1');
      expect(share.sharedWithEmail).toBe('family@example.com');
      expect(share.sharedWithUserId).toBeNull();
      expect(share.status).toBe('pending');
      expect(share.createdAt).toBeDefined();
      expect(share.updatedAt).toBeDefined();
      expect(share.acceptedAt).toBeNull();
    });

    it('should create a share with custom status', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com', 'accepted');
      
      expect(share.status).toBe('accepted');
    });
  });

  describe('accept', () => {
    it('should accept a share and set acceptedAt timestamp', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com');
      const beforeUpdate = share.updatedAt;
      
      // Small delay to ensure timestamp changes
      setTimeout(() => {
        share.accept('user-2');
        
        expect(share.status).toBe('accepted');
        expect(share.sharedWithUserId).toBe('user-2');
        expect(share.acceptedAt).toBeDefined();
        expect(share.updatedAt).not.toBe(beforeUpdate);
      }, 10);
    });
  });

  describe('reject', () => {
    it('should reject a share', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com');
      const beforeUpdate = share.updatedAt;
      
      setTimeout(() => {
        share.reject();
        
        expect(share.status).toBe('rejected');
        expect(share.updatedAt).not.toBe(beforeUpdate);
      }, 10);
    });
  });

  describe('toJSON', () => {
    it('should convert to plain object', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com');
      const json = share.toJSON();
      
      expect(json).toEqual({
        id: 'share-1',
        ownerUserId: 'user-1',
        sharedWithEmail: 'family@example.com',
        sharedWithUserId: null,
        status: 'pending',
        createdAt: share.createdAt,
        updatedAt: share.updatedAt,
        acceptedAt: null
      });
    });

    it('should include all fields for accepted share', () => {
      const share = new FamilyShare('share-1', 'user-1', 'family@example.com');
      share.accept('user-2');
      const json = share.toJSON();
      
      expect(json.status).toBe('accepted');
      expect(json.sharedWithUserId).toBe('user-2');
      expect(json.acceptedAt).toBeDefined();
    });
  });

  describe('fromJSON', () => {
    it('should create FamilyShare from plain object', () => {
      const data = {
        id: 'share-1',
        ownerUserId: 'user-1',
        sharedWithEmail: 'family@example.com',
        sharedWithUserId: 'user-2',
        status: 'accepted',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        acceptedAt: '2024-01-02T00:00:00.000Z'
      };
      
      const share = FamilyShare.fromJSON(data);
      
      expect(share.id).toBe('share-1');
      expect(share.ownerUserId).toBe('user-1');
      expect(share.sharedWithEmail).toBe('family@example.com');
      expect(share.sharedWithUserId).toBe('user-2');
      expect(share.status).toBe('accepted');
      expect(share.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(share.updatedAt).toBe('2024-01-02T00:00:00.000Z');
      expect(share.acceptedAt).toBe('2024-01-02T00:00:00.000Z');
    });
  });
});
