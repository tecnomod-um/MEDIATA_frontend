// eslint-disable-next-line import/no-commonjs
jest.mock('distinct-colors', () => jest.fn());
// eslint-disable-next-line import/no-commonjs
const distinctColors = require('distinct-colors');
// eslint-disable-next-line import/no-commonjs
const { generateDistinctColors, darkenColor, lightenColor } = require('./colors.js');


describe('generateDistinctColors', () => {
  it('should call distinctColors with correct parameters', () => {
    const mockColors = [{ hex: () => '#FF0000' }, { hex: () => '#00FF00' }];
    distinctColors.mockReturnValue(mockColors);

    const result = generateDistinctColors(2);

    expect(distinctColors).toHaveBeenCalledWith({
      count: 2,
      chromaMin: 15,
      chromaMax: 95,
      lightMin: 65,
      lightMax: 90
    });
    expect(result).toEqual(['#FF0000', '#00FF00']);
  });

  it('should return empty array for count 0', () => {
    distinctColors.mockReturnValue([]);
    expect(generateDistinctColors(0)).toEqual([]);
  });

  it('should handle negative count', () => {
    distinctColors.mockReturnValue([]);
    expect(generateDistinctColors(-5)).toEqual([]);
  });
});

describe('darkenColor', () => {
  it('should correctly darken colors', () => {
    expect(darkenColor('#808080', 50)).toBe('#ffffff');
    expect(darkenColor('#010101', 100)).toBe('#ffffff');
    expect(darkenColor('#FFFFFF', 0)).toBe('#ffffff');
    expect(darkenColor('#808080', 0)).toBe('#808080');
    expect(darkenColor('#808080', 100)).toBe('#ffffff');
    expect(darkenColor('#FF8000', 40)).toBe('#ffe666');
  });
});

describe('lightenColor', () => {
  it('should correctly lighten colors', () => {
    expect(lightenColor('#808080', 50)).toBe('#ffffff');
    expect(lightenColor('#FFFFFE', 1)).toBe('#ffffff');
    expect(lightenColor('#000000', 0)).toBe('#000000');
    expect(lightenColor('#808080', 0)).toBe('#808080');
    expect(lightenColor('#000000', 100)).toBe('#ffffff');
    expect(lightenColor('#008000', 50)).toBe('#7fff7f');
  });

  it('should handle non-hex colors', () => {
    expect(lightenColor('rgb(0,0,0)', 20)).toBe('rgb(0,0,0)');
    expect(lightenColor('blue', 30)).toBe('blue');
  });
});

describe('Color Adjustment Behavior', () => {
  it('darkenColor actually adds brightness with positive percentages', () => {
    expect(darkenColor('#000000', 100)).toBe('#ffffff');
  });

  it('lightenColor adds brightness with positive percentages', () => {
    expect(lightenColor('#000000', 100)).toBe('#ffffff');
  });

  it('can "darken" using negative percentages', () => {
    expect(darkenColor('#808080', -50)).toBe('#010101');
  });
});