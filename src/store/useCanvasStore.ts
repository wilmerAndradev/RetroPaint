import { create } from 'zustand';

interface CanvasState {
  width: number;
  height: number;
  history: string[]; // Array de base64 snapshots del canvas completo
  historyIndex: number;

  // Acciones
  setDimensions: (width: number, height: number) => void;
  setHistory: (history: string[], index: number) => void;
  pushHistory: (dataUrl: string) => void;
  undo: () => { success: boolean; dataUrl?: string };
  redo: () => { success: boolean; dataUrl?: string };
  resetCanvasStore: () => void;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  history: [],
  historyIndex: -1,

  setDimensions: (width, height) => set({ width, height }),

  setHistory: (history, index) => set({ history, historyIndex: index }),

  pushHistory: (dataUrl) => {
    const { history, historyIndex } = get();
    // Elimina estados futuros si estábamos en medio de un deshacer
    const truncatedHistory = history.slice(0, historyIndex + 1);

    // Máximo 50 estados en memoria
    const newHistory = [...truncatedHistory, dataUrl];
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
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

  resetCanvasStore: () =>
    set({
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      history: [],
      historyIndex: -1,
    }),
}));
