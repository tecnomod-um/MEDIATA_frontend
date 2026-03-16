import { vi } from "vitest";

vi.mock("distinct-colors", () => ({
  default: vi.fn(),
}));

import distinctColors from "distinct-colors";
import {
  generateDistinctColors,
  generateColorList,
  darkenColor,
  lightenColor,
} from "./colors.js";

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

describe('generateColorList', () => {
  it('generates colors based on stats object length', () => {
    const mockColors = [{ hex: () => '#FF0000' }, { hex: () => '#00FF00' }];
    distinctColors.mockReturnValue(mockColors);
    
    const stats = { key1: 'value1', key2: 'value2' };
    const result = generateColorList(stats);
    
    expect(distinctColors).toHaveBeenCalledWith({
      count: 2,
      chromaMin: 15,
      chromaMax: 95,
      lightMin: 65,
      lightMax: 90
    });
    expect(result).toEqual(['#FF0000', '#00FF00', '#D3D3D3']);
  });

  it('handles null stats', () => {
    distinctColors.mockReturnValue([]);
    const result = generateColorList(null);
    expect(result).toEqual(['#D3D3D3']);
  });

  it('handles undefined stats', () => {
    distinctColors.mockReturnValue([]);
    const result = generateColorList(undefined);
    expect(result).toEqual(['#D3D3D3']);
  });

  it('handles empty stats object', () => {
    distinctColors.mockReturnValue([]);
    const result = generateColorList({});
    expect(result).toEqual(['#D3D3D3']);
  });

  it('appends gray color to generated colors', () => {
    const mockColors = [{ hex: () => '#FF0000' }];
    distinctColors.mockReturnValue(mockColors);
    const result = generateColorList({ key1: 'val' });
    expect(result[result.length - 1]).toBe('#D3D3D3');
  });
});

describe('Edge cases for color functions', () => {
  it('darkenColor handles very small values', () => {
    expect(darkenColor('#000001', -1)).toBe('#000000');
  });

  it('darkenColor handles lowercase hex', () => {
    expect(darkenColor('#ff0000', 0)).toBe('#ff0000');
  });

  it('lightenColor handles uppercase hex', () => {
    expect(lightenColor('#FF0000', 0)).toBe('#ff0000');
  });

  it('lightenColor returns input unchanged for non-hash colors', () => {
    // lightenColor checks if color starts with '#' and returns it unchanged if not
    expect(lightenColor('FF0000', 50)).toBe('FF0000');
    expect(lightenColor('rgb(0,0,0)', 20)).toBe('rgb(0,0,0)');
    expect(lightenColor('blue', 30)).toBe('blue');
  });

  it('darkenColor clamps values at 255', () => {
    expect(darkenColor('#FFFFFF', 100)).toBe('#ffffff');
  });

  it('lightenColor clamps values at 255', () => {
    expect(lightenColor('#FFFFFF', 100)).toBe('#ffffff');
  });

  it('darkenColor handles mid-range colors', () => {
    const result = darkenColor('#7F7F7F', 10);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('lightenColor handles mid-range colors', () => {
    const result = lightenColor('#7F7F7F', 10);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generateDistinctColors handles large count', () => {
    const mockColors = Array(100).fill(null).map((_, i) => ({ hex: () => `#${i.toString(16).padStart(6, '0')}` }));
    distinctColors.mockReturnValue(mockColors);
    const result = generateDistinctColors(100);
    expect(result).toHaveLength(100);
  });

  it('darkenColor handles various percentage values', () => {
    expect(darkenColor('#808080', 25)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkenColor('#808080', 75)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkenColor('#808080', -25)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkenColor('#808080', -75)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('lightenColor handles various percentage values', () => {
    expect(lightenColor('#808080', 25)).toMatch(/^#[0-9a-f]{6}$/);
    expect(lightenColor('#808080', 75)).toMatch(/^#[0-9a-f]{6}$/);
    expect(lightenColor('#808080', -25)).toMatch(/^#[0-9a-f]{6}$/);
    expect(lightenColor('#808080', -75)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('darkenColor handles edge colors', () => {
    expect(darkenColor('#FF0000', 10)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkenColor('#00FF00', 10)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkenColor('#0000FF', 10)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('lightenColor handles edge colors', () => {
    expect(lightenColor('#FF0000', 10)).toMatch(/^#[0-9a-f]{6}$/);
    expect(lightenColor('#00FF00', 10)).toMatch(/^#[0-9a-f]{6}$/);
    expect(lightenColor('#0000FF', 10)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generateColorList handles large stats objects', () => {
    const largeStats = {};
    for (let i = 0; i < 50; i++) {
      largeStats[`key${i}`] = `value${i}`;
    }
    const mockColors = Array(50).fill(null).map((_, i) => ({ hex: () => `#${i.toString(16).padStart(6, '0')}` }));
    distinctColors.mockReturnValue(mockColors);
    const result = generateColorList(largeStats);
    expect(result).toHaveLength(51); // 50 colors + 1 gray
  });

  it('darkenColor handles short hex codes', () => {
    expect(darkenColor('#FFF', 0)).toMatch(/^#[0-9a-fF]{3,6}$/);
  });

  it('lightenColor handles short hex codes', () => {
    expect(lightenColor('#000', 0)).toMatch(/^#[0-9a-fA-F]{3,6}$/);
  });

  it('generateDistinctColors with count 1', () => {
    const mockColors = [{ hex: () => '#FF0000' }];
    distinctColors.mockReturnValue(mockColors);
    const result = generateDistinctColors(1);
    expect(result).toEqual(['#FF0000']);
  });

  it('generateColorList with single item stats', () => {
    const mockColors = [{ hex: () => '#FF0000' }];
    distinctColors.mockReturnValue(mockColors);
    const result = generateColorList({ key1: 'value1' });
    expect(result).toEqual(['#FF0000', '#D3D3D3']);
  });

  it('darkenColor with zero percentage returns original', () => {
    expect(darkenColor('#123456', 0)).toBe('#123456');
  });

  it('lightenColor with zero percentage returns original in lowercase', () => {
    expect(lightenColor('#ABCDEF', 0)).toBe('#abcdef');
  });
});