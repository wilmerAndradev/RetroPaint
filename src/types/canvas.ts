export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  dataUrl: string; // base64 representation of raster data
}

export interface CanvasDimensions {
  width: number;
  height: number;
}
