import { describe, expect, test, vi } from 'vitest';
import { floodFill } from './floodFill';

// Helper to create a mock canvas of specified dimensions and preset pixel data
function createMockCanvas(
  width: number,
  height: number,
  initialPixels: number[],
) {
  // initialPixels is expected to be RGBA array of length width * height * 4
  const data = new Uint8ClampedArray(initialPixels);
  const mockImageData = {
    width,
    height,
    data,
  } as unknown as ImageData;

  const mockCtx = {
    getImageData: vi.fn().mockReturnValue(mockImageData),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const mockCanvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(mockCtx),
  } as unknown as HTMLCanvasElement;

  return {
    canvas: mockCanvas,
    ctx: mockCtx,
    data,
  };
}

describe('Flood Fill Algorithm', () => {
  test('fills a simple solid color 2x2 grid completely', () => {
    // 2x2 white grid (#ffffff)
    const initialPixels = [
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255,
    ];

    const { canvas, ctx, data } = createMockCanvas(2, 2, initialPixels);

    // Fill with blue #0000ff starting from (0,0)
    floodFill(canvas, 0, 0, '#0000ff', 0);

    // Verify all pixels are now blue
    const expectedPixels = [
      0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255,
    ];

    expect(Array.from(data)).toEqual(expectedPixels);
    expect(ctx.putImageData).toHaveBeenCalled();
  });

  test('fills only connected pixels and stops at boundary colors', () => {
    // 3x3 grid with a vertical border of black in the middle column
    // Left: white, Middle: black, Right: white
    const initialPixels = [
      255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255,
      255, 255, 255,
    ];

    const { canvas, data } = createMockCanvas(3, 3, initialPixels);

    // Fill left side with blue #0000ff starting from (0,0)
    floodFill(canvas, 0, 0, '#0000ff', 0);

    // Verify left column is blue, middle column is black, right column is white
    const expectedPixels = [
      0, 0, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 255, 255, 0, 0, 0,
      255, 255, 255, 255, 255, 0, 0, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
    ];

    expect(Array.from(data)).toEqual(expectedPixels);
  });

  test('respects color tolerance bounds', () => {
    // 2x1 grid: pixel 0 is white (#ffffff), pixel 1 is light grey (#f0f0f0)
    // Diff is small: dr=15, dg=15, db=15 -> Euclid dist ~ 26
    const initialPixels = [255, 255, 255, 255, 240, 240, 240, 255];

    // Scenario A: Tolerance = 0 (should only fill pixel 0)
    {
      const { canvas, data } = createMockCanvas(2, 1, initialPixels);
      floodFill(canvas, 0, 0, '#0000ff', 0);
      expect(data[0]).toBe(0); // blue
      expect(data[2]).toBe(255); // blue
      expect(data[4]).toBe(240); // unchanged light grey
    }

    // Scenario B: Tolerance = 30 (should fill BOTH pixels since dist ~ 26 <= 30)
    {
      const { canvas, data } = createMockCanvas(2, 1, initialPixels);
      floodFill(canvas, 0, 0, '#0000ff', 30);
      expect(data[0]).toBe(0); // blue
      expect(data[2]).toBe(255); // blue
      expect(data[4]).toBe(0); // filled blue
      expect(data[6]).toBe(255); // filled blue
    }
  });

  test('exits early if start pixel is already the destination color', () => {
    // 1x1 blue grid
    const initialPixels = [0, 0, 255, 255];
    const { canvas, ctx } = createMockCanvas(1, 1, initialPixels);

    // Try to fill with blue again
    floodFill(canvas, 0, 0, '#0000ff', 0);

    // Verify context was NOT written to since it exited early
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });
});
