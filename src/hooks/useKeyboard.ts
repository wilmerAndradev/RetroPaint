import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ToolType } from '../types/tools';
import { exportPNG } from '../utils/exportCanvas';

interface KeyboardHookProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  undo: () => void;
  redo: () => void;
}

export function useKeyboard({ canvasRef, undo, redo }: KeyboardHookProps) {
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const setStatusText = useAppStore((state) => state.setStatusText);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar atajos si el foco está en un input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl + Z (Deshacer)
      if (isCtrl && key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl + Y (Rehacer)
      if (isCtrl && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl + S (Guardar PNG)
      if (isCtrl && key === 's') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          exportPNG(canvas, 'retro-paint-export');
          setStatusText('Dibujo exportado a PNG');
        }
        return;
      }

      // Space (Barra espaciadora para paneo)
      if (e.key === ' ') {
        e.preventDefault();
        useAppStore.getState().setIsSpacePressed(true);
        return;
      }

      // Zoom in (+) y Zoom out (-)
      if (key === '+' || key === '=') {
        e.preventDefault();
        setZoom(zoom + 25);
        setStatusText(`Zoom: ${zoom + 25}%`);
        return;
      }
      if (key === '-') {
        e.preventDefault();
        setZoom(zoom - 25);
        setStatusText(`Zoom: ${zoom - 25}%`);
        return;
      }

      // Ctrl + 0 o tecla 0 (Restaurar zoom a 100%)
      if ((isCtrl && key === '0') || key === '0') {
        e.preventDefault();
        setZoom(100);
        setStatusText('Zoom restaurado a 100%');
        return;
      }

      // X (Intercambiar colores frontal/fondo)
      if (key === 'x') {
        e.preventDefault();
        useAppStore.getState().swapColors();
        setStatusText('Colores intercambiados');
        return;
      }

      // [ (Reducir tamaño del pincel)
      if (key === '[') {
        e.preventDefault();
        const currentSize = useAppStore.getState().brushSize;
        let newSize: 1 | 3 | 6 = 1;
        if (currentSize === 6) newSize = 3;
        else if (currentSize === 3) newSize = 1;
        useAppStore.getState().setBrushSize(newSize);
        setStatusText(`Tamaño del pincel: ${newSize}px`);
        return;
      }

      // ] (Aumentar tamaño del pincel)
      if (key === ']') {
        e.preventDefault();
        const currentSize = useAppStore.getState().brushSize;
        let newSize: 1 | 3 | 6 = 6;
        if (currentSize === 1) newSize = 3;
        else if (currentSize === 3) newSize = 6;
        useAppStore.getState().setBrushSize(newSize);
        setStatusText(`Tamaño del pincel: ${newSize}px`);
        return;
      }

      // H (Alternar relleno de formas)
      if (key === 'h') {
        e.preventDefault();
        const fill = useAppStore.getState().fillShapes;
        useAppStore.getState().setFillShapes(!fill);
        setStatusText(`Relleno de formas: ${!fill ? 'SÍ' : 'NO'}`);
        return;
      }

      // Atajos de cambio de herramienta
      let matchedTool: ToolType | null = null;
      switch (key) {
        case 'p':
          matchedTool = 'pencil';
          break;
        case 'b':
          matchedTool = 'brush';
          break;
        case 'e':
          matchedTool = 'eraser';
          break;
        case 'f':
          matchedTool = 'bucket';
          break;
        case 'i':
          matchedTool = 'eyedropper';
          break;
        case 't':
          matchedTool = 'text';
          break;
        case 'l':
          matchedTool = 'line';
          break;
        case 'r':
          matchedTool = 'rectangle';
          break;
        case 'o':
          matchedTool = 'ellipse';
          break;
        case 's':
          matchedTool = 'select';
          break;
        case 'a':
          matchedTool = 'spray';
          break;
        case 'c':
          matchedTool = 'bezier';
          break;
        case 'g':
          matchedTool = 'polygon';
          break;
        default:
          break;
      }

      if (matchedTool) {
        e.preventDefault();
        setActiveTool(matchedTool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        useAppStore.getState().setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvasRef, undo, redo, zoom, setZoom, setActiveTool, setStatusText]);
}
