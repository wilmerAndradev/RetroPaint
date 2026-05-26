import { create } from 'zustand';

interface CanvasState {
  width: number;
  height: number;
  resizeMode: 'center' | 'top-left' | 'clean';
  history: string[];
  historyLabels: string[]; // Array de etiquetas descriptivas (ej: "Lienzo Inicial", "Lápiz", etc.)
  historyIndex: number;

  // Nuevos estados Sprint 3
  canvasBackground: 'white' | 'black' | 'transparent';
  showGrid: boolean;
  gridSize: number;
  showRulers: boolean;

  activeSelection: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  fillTolerance: number;

  // Acciones
  setDimensions: (
    width: number,
    height: number,
    mode?: 'center' | 'top-left' | 'clean',
  ) => void;
  setHistory: (history: string[], index: number, labels?: string[]) => void;
  pushHistory: (dataUrl: string, label?: string) => void;
  undo: () => { success: boolean; dataUrl?: string };
  redo: () => { success: boolean; dataUrl?: string };
  setActiveSelection: (
    selection: { x: number; y: number; width: number; height: number } | null,
  ) => void;
  setFillTolerance: (tolerance: number) => void;
  resetCanvasStore: () => void;

  // Nuevas acciones Sprint 3
  setCanvasBackground: (bg: 'white' | 'black' | 'transparent') => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  toggleRulers: () => void;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  resizeMode: 'center',
  history: [],
  historyLabels: [],
  historyIndex: -1,
  activeSelection: null,
  fillTolerance: 30,

  canvasBackground: 'white',
  showGrid: false,
  gridSize: 16,
  showRulers: true,

  setDimensions: (width, height, mode = 'center') =>
    set({ width, height, resizeMode: mode }),

  setHistory: (history, index, labels = []) =>
    set({ history, historyIndex: index, historyLabels: labels }),

  pushHistory: (dataUrl, label = 'Acción') => {
    const { history, historyIndex, historyLabels } = get();
    // Elimina estados futuros si estábamos en medio de un deshacer
    const truncatedHistory = history.slice(0, historyIndex + 1);
    const truncatedLabels = historyLabels.slice(0, historyIndex + 1);

    // Máximo 50 estados en memoria
    const newHistory = [...truncatedHistory, dataUrl];
    const newLabels = [...truncatedLabels, label];
    if (newHistory.length > 50) {
      newHistory.shift();
      newLabels.shift();
    }

    set({
      history: newHistory,
      historyLabels: newLabels,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ historyIndex: newIndex });
      return { success: true, dataUrl: history[newIndex] };
    }
    return { success: false };
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ historyIndex: newIndex });
      return { success: true, dataUrl: history[newIndex] };
    }
    return { success: false };
  },

  setActiveSelection: (selection) => set({ activeSelection: selection }),

  setFillTolerance: (tolerance) => set({ fillTolerance: tolerance }),

  setCanvasBackground: (bg) => set({ canvasBackground: bg }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGridSize: (size) => set({ gridSize: size }),
  toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),

  resetCanvasStore: () =>
    set({
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      resizeMode: 'center',
      history: [],
      historyLabels: [],
      historyIndex: -1,
      activeSelection: null,
      fillTolerance: 30,
      canvasBackground: 'white',
      showGrid: false,
      gridSize: 16,
      showRulers: true,
    }),
}));
