/**
 * Exporta el canvas completo a diferentes formatos de imagen.
 */

export function exportPNG(
  canvas: HTMLCanvasElement,
  filename = 'retro-paint',
): void {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    triggerDownload(dataUrl, `${filename}.png`);
  } catch (error) {
    console.error('Error al exportar a PNG:', error);
  }
}

export function exportWEBP(
  canvas: HTMLCanvasElement,
  filename = 'retro-paint',
  quality = 0.9,
): void {
  try {
    const dataUrl = canvas.toDataURL('image/webp', quality);
    triggerDownload(dataUrl, `${filename}.webp`);
  } catch (error) {
    console.error('Error al exportar a WEBP:', error);
  }
}

export function exportJPEG(
  canvas: HTMLCanvasElement,
  filename = 'retro-paint',
  quality = 0.95,
): void {
  try {
    // Para exportar a JPEG, necesitamos asegurar que el fondo transparente se dibuje blanco,
    // de lo contrario, se renderizará negro por defecto.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      // Fondo blanco
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      // Dibujar canvas original
      tempCtx.drawImage(canvas, 0, 0);

      const dataUrl = tempCanvas.toDataURL('image/jpeg', quality);
      triggerDownload(dataUrl, `${filename}.jpg`);
    }
  } catch (error) {
    console.error('Error al exportar a JPEG:', error);
  }
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
