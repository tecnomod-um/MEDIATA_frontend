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

  it('includes format with time', () => {
    const timeFormat = dateFormats.find(f => f.value.includes('HH:mm:ss'));
    expect(timeFormat).toBeDefined();
  });

  it('all formats are non-empty strings', () => {
    dateFormats.forEach(format => {
      expect(format.value.length).toBeGreaterThan(0);
      expect(format.label.length).toBeGreaterThan(0);
    });
  });

  it('formats use standard separators', () => {
    dateFormats.forEach(format => {
      const hasStandardSeparator = 
        format.value.includes('-') || 
        format.value.includes('/') || 
        format.value.includes('.') ||
        format.value.includes(' ');
      if (format.value.length > 10) {
        expect(hasStandardSeparator).toBe(true);
      }
    });
  });

  it('includes both dash and slash separators', () => {
    const dashFormats = dateFormats.filter(f => f.value.includes('-'));
    const slashFormats = dateFormats.filter(f => f.value.includes('/'));
    expect(dashFormats.length).toBeGreaterThan(0);
    expect(slashFormats.length).toBeGreaterThan(0);
  });

  it('has at least 4 different formats', () => {
    expect(dateFormats.length).toBeGreaterThanOrEqual(4);
  });

  it('format values contain expected date components', () => {
    dateFormats.forEach(format => {
      const hasYear = format.value.includes('YYYY') || format.value.includes('YY');
      const hasMonth = format.value.includes('MM') || format.value.includes('M');
      const hasDay = format.value.includes('DD') || format.value.includes('D');
      expect(hasYear || hasMonth || hasDay).toBe(true);
    });
  });

  it('labels are descriptive', () => {
    dateFormats.forEach(format => {
      expect(format.label.length).toBeGreaterThan(5);
    });
  });
});
