import { describe, expect, test } from 'vitest';
import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
} from './colors';

describe('Color Utilities', () => {
  describe('hexToRgb', () => {
    test('converts classic 6-digit hex color correctly', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#1e3a8a')).toEqual({ r: 30, g: 58, b: 138 });
    });

    test('converts 3-digit shorthand hex color correctly', () => {
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    test('returns null for invalid hex strings', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#12345')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    test('converts rgb to hex correctly', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(30, 58, 138)).toBe('#1e3a8a');
    });

    test('clamps rgb component values outside bounds', () => {
      expect(rgbToHex(-10, 300, 150)).toBe('#00ff96');
    });
  });

  describe('rgbToHsl', () => {
    test('converts rgb to hsl correctly', () => {
      // Red
      expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
      // White
      expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
      // Black
      expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
    });
  });

  describe('hslToRgb', () => {
    test('converts hsl to rgb correctly', () => {
      // Red
      expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
      // White
      expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
      // Black
      expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('hexToHsl & hslToHex', () => {
    test('converts back and forth seamlessly with expected precision rounding', () => {
      expect(hexToHsl('#1e3a8a')).toEqual({ h: 224, s: 64, l: 33 });
      expect(hslToHex(224, 64, 33)).toBe('#1e3b8a');
    });
  });
});
