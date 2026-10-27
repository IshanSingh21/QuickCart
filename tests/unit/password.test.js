const { hashPassword, comparePassword } = require('../../src/utils/password');

describe('Password Utility', () => {
  it('should hash a plaintext password with bcrypt', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await hashPassword(password);

    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('should successfully verify matching password and hash', async () => {
    const password = 'CorrectPassword999#';
    const hash = await hashPassword(password);

    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject non-matching password', async () => {
    const password = 'OriginalPassword123!';
    const wrongPassword = 'WrongPassword456!';
    const hash = await hashPassword(password);

    const isMatch = await comparePassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
});
