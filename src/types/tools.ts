export type ToolType =
  | 'select'
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'text'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'bezier'
  | 'polygon'
  | 'spray';

export type BrushStyle = 'normal' | 'watercolor' | 'chalk' | 'spray' | 'pixel';

export interface ToolPropertySettings {
  brushSize: 1 | 3 | 6;
  opacity: number; // 0 a 1
  fillShapes: boolean;
  smoothing: boolean;
  softEdges: boolean;
  brushStyle: BrushStyle;
}
