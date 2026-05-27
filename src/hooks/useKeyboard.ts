import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import type { ToolType } from '../types/tools';
import { exportPNG } from '../utils/exportCanvas';

interface KeyboardHookProps {
  undo: () => void;
  redo: () => void;
  cancelActiveOperation: () => void;
  copySelection?: () => void;
  cutSelection?: () => void;
  pasteSelection?: () => void;
  deleteSelection?: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  selectAll?: () => void;
  deselect?: () => void;
  openImageFile?: () => void;
  pasteFromClipboard?: () => void;
}

export function useKeyboard({
  undo,
  redo,
  cancelActiveOperation,
  copySelection,
  cutSelection,
  pasteSelection,
  deleteSelection,
  canvasRef,
  selectAll,
  deselect,
  openImageFile,
  pasteFromClipboard,
}: KeyboardHookProps) {
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const setStatusText = useAppStore((state) => state.setStatusText);

  const previousToolRef = useRef<ToolType | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Escape (Cancelar operación en curso - Debe funcionar incluso si un input/textarea está activo)
      if (key === 'escape') {
        e.preventDefault();
        cancelActiveOperation();

        // Quitar el foco de cualquier input/textarea activo
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          document.activeElement.blur();
        }
        return;
      }

      // Ignorar atajos si el foco está en un input o textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Alt (Activar cuentagotas temporal)
      if (e.key === 'Alt') {
        e.preventDefault();
        if (previousToolRef.current === null) {
          const activeTool = useAppStore.getState().activeTool;
          if (activeTool !== 'eyedropper') {
            previousToolRef.current = activeTool;
            setActiveTool('eyedropper');
            setStatusText(
              'Cuentagotas temporal activo (suelta Alt para regresar)',
            );
          }
        }
        return;
      }

      // Ctrl + Shift + Z (Rehacer alternativo)
      if (isCtrl && e.shiftKey && key === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl + Z (Deshacer)
      if (isCtrl && !e.shiftKey && key === 'z') {
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

      // Ctrl + S (Descarga directa o Exportar Avanzado con Shift)
      if (isCtrl && key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          useAppStore.getState().setIsExportModalOpen(true);
        } else {
          const canvas = canvasRef?.current;
          if (canvas) {
            exportPNG(canvas, 'retropaint-dibujo');
            setStatusText('Dibujo descargado directamente como PNG');
          }
        }
        return;
      }

      // Ctrl + A (Seleccionar todo)
      if (isCtrl && key === 'a') {
        e.preventDefault();
        if (selectAll) {
          selectAll();
        }
        return;
      }

      // Ctrl + D (Deseleccionar)
      if (isCtrl && key === 'd') {
        e.preventDefault();
        if (deselect) {
          deselect();
        }
        return;
      }

      // Ctrl + G (Alternar cuadrícula visual)
      if (isCtrl && key === 'g') {
        e.preventDefault();
        useCanvasStore.getState().toggleGrid();
        setStatusText(
          `Cuadrícula visual: ${useCanvasStore.getState().showGrid ? 'ACTIVADA' : 'DESACTIVADA'}`,
        );
        return;
      }

      // Ctrl + R (Alternar reglas de coordenadas)
      if (isCtrl && key === 'r') {
        e.preventDefault();
        useCanvasStore.getState().toggleRulers();
        setStatusText(
          `Reglas de coordenadas: ${useCanvasStore.getState().showRulers ? 'MOSTRADAS' : 'OCULTAS'}`,
        );
        return;
      }

      // Ctrl + O (Abrir imagen)
      if (isCtrl && key === 'o') {
        e.preventDefault();
        if (openImageFile) {
          openImageFile();
        }
        return;
      }

      // Ctrl + N (Nuevo lienzo)
      if (isCtrl && key === 'n') {
        e.preventDefault();
        useAppStore.getState().setIsNewCanvasModalOpen(true);
        return;
      }

      // F1 o Ctrl + H (Ayuda / Atajos)
      if (e.key === 'F1' || (isCtrl && key === 'h')) {
        e.preventDefault();
        useAppStore.getState().setIsShortcutsModalOpen(true);
        return;
      }

      // Ctrl + C (Copiar selección)
      if (isCtrl && key === 'c') {
        if (copySelection) {
          e.preventDefault();
          copySelection();
          setStatusText('Selección copiada');
        }
        return;
      }

      // Ctrl + X (Cortar selección)
      if (isCtrl && key === 'x') {
        if (cutSelection) {
          e.preventDefault();
          cutSelection();
          setStatusText('Selección cortada');
        }
        return;
      }

      // Ctrl + V (Pegar selección)
      if (isCtrl && key === 'v') {
        e.preventDefault();
        if (pasteFromClipboard) {
          pasteFromClipboard();
        } else if (pasteSelection) {
          pasteSelection();
          setStatusText('Selección pegada');
        }
        return;
      }

      // Delete (Borrar selección)
      if (key === 'delete') {
        if (deleteSelection) {
          e.preventDefault();
          deleteSelection();
          setStatusText('Selección borrada');
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

      // NO procesar atajos simples de una sola tecla si Ctrl está pulsado
      if (isCtrl) {
        return;
      }

      // X (Intercambiar colores frontal/fondo)
      if (key === 'x') {
        e.preventDefault();
        useAppStore.getState().swapColors();
        setStatusText('Colores intercambiados');
        return;
      }

      // D (Restaurar colores por defecto)
      if (key === 'd') {
        e.preventDefault();
        useAppStore.getState().setFgColor('#000000');
        useAppStore.getState().setBgColor('#ffffff');
        setStatusText('Colores restaurados por defecto (Negro / Blanco)');
        return;
      }

      // [ (Reducir tamaño del pincel libremente con Shift)
      if (key === '[') {
        e.preventDefault();
        const currentSize = useAppStore.getState().brushSize;
        const decrement = e.shiftKey ? 10 : 1;
        const newSize = Math.max(1, currentSize - decrement);
        useAppStore.getState().setBrushSize(newSize);
        setStatusText(`Tamaño del pincel: ${newSize}px`);
        return;
      }

      // ] (Aumentar tamaño del pincel libremente con Shift)
      if (key === ']') {
        e.preventDefault();
        const currentSize = useAppStore.getState().brushSize;
        const increment = e.shiftKey ? 10 : 1;
        const newSize = Math.min(200, currentSize + increment);
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
        case 'n':
          matchedTool = 'pencil';
          break;
        case 'b':
          matchedTool = 'brush';
          break;
        case 'e':
          matchedTool = 'eraser';
          break;
        case 'g':
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
        case 'u':
          matchedTool = 'rectangle';
          break;
        case 'o':
          matchedTool = 'ellipse';
          break;
        case 'v':
          matchedTool = 'move';
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
        case 'p':
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
      if (e.key === 'Alt') {
        e.preventDefault();
        if (previousToolRef.current !== null) {
          setActiveTool(previousToolRef.current);
          setStatusText(
            `Herramienta restaurada: ${previousToolRef.current.toUpperCase()}`,
          );
          previousToolRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    undo,
    redo,
    zoom,
    setZoom,
    setActiveTool,
    setStatusText,
    cancelActiveOperation,
    copySelection,
    cutSelection,
    pasteSelection,
    deleteSelection,
    canvasRef,
    selectAll,
    deselect,
    pasteFromClipboard,
    openImageFile,
  ]);
}
