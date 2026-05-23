import { useCallback } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';

export function useHistory() {
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const performUndo = useCanvasStore((state) => state.undo);
  const performRedo = useCanvasStore((state) => state.redo);
  const historyIndex = useCanvasStore((state) => state.historyIndex);
  const history = useCanvasStore((state) => state.history);

  // Guarda una captura de pantalla del canvas
  const saveHistory = useCallback(
    (canvas: HTMLCanvasElement) => {
      const dataUrl = canvas.toDataURL();
      pushHistory(dataUrl);
    },
    [pushHistory],
  );

  // Carga un estado específico de la historia en el canvas
  const loadHistoryState = useCallback(
    (canvas: HTMLCanvasElement, dataUrl: string) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Limpiar lienzo
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Rellenar con color transparente / blanco de fondo (el dibujo está encima)
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    },
    [],
  );

  // Deshace una acción
  const undo = useCallback(
    (canvas: HTMLCanvasElement) => {
      const res = performUndo();
      if (res.success && res.dataUrl) {
        loadHistoryState(canvas, res.dataUrl);
        return true;
      }
      return false;
    },
    [performUndo, loadHistoryState],
  );

  // Rehace una acción
  const redo = useCallback(
    (canvas: HTMLCanvasElement) => {
      const res = performRedo();
      if (res.success && res.dataUrl) {
        loadHistoryState(canvas, res.dataUrl);
        return true;
      }
      return false;
    },
    [performRedo, loadHistoryState],
  );

  return {
    saveHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1 && history.length > 0,
  };
}
