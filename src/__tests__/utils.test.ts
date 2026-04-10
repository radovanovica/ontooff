import { slugify } from '@/lib/utils';

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Café & Bar!')).toBe('caf-bar');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a  --  b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify(' -hello- ')).toBe('hello');
  });

  it('lowercases the result', () => {
    expect(slugify('UPPER CASE')).toBe('upper-case');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles Serbian characters by removing them', () => {
    const result = slugify('Šuma i Reka');
    expect(result).toMatch(/^[a-z0-9-]*$/);
  });
});
