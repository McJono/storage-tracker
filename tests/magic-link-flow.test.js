const UserManager = require('../src/UserManager');
const LoginTokenManager = require('../src/LoginTokenManager');
const { generateToken } = require('../src/auth');
const fs = require('fs').promises;
const path = require('path');

describe('Magic Link Flow', () => {
  let userManager;
  let tokenManager;
  const testUserDataPath = path.join(__dirname, '../data/test-magic-link-users.json');
  const testTokenDataPath = path.join(__dirname, '../data/test-magic-link-tokens.json');

  beforeEach(async () => {
    userManager = new UserManager(testUserDataPath);
    tokenManager = new LoginTokenManager(testTokenDataPath);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testUserDataPath);
      await fs.unlink(testTokenDataPath);
    } catch (error) {
      // Ignore if files don't exist
    }
  });

  it('should complete full magic link flow successfully', async () => {
    // Step 1: User requests magic link (creates user and token)
    const email = 'test@example.com';
    let user = userManager.findUserByEmail(email);
    if (!user) {
      user = await userManager.createUserWithEmail(email);
      await userManager.save();
    }
    expect(user).toBeTruthy();
    expect(user.email).toBe(email);

    // Step 2: Create login token
    const loginToken = tokenManager.createToken(user.id, email, 14);
    await tokenManager.save();
    expect(loginToken).toBeTruthy();
    expect(loginToken.token).toBeTruthy();
    expect(loginToken.isValid()).toBe(true);

    // Step 3: Simulate server restart (reload data)
    const newUserManager = new UserManager(testUserDataPath);
    const newTokenManager = new LoginTokenManager(testTokenDataPath);
    await newUserManager.load();
    await newTokenManager.load();

    // Step 4: User clicks magic link and verifies token
    const result = newTokenManager.verifyToken(loginToken.token);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe(user.id);
    expect(result.email).toBe(email);

    // Step 5: Get user and generate JWT
    const verifiedUser = newUserManager.findUserById(result.userId);
    expect(verifiedUser).toBeTruthy();
    expect(verifiedUser.email).toBe(email);

    const jwtToken = generateToken(verifiedUser);
    expect(jwtToken).toBeTruthy();
    expect(typeof jwtToken).toBe('string');

    // Step 6: Save token state (marked as used)
    await newTokenManager.save();

    // Step 7: Verify token cannot be used again
    const result2 = newTokenManager.verifyToken(loginToken.token);
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Token has already been used');
  });

  it('should reject invalid token', async () => {
    const result = tokenManager.verifyToken('invalid-token-12345');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token');
  });

  it('should reject expired token', async () => {
    const email = 'test@example.com';
    const user = await userManager.createUserWithEmail(email);
    
    // Create token and manually expire it
    const loginToken = tokenManager.createToken(user.id, email, 1);
    loginToken.expiresAt = new Date(Date.now() - 1000).toISOString();
    
    const result = tokenManager.verifyToken(loginToken.token);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token has expired');
  });

  it('should persist token state across restarts', async () => {
    const email = 'test@example.com';
    const user = await userManager.createUserWithEmail(email);
    await userManager.save();
    
    const loginToken = tokenManager.createToken(user.id, email, 14);
    await tokenManager.save();
    
    // Use the token
    const result1 = tokenManager.verifyToken(loginToken.token);
    expect(result1.valid).toBe(true);
    
    // Save the used state
    await tokenManager.save();
    
    // Simulate restart
    const newTokenManager = new LoginTokenManager(testTokenDataPath);
    await newTokenManager.load();
    
    // Token should still be marked as used
    const result2 = newTokenManager.verifyToken(loginToken.token);
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Token has already been used');
  });
});
