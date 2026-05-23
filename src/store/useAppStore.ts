import { create } from 'zustand';
import type { BrushStyle, ToolType } from '../types/tools';

interface AppState {
  activeTool: ToolType;
  fgColor: string;
  bgColor: string;
  brushSize: 1 | 3 | 6;
  opacity: number;
  zoom: number;
  smoothing: boolean;
  fillShapes: boolean;
  softEdges: boolean;
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

  // Entrada de texto interactivo flotante
  textInputCoords: { x: number; y: number } | null;

  // Memoria de colores de la sesión
  recentColors: string[];
  customPalette: string[];

  // Galería de dibujos de la sesión (base64)
  sessionDrawings: string[];

  // Acciones
  setActiveTool: (tool: ToolType) => void;
  setFgColor: (color: string) => void;
  setBgColor: (color: string) => void;
  swapColors: () => void;
  setBrushSize: (size: 1 | 3 | 6) => void;
  setOpacity: (opacity: number) => void;
  setZoom: (zoom: number) => void;
  setSmoothing: (smoothing: boolean) => void;
  setFillShapes: (fill: boolean) => void;
  setSoftEdges: (soft: boolean) => void;
  setBrushStyle: (style: BrushStyle) => void;
  setCursorCoords: (x: number | null, y: number | null) => void;
  setStatusText: (text: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setIsSpacePressed: (pressed: boolean) => void;
  setTextInputCoords: (coords: { x: number; y: number } | null) => void;
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
  fillShapes: false,
  softEdges: false,
  brushStyle: 'normal',
  cursorX: null,
  cursorY: null,
  statusText: 'Listo',
  theme: 'light',
  isSpacePressed: false,
  textInputCoords: null,
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
  sessionDrawings: [],

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      statusText: `Herramienta activa: ${tool.toUpperCase()}`,
      // Limpiar coordenadas de texto flotante si se cambia de herramienta
      textInputCoords: null,
    }),
  setFgColor: (color) => set({ fgColor: color }),
  setBgColor: (color) => set({ bgColor: color }),
  swapColors: () =>
    set((state) => ({ fgColor: state.bgColor, bgColor: state.fgColor })),
  setBrushSize: (size) => set({ brushSize: size }),
  setOpacity: (opacity) => set({ opacity: Math.max(0, Math.min(1, opacity)) }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(800, zoom)) }),
  setSmoothing: (smoothing) => set({ smoothing }),
  setFillShapes: (fillShapes) => set({ fillShapes }),
  setSoftEdges: (softEdges) => set({ softEdges }),
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
  setTextInputCoords: (coords) => set({ textInputCoords: coords }),

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
      // Buscar el primer slot blanco (#ffffff) o al final
      const newPalette = [...state.customPalette];
      const firstWhite = newPalette.indexOf('#ffffff');
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
      // Guardar en galería de sesión con límite de 5 dibujos
      const newDrawings = [dataUrl, ...state.sessionDrawings].slice(0, 5);
      return {
        sessionDrawings: newDrawings,
        statusText: 'Captura guardada en la galería de la sesión',
      };
    }),

  deleteDrawingFromSession: (index) =>
    set((state) => {
      const newDrawings = state.sessionDrawings.filter(
        (_, idx) => idx !== index,
      );
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
      fillShapes: false,
      softEdges: false,
      brushStyle: 'normal',
      cursorX: null,
      cursorY: null,
      statusText: 'Lienzo reiniciado',
      textInputCoords: null,
    }),
}));
