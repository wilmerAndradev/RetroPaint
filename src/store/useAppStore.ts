import { create } from 'zustand';
import type { BrushStyle, ToolType } from '../types/tools';
import { useCanvasStore } from './useCanvasStore';

export interface SessionSnapshot {
  id: string;
  thumbnail: string;
  timestamp: Date;
  sizeKB: number;
  label: string;
  canvasSize: { w: number; h: number };
}

interface AppState {
  activeTool: ToolType;
  fgColor: string;
  bgColor: string;
  brushSize: number;
  opacity: number;
  zoom: number;
  smoothing: boolean;
  smoothingLevel: number;
  fillShapes: boolean;
  softEdges: boolean;
  softEdgesLevel: number;
  brushStyle: BrushStyle;

  // Coordenadas del cursor
  cursorX: number | null;
  cursorY: number | null;

  // Mensaje en la barra de estado
  statusText: string;

  // Tema (Claro u Oscuro)
  theme: 'light' | 'dark';

  // Soporte de shortcuts (paneo con espacio)
  isSpacePressed: boolean;

  // Modales
  isExportModalOpen: boolean;
  isResizeModalOpen: boolean;
  isNewCanvasModalOpen: boolean;
  isShortcutsModalOpen: boolean;

  // Entrada de texto interactivo flotante
  textInputCoords: { x: number; y: number } | null;
  textValue: string;
  textFont: string;
  textSize: number;

  // Memoria de colores de la sesión
  recentColors: string[];
  customPalette: string[];

  // Galería de dibujos de la sesión (SessionSnapshot[])
  sessionDrawings: SessionSnapshot[];

  // Acciones
  setActiveTool: (tool: ToolType) => void;
  setFgColor: (color: string) => void;
  setBgColor: (color: string) => void;
  swapColors: () => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setZoom: (zoom: number) => void;
  setSmoothing: (smoothing: boolean) => void;
  setSmoothingLevel: (level: number) => void;
  setFillShapes: (fill: boolean) => void;
  setSoftEdges: (soft: boolean) => void;
  setSoftEdgesLevel: (level: number) => void;
  setBrushStyle: (style: BrushStyle) => void;
  setCursorCoords: (x: number | null, y: number | null) => void;
  setStatusText: (text: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setIsSpacePressed: (pressed: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsResizeModalOpen: (open: boolean) => void;
  setIsNewCanvasModalOpen: (open: boolean) => void;
  setIsShortcutsModalOpen: (open: boolean) => void;
  setTextInputCoords: (coords: { x: number; y: number } | null) => void;
  setTextValue: (value: string) => void;
  setTextFont: (font: string) => void;
  setTextSize: (size: number) => void;
  addRecentColor: (color: string) => void;
  addToCustomPalette: (color: string) => void;
  removeFromCustomPalette: (index: number) => void;
  saveDrawingToSession: (dataUrl: string) => void;
  deleteDrawingFromSession: (index: number) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTool: 'pencil',
  fgColor: '#000000',
  bgColor: '#ffffff',
  brushSize: 1,
  opacity: 1.0,
  zoom: 100,
  smoothing: false,
  smoothingLevel: 5,
  fillShapes: false,
  softEdges: false,
  softEdgesLevel: 5,
  brushStyle: 'normal',
  cursorX: null,
  cursorY: null,
  statusText: 'Listo',
  theme: 'light',
  isSpacePressed: false,
  isExportModalOpen: false,
  isResizeModalOpen: false,
  isNewCanvasModalOpen: false,
  isShortcutsModalOpen: false,
  textInputCoords: null,
  textValue: '',
  textFont: '"Press Start 2P"',
  textSize: 16,
  recentColors: [
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
  ],
  customPalette: Array(16).fill('#ffffff'),
  sessionDrawings: (() => {
    try {
      const saved = sessionStorage.getItem('retro-paint-gallery');
      if (!saved) return [];
      interface SavedSnapshot {
        id: string;
        thumbnail: string;
        timestamp: string;
        sizeKB: number;
        label: string;
        canvasSize: { w: number; h: number };
      }
      const parsed = JSON.parse(saved) as SavedSnapshot[];
      return parsed.map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch {
      return [];
    }
  })(),

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      statusText: `Herramienta activa: ${tool.toUpperCase()}`,
      // Limpiar coordenadas de texto flotante si se cambia de herramienta
      textInputCoords: null,
      textValue: '',
    }),
  setFgColor: (color) => set({ fgColor: color }),
  setBgColor: (color) => set({ bgColor: color }),
  swapColors: () =>
    set((state) => ({ fgColor: state.bgColor, bgColor: state.fgColor })),
  setBrushSize: (size) => set({ brushSize: size }),
  setOpacity: (opacity) => set({ opacity: Math.max(0, Math.min(1, opacity)) }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(800, zoom)) }),
  setSmoothing: (smoothing) => set({ smoothing }),
  setSmoothingLevel: (smoothingLevel) =>
    set({ smoothingLevel: Math.max(0, Math.min(20, smoothingLevel)) }),
  setFillShapes: (fillShapes) => set({ fillShapes }),
  setSoftEdges: (softEdges) => set({ softEdges }),
  setSoftEdgesLevel: (softEdgesLevel) =>
    set({ softEdgesLevel: Math.max(0, Math.min(20, softEdgesLevel)) }),
  setBrushStyle: (brushStyle) => set({ brushStyle }),
  setCursorCoords: (x, y) => set({ cursorX: x, cursorY: y }),
  setStatusText: (statusText) => set({ statusText }),
  setTheme: (theme) =>
    set({
      theme,
      statusText: `Tema cambiado a: ${
        theme === 'light' ? 'Retro Premium' : 'Modo Oscuro'
      }`,
    }),
  setIsSpacePressed: (pressed) => set({ isSpacePressed: pressed }),
  setIsExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setIsResizeModalOpen: (open) => set({ isResizeModalOpen: open }),
  setIsNewCanvasModalOpen: (open) => set({ isNewCanvasModalOpen: open }),
  setIsShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
  setTextInputCoords: (coords) => set({ textInputCoords: coords }),
  setTextValue: (value) => set({ textValue: value }),
  setTextFont: (textFont) => set({ textFont }),
  setTextSize: (textSize) => set({ textSize }),

  addRecentColor: (color) =>
    set((state) => {
      // Evitar duplicados consecutivos y mantener máximo 8 colores
      const filtered = state.recentColors.filter(
        (c) => c.toLowerCase() !== color.toLowerCase(),
      );
      const newRecent = [color, ...filtered].slice(0, 8);
      return { recentColors: newRecent };
    }),

  addToCustomPalette: (color) =>
    set((state) => {
      // Buscar el primer slot blanco (#ffffff) de forma insensible a mayúsculas/minúsculas
      const newPalette = [...state.customPalette];
      const firstWhite = newPalette.findIndex(
        (c) => c.toLowerCase() === '#ffffff',
      );
      if (firstWhite !== -1) {
        newPalette[firstWhite] = color;
      } else {
        newPalette[0] = color; // Sobrescribe el primero si está lleno
      }
      return { customPalette: newPalette };
    }),

  removeFromCustomPalette: (index) =>
    set((state) => {
      const newPalette = [...state.customPalette];
      newPalette[index] = '#ffffff';
      return { customPalette: newPalette };
    }),

  saveDrawingToSession: (dataUrl) =>
    set((state) => {
      // Guardar en galería de sesión con límite de 20 dibujos (FIFO)
      const canvasWidth = useCanvasStore.getState().width;
      const canvasHeight = useCanvasStore.getState().height;
      const snapshot: SessionSnapshot = {
        id: crypto.randomUUID(),
        thumbnail: dataUrl,
        timestamp: new Date(),
        sizeKB: Math.round((dataUrl.length * 0.75) / 1024),
        label: `Versión ${state.sessionDrawings.length + 1}`,
        canvasSize: { w: canvasWidth, h: canvasHeight },
      };

      const newDrawings = [snapshot, ...state.sessionDrawings].slice(0, 20);
      try {
        sessionStorage.setItem(
          'retro-paint-gallery',
          JSON.stringify(newDrawings),
        );
      } catch (e) {
        console.error('No se pudo guardar la galería en sessionStorage:', e);
      }
      return {
        sessionDrawings: newDrawings,
        statusText: 'Versión guardada en el historial de la sesión (límite 20)',
      };
    }),

  deleteDrawingFromSession: (index) =>
    set((state) => {
      const newDrawings = state.sessionDrawings.filter(
        (_, idx) => idx !== index,
      );
      try {
        sessionStorage.setItem(
          'retro-paint-gallery',
          JSON.stringify(newDrawings),
        );
      } catch (e) {
        console.error(e);
      }
      return { sessionDrawings: newDrawings };
    }),

  resetAll: () =>
    set({
      activeTool: 'pencil',
      fgColor: '#000000',
      bgColor: '#ffffff',
      brushSize: 1,
      opacity: 1.0,
      zoom: 100,
      smoothing: false,
      smoothingLevel: 5,
      fillShapes: false,
      softEdges: false,
      softEdgesLevel: 5,
      brushStyle: 'normal',
      cursorX: null,
      cursorY: null,
      statusText: 'Lienzo reiniciado',
      textInputCoords: null,
      textValue: '',
    }),
}));
