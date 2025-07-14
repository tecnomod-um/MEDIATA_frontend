import { jsonToCSV } from './parser';

describe('jsonToCSV', () => {
  it('converts a single-object array of numbers to CSV', () => {
    const input = [{ a: 1, b: 2 }];
    const expected =
      'a,b\n' +
      '1,2';
    expect(jsonToCSV(input)).toBe(expected);
  });

  it('converts multiple rows correctly, preserving header order', () => {
    const input = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 },
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,age');
    expect(lines[1]).toBe('Alice,30');
    expect(lines[2]).toBe('Bob,25');
    expect(lines[3]).toBe('Charlie,35');
  });

  it('stringifies non-string values via toString()', () => {
    const input = [
      { flag: true, count: 0, ratio: 0.75 },
      { flag: false, count: 5, ratio: 1.25 },
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('flag,count,ratio');
    expect(lines[1]).toBe('true,0,0.75');
    expect(lines[2]).toBe('false,5,1.25');
  });

  it('ignores extra keys on later rows (uses only first-object keys)', () => {
    const input = [
      { a: 1, b: 2 },
      { a: 3, b: 4, c: 5 },
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,2');
    expect(lines[2]).toBe('3,4');
  });

  it('handles string values with commas and preserves them (no escaping)', () => {
    const input = [
      { city: 'New York, NY', code: 'NYC' },
      { city: 'Los Angeles', code: 'LA' },
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('city,code');
    expect(lines[1]).toBe('New York, NY,NYC');
    expect(lines[2]).toBe('Los Angeles,LA');
  });

  it('throws if given an empty array', () => {
    expect(() => jsonToCSV([])).toThrow();
  });

  it('throws if a value is null or undefined', () => {
    const input = [{ x: null, y: undefined }];
    expect(() => jsonToCSV(input)).toThrow();
  });
});
