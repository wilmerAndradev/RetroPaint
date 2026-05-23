import { hexToRgb } from './colors';

/**
 * Algoritmo Flood Fill optimizado (cola BFS de una dimensión) para rellenar áreas
 */
export function floodFill(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 30,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Prevenir coordenadas fuera de los límites
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const fillColor = hexToRgb(fillColorHex);
  if (!fillColor) return;

  const targetIndex = (startY * width + startX) * 4;
  const targetR = data[targetIndex];
  const targetG = data[targetIndex + 1];
  const targetB = data[targetIndex + 2];
  const targetA = data[targetIndex + 3];

  const fillR = fillColor.r;
  const fillG = fillColor.g;
  const fillB = fillColor.b;
  const fillA = 255;

  // Si el píxel de inicio ya tiene el color de destino exacto, salir para evitar bucles
  if (
    targetR === fillR &&
    targetG === fillG &&
    targetB === fillB &&
    targetA === fillA
  ) {
    return;
  }

  // Usamos una cola numérica plana (X e Y alternados) para evitar reservar millones de objetos
  const queue: number[] = [startX, startY];
  const visited = new Uint8Array(width * height);
  visited[startY * width + startX] = 1;

  let head = 0;

  // Distancia del color con tolerancia
  const matchColor = (r: number, g: number, b: number, a: number): boolean => {
    if (tolerance === 0) {
      return r === targetR && g === targetG && b === targetB && a === targetA;
    }
    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const da = a - targetA;
    // Distancia Euclidiana
    const diff = Math.sqrt(dr * dr + dg * dg + db * db + da * da);
    return diff <= tolerance;
  };

  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    const idx = (y * width + x) * 4;

    // Pintar píxel
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;

    // Comprobar 4 direcciones adyacentes
    const dirs = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const nx = dirs[i][0];
      const ny = dirs[i][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const vIdx = ny * width + nx;
        if (visited[vIdx] === 0) {
          const nIdx = vIdx * 4;
          const nr = data[nIdx];
          const ng = data[nIdx + 1];
          const nb = data[nIdx + 2];
          const na = data[nIdx + 3];

          if (matchColor(nr, ng, nb, na)) {
            visited[vIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
