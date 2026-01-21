import { dateFormats } from './dateFormat';

describe('dateFormat', () => {
  it('exports dateFormats array', () => {
    expect(dateFormats).toBeDefined();
    expect(Array.isArray(dateFormats)).toBe(true);
  });

  it('contains expected date formats', () => {
    expect(dateFormats.length).toBeGreaterThan(0);
    
    // Check structure of each format
    dateFormats.forEach(format => {
      expect(format).toHaveProperty('value');
      expect(format).toHaveProperty('label');
      expect(typeof format.value).toBe('string');
      expect(typeof format.label).toBe('string');
    });
  });

  it('includes ISO format', () => {
    const isoFormat = dateFormats.find(f => f.value === 'YYYY-MM-DD');
    expect(isoFormat).toBeDefined();
    expect(isoFormat.label).toContain('ISO');
  });

  it('includes US format', () => {
    const usFormat = dateFormats.find(f => f.value === 'MM/DD/YYYY');
    expect(usFormat).toBeDefined();
    expect(usFormat.label).toContain('US');
  });

  it('includes European format', () => {
    const euFormat = dateFormats.find(f => f.value === 'DD/MM/YYYY');
    expect(euFormat).toBeDefined();
    expect(euFormat.label).toContain('European');
  });
});
