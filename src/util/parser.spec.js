import { jsonToCSV, parseJson, parseJsonObject } from './parser';

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

  it('converts null and undefined to strings', () => {
    const input = [{ x: null, y: undefined }];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('x,y');
    expect(lines[1]).toBe('null,undefined');
  });

  it('handles empty strings as values', () => {
    const input = [{ name: '', value: '' }];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,value');
    expect(lines[1]).toBe(',');
  });

  it('handles single column data', () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id');
    expect(lines[1]).toBe('1');
    expect(lines[2]).toBe('2');
    expect(lines[3]).toBe('3');
  });

  it('handles objects with numeric keys', () => {
    const input = [{ 0: 'a', 1: 'b' }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('0,1');
    expect(csv).toContain('a,b');
  });

  it('handles special characters in keys', () => {
    const input = [{ 'key-with-dash': 1, 'key_with_underscore': 2 }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('key-with-dash');
    expect(csv).toContain('key_with_underscore');
  });

  it('handles very long strings', () => {
    const longString = 'a'.repeat(1000);
    const input = [{ data: longString }];
    const csv = jsonToCSV(input);
    expect(csv).toContain(longString);
  });

  it('handles objects with many keys', () => {
    const obj = {};
    for (let i = 0; i < 50; i++) {
      obj[`key${i}`] = i;
    }
    const input = [obj];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0].split(',').length).toBe(50);
  });

  it('handles mixed data types in same column', () => {
    const input = [
      { value: 123 },
      { value: 'text' },
      { value: true }
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('123');
    expect(lines[2]).toBe('text');
    expect(lines[3]).toBe('true');
  });

  it('handles objects with same keys in different order', () => {
    const input = [
      { a: 1, b: 2, c: 3 },
      { c: 6, a: 4, b: 5 }
    ];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,b,c');
    expect(lines[1]).toBe('1,2,3');
    expect(lines[2]).toBe('4,5,6');
  });

  it('handles zero as a valid value', () => {
    const input = [{ count: 0, flag: false }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('0');
    expect(csv).toContain('false');
  });

  it('handles negative numbers', () => {
    const input = [{ value: -123, decimal: -45.67 }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('-123');
    expect(csv).toContain('-45.67');
  });

  it('handles scientific notation', () => {
    const input = [{ value: 1e10 }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('10000000000');
  });

  it('handles unicode characters', () => {
    const input = [{ text: '你好世界', emoji: '😀' }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('你好世界');
    expect(csv).toContain('😀');
  });

  it('preserves newlines in values', () => {
    const input = [{ text: 'line1\nline2' }];
    const csv = jsonToCSV(input);
    expect(csv).toContain('line1\nline2');
  });

  it('handles single row with multiple columns', () => {
    const input = [{ a: 1, b: 2, c: 3, d: 4, e: 5 }];
    const csv = jsonToCSV(input);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,b,c,d,e');
    expect(lines[1]).toBe('1,2,3,4,5');
  });
});

describe('parseJson', () => {
  it('parses valid JSON string', () => {
    const result = parseJson('{"name": "John", "age": 30}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ name: 'John', age: 30 });
  });

  it('parses JSON array', () => {
    const result = parseJson('[1, 2, 3]');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('parses JSON primitives', () => {
    expect(parseJson('true').value).toBe(true);
    expect(parseJson('false').value).toBe(false);
    expect(parseJson('null').value).toBe(null);
    expect(parseJson('123').value).toBe(123);
    expect(parseJson('"string"').value).toBe('string');
  });

  it('returns fallback for empty string', () => {
    const result = parseJson('', 'default-value');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('default-value');
  });

  it('returns fallback for whitespace-only string', () => {
    const result = parseJson('   ', 'default');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('default');
  });

  it('handles null input', () => {
    const result = parseJson(null, 'fallback');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('fallback');
  });

  it('handles undefined input', () => {
    const result = parseJson(undefined, 'fallback');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('fallback');
  });

  it('returns error object for invalid JSON', () => {
    const result = parseJson('not valid json');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for incomplete JSON', () => {
    const result = parseJson('{"incomplete":');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('trims whitespace before parsing', () => {
    const result = parseJson('  {"trimmed": true}  ');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ trimmed: true });
  });
});

describe('parseJsonObject', () => {
  it('parses valid JSON object', () => {
    const result = parseJsonObject('{"name": "Alice"}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ name: 'Alice' });
  });

  it('returns empty object fallback for empty string when allowEmpty is true', () => {
    const result = parseJsonObject('', { allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({});
  });

  it('returns error for empty string when allowEmpty is false', () => {
    const result = parseJsonObject('', { allowEmpty: false });
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('Empty JSON');
  });

  it('returns custom fallback for empty string', () => {
    const fallback = { default: 'object' };
    const result = parseJsonObject('', { fallback, allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.value).toBe(fallback);
  });

  it('returns error for JSON array', () => {
    const result = parseJsonObject('[1, 2, 3]');
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('Not a JSON object');
  });

  it('returns error for JSON primitives', () => {
    expect(parseJsonObject('true').ok).toBe(false);
    expect(parseJsonObject('123').ok).toBe(false);
    expect(parseJsonObject('"string"').ok).toBe(false);
    expect(parseJsonObject('null').ok).toBe(false);
  });

  it('returns error for invalid JSON', () => {
    const result = parseJsonObject('not valid');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles null input with fallback', () => {
    const result = parseJsonObject(null, { allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({});
  });

  it('handles undefined input with fallback', () => {
    const result = parseJsonObject(undefined, { allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({});
  });

  it('handles whitespace-only string', () => {
    const result = parseJsonObject('   ', { allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({});
  });

  it('trims whitespace before parsing', () => {
    const result = parseJsonObject('  {"trimmed": true}  ');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ trimmed: true });
  });

  it('handles nested objects', () => {
    const result = parseJsonObject('{"outer": {"inner": "value"}}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ outer: { inner: 'value' } });
  });

  it('uses default options when options not provided', () => {
    const result = parseJsonObject('{"test": "value"}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ test: 'value' });
  });
});

