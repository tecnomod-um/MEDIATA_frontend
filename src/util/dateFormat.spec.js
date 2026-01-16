import { dateFormats } from './dateFormat';

describe('dateFormat', () => {
  it('exports dateFormats array', () => {
    expect(Array.isArray(dateFormats)).toBe(true);
  });

  it('dateFormats contains expected format options', () => {
    expect(dateFormats.length).toBeGreaterThan(0);
    
    const values = dateFormats.map(f => f.value);
    expect(values).toContain('YYYY-MM-DD');
    expect(values).toContain('MM/DD/YYYY');
    expect(values).toContain('DD/MM/YYYY');
  });

  it('each format has value and label properties', () => {
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
    const europeanFormat = dateFormats.find(f => f.value === 'DD/MM/YYYY');
    expect(europeanFormat).toBeDefined();
    expect(europeanFormat.label).toContain('European');
  });

  it('includes Japanese format', () => {
    const japaneseFormat = dateFormats.find(f => f.value === 'YYYY/MM/DD');
    expect(japaneseFormat).toBeDefined();
    expect(japaneseFormat.label).toContain('Japanese');
  });

  it('all format values are unique', () => {
    const values = dateFormats.map(f => f.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('all format labels are unique', () => {
    const labels = dateFormats.map(f => f.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});
