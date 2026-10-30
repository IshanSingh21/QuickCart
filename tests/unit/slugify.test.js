const slugify = require('../../src/utils/slugify');

describe('Slugify Utility', () => {
  it('should convert mixed-case strings with spaces to lowercase hyphenated slugs', () => {
    expect(slugify('Apple iPhone 16 Pro')).toBe('apple-iphone-16-pro');
  });

  it('should strip special characters and punctuation', () => {
    expect(slugify('Sony WH-1000XM5 (Wireless) & Noise-Cancelling!')).toBe(
      'sony-wh-1000xm5-wireless-noise-cancelling'
    );
  });

  it('should collapse multiple consecutive spaces and hyphens into single hyphens', () => {
    expect(slugify('Multiple   Spaces---and---hyphens')).toBe(
      'multiple-spaces-and-hyphens'
    );
  });

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('---leading and trailing---')).toBe('leading-and-trailing');
  });

  it('should handle empty, null, or non-string inputs safely', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
    expect(slugify(12345)).toBe('');
  });
});
