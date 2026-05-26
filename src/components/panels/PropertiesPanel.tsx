import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type React from 'react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS_LIST } from '../../constants/tools';
import { useHistory } from '../../hooks/useHistory';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import type { BrushStyle } from '../../types/tools';

interface PropertiesPanelProps {
  deleteSelection?: () => void;
  copySelection?: () => void;
  cutSelection?: () => void;
  pasteSelection?: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  loadDrawingOnCanvas?: (dataUrl: string) => void;
}

export function PropertiesPanel({
  deleteSelection,
  copySelection,
  cutSelection,
  pasteSelection,
  canvasRef,
  loadDrawingOnCanvas,
}: PropertiesPanelProps) {
  const activeTool = useAppStore((state) => state.activeTool);
  const brushSize = useAppStore((state) => state.brushSize);
  const setBrushSize = useAppStore((state) => state.setBrushSize);
  const opacity = useAppStore((state) => state.opacity);
  const fgColor = useAppStore((state) => state.fgColor);

  // Selector e historial para panel de historia visual (MVP-5)
  const { jumpToHistoryIndex } = useHistory();
  const history = useCanvasStore((state) => state.history);
  const historyLabels = useCanvasStore((state) => state.historyLabels);
  const historyIndex = useCanvasStore((state) => state.historyIndex);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const setOpacity = useAppStore((state) => state.setOpacity);

  const fillTolerance = useCanvasStore((state) => state.fillTolerance);
  const setFillTolerance = useCanvasStore((state) => state.setFillTolerance);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const setGridSize = useCanvasStore((state) => state.setGridSize);
  const fillShapes = useAppStore((state) => state.fillShapes);
  const setFillShapes = useAppStore((state) => state.setFillShapes);
  const smoothing = useAppStore((state) => state.smoothing);
  const setSmoothing = useAppStore((state) => state.setSmoothing);
  const smoothingLevel = useAppStore((state) => state.smoothingLevel);
  const setSmoothingLevel = useAppStore((state) => state.setSmoothingLevel);
  const softEdges = useAppStore((state) => state.softEdges);
  const setSoftEdges = useAppStore((state) => state.setSoftEdges);
  const softEdgesLevel = useAppStore((state) => state.softEdgesLevel);
  const setSoftEdgesLevel = useAppStore((state) => state.setSoftEdgesLevel);
  const brushStyle = useAppStore((state) => state.brushStyle);
  const setBrushStyle = useAppStore((state) => state.setBrushStyle);

  const textFont = useAppStore((state) => state.textFont);
  const setTextFont = useAppStore((state) => state.setTextFont);
  const textSize = useAppStore((state) => state.textSize);
  const setTextSize = useAppStore((state) => state.setTextSize);

  // Estados y acciones para la Galería de la Sesión
  const sessionDrawings = useAppStore((state) => state.sessionDrawings);
  const saveDrawingToSession = useAppStore(
    (state) => state.saveDrawingToSession,
  );
  const deleteDrawingFromSession = useAppStore(
    (state) => state.deleteDrawingFromSession,
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);

  useGSAP(
    () => {
      if (!cardRef.current) return;

      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
      );
    },
    { dependencies: [activeTool], scope: cardRef },
  );

  const activeToolDef = TOOLS_LIST.find((t) => t.type === activeTool);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(Number(e.target.value) / 100);
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBrushStyle(e.target.value as BrushStyle);
  };

  const handleCapture = () => {
    const canvas = canvasRef?.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      saveDrawingToSession(dataUrl);
    }
  };

  const handleLoadDrawing = (dataUrl: string) => {
    if (loadDrawingOnCanvas) {
      setPendingDataUrl(dataUrl);
      setIsConfirmModalOpen(true);
    }
  };

  // Iconos o imágenes de apoyo para la descripción de la herramienta activa
  const getToolDescription = () => {
    switch (activeTool) {
      case 'select':
        return 'Selecciona un área para mover, copiar o editar.';
      case 'move':
        return 'Mueve la capa completa o el contenido seleccionado.';
      case 'pencil':
        return 'Dibuja trazos libres con precisión de píxeles.';
      case 'bucket':
        return 'Rellena una zona contigua con el color activo.';
      case 'eyedropper':
        return 'Selecciona un color directamente del lienzo.';
      case 'text':
        return 'Inserta textos personalizados sobre el lienzo.';
      case 'line':
        return 'Dibuja líneas rectas perfectas (Shift restringe).';
      case 'bezier':
        return 'Dibuja curvas bezier fluidas de múltiples puntos.';
      case 'rectangle':
        return 'Dibuja rectángulos definidos (Shift para cuadrados).';
      case 'ellipse':
        return 'Dibuja elipses y círculos perfectos.';
      case 'polygon':
        return 'Dibuja formas poligonales complejas.';
      default:
        return 'Dibuja y edita con las herramientas activas.';
    }
  };

  // Retorna el icono del botón activo en grande para la tarjeta
  const renderActiveToolBigIcon = () => {
    const strokeColor = 'currentColor';
    switch (activeTool) {
      case 'select':
        return (
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <title>Icono Seleccionar</title>
            <rect
              x="1"
              y="2"
              width="14"
              height="12"
              stroke={strokeColor}
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'move':
        return (
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <title>Icono Mover</title>
            <path
              d="M8 1 L11 4 H9 V7 H12 V5 L15 8 L12 11 V9 H9 V12 H11 L8 15 L5 12 H7 V9 H4 V11 L1 8 L4 5 V7 H7 V4 H5 Z"
              fill={strokeColor}
            />
          </svg>
        );
      case 'pencil':
        return (
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <title>Icono Lápiz</title>
            <path
              d="M11 2 L14 5 L6 13 L3 10 Z"
              fill="#93C5FD"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M2 14 L3 10 L6 13 Z"
              fill="#FF8080"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'bucket':
        return (
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <title>Icono Relleno</title>
            <path
              d="M2 10 L8 4 L12 8 L6 14 Z"
              fill="#93C5FD"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M12 8 L14 6 C15 5, 15 3, 13 4 Z"
              stroke={strokeColor}
              strokeWidth="1.5"
              fill="#00A2FF"
            />
          </svg>
        );
      default:
        return <span className="text-xl">🎨</span>;
    }
  };

  return (
    <div className="w-[240px] min-w-[240px] bg-[var(--bg-primary)] p-4 border-l border-[var(--border-color)] flex flex-col gap-5 select-none h-full overflow-y-auto z-10 theme-transition">
      {/* SECCIÓN 1: HERRAMIENTA ACTIVA */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider">
          HERRAMIENTA ACTIVA
        </span>
        <div
          ref={cardRef}
          className="flex flex-col gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md shadow-sm active-tool-card"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-[var(--accent-color)]">
              {renderActiveToolBigIcon()}
            </div>
            <span className="font-bold text-[10px] text-[var(--accent-color)] font-sans uppercase tracking-wider">
              {activeToolDef?.label === 'Curva Bezier'
                ? 'CURVA'
                : activeToolDef?.label === 'Bote de Pintura'
                  ? 'RELLENO'
                  : activeToolDef?.label}
            </span>
          </div>

          <div className="flex gap-2">
            {/* Cursor SVG decorativo clásico de Paint a la izquierda */}
            <svg
              width="10"
              height="14"
              viewBox="0 0 10 14"
              fill="none"
              className="flex-shrink-0 mt-0.5 opacity-60 text-[var(--text-muted)]"
            >
              <title>Icono Cursor</title>
              <path
                d="M1 1V11.5L3.8 8.8L7.2 13.5L8.5 12.5L5.2 7.8L9 7.8L1 1Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[9px] text-[var(--text-muted)] leading-tight font-sans">
              {getToolDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: PROPIEDADES */}
      <div className="flex flex-col gap-3.5">
        <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider">
          PROPIEDADES
        </span>

        {/* 2.1 ACCIONES DE SELECCIÓN (Solo si es herramienta select) */}
        {activeTool === 'select' && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-[var(--text-main)]">
              ACCIONES DE SELECCIÓN
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={copySelection}
                className="theme-btn text-[9px] font-bold py-1 px-1.5 flex items-center justify-center gap-1"
                title="Copiar área seleccionada al portapapeles"
              >
                <span>📋</span> Copiar
              </button>
              <button
                type="button"
                onClick={cutSelection}
                className="theme-btn text-[9px] font-bold py-1 px-1.5 flex items-center justify-center gap-1"
                title="Cortar área seleccionada al portapapeles"
              >
                <span>✂️</span> Cortar
              </button>
              <button
                type="button"
                onClick={pasteSelection}
                className="theme-btn text-[9px] font-bold py-1 px-1.5 flex items-center justify-center gap-1"
                title="Pegar contenido del portapapeles en el lienzo"
              >
                <span>📥</span> Pegar
              </button>
              <button
                type="button"
                onClick={deleteSelection}
                className="theme-btn text-[9px] font-bold py-1 px-1.5 flex items-center justify-center gap-1 text-red-500 dark:text-red-400"
                title="Eliminar área seleccionada"
              >
                <span>🗑️</span> Borrar
              </button>
            </div>
          </div>
        )}

        {/* 2.2 SELECTOR DE TAMAÑO (Para lápiz, pincel, borrador, etc.) */}
        {(activeTool === 'pencil' ||
          activeTool === 'brush' ||
          activeTool === 'eraser' ||
          activeTool === 'line' ||
          activeTool === 'rectangle' ||
          activeTool === 'ellipse' ||
          activeTool === 'bezier' ||
          activeTool === 'polygon' ||
          activeTool === 'spray') && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-[var(--text-main)] uppercase">
                Grosor
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] font-bold">
                {brushSize}px
              </span>
            </div>
            <div className="flex flex-col gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-2">
              <input
                type="range"
                min={1}
                max={200}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-default accent-[var(--accent-color)]"
              />
              <div className="flex gap-2 items-center">
                <div className="flex-1 flex justify-center items-center h-8 border border-[var(--border-color)]/40 rounded bg-[var(--bg-primary)]">
                  <div
                    className="rounded-full bg-[var(--text-main)]"
                    style={{
                      width: `${Math.max(1, Math.min(26, brushSize))}px`,
                      height: `${Math.max(1, Math.min(26, brushSize))}px`,
                    }}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={brushSize}
                  onChange={(e) => {
                    const val = Math.max(
                      1,
                      Math.min(200, Number(e.target.value)),
                    );
                    setBrushSize(val);
                  }}
                  className="w-12 text-[9px] font-mono text-center font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-main)] focus:outline-none py-1"
                />
              </div>

              {/* Opacidad (MVP-4/5) */}
              <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[var(--border-color)]/40">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-[var(--text-main)] uppercase">
                    Opacidad
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)] font-bold">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={handleOpacityChange}
                  className="w-full h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-default accent-[var(--accent-color)]"
                />
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex justify-center items-center h-8 border border-[var(--border-color)]/40 rounded bg-[var(--bg-primary)] relative overflow-hidden">
                    {/* Checkerboard retro */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage:
                          'conic-gradient(#000 0.25turn, #fff 0.25turn 0.5turn, #000 0.5turn 0.75turn, #fff 0.75turn)',
                        backgroundSize: '8px 8px',
                      }}
                    />
                    {/* Foreground color overlay with current opacity */}
                    <div
                      className="w-full h-full absolute inset-0 transition-all duration-150"
                      style={{
                        backgroundColor: fgColor,
                        opacity: opacity,
                      }}
                    />
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={Math.round(opacity * 100)}
                    onChange={(e) => {
                      const val = Math.max(
                        10,
                        Math.min(100, Number(e.target.value)),
                      );
                      setOpacity(val / 100);
                    }}
                    className="w-12 text-[9px] font-mono text-center font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-main)] focus:outline-none py-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2.3 ESTILO DE PINCEL (Solo si es herramienta brush) */}
        {activeTool === 'brush' && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-[var(--text-main)]">
              ESTILO
            </span>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md px-2 py-1 flex items-center">
              <select
                value={brushStyle}
                onChange={handleStyleChange}
                className="text-[10px] font-bold text-[var(--text-main)] w-full bg-transparent border-none outline-none cursor-default py-0.5"
              >
                <option
                  value="normal"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Normal
                </option>
                <option
                  value="watercolor"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Acuarela
                </option>
                <option
                  value="chalk"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Tiza
                </option>
                <option
                  value="spray"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Aerógrafo
                </option>
                <option
                  value="pixel"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Píxel
                </option>
              </select>
            </div>
          </div>
        )}

        {/* 2.4 RELLENAR (Para rectángulos, elipses, etc.) */}
        {(activeTool === 'rectangle' ||
          activeTool === 'ellipse' ||
          activeTool === 'polygon') && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-[var(--text-main)]">
              ESTILO
            </span>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md px-2 py-1 flex items-center">
              <select
                value={fillShapes ? 'filled' : 'stroke'}
                onChange={(e) => setFillShapes(e.target.value === 'filled')}
                className="text-[10px] font-bold text-[var(--text-main)] w-full bg-transparent border-none outline-none cursor-default py-0.5"
              >
                <option
                  value="stroke"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Solo Borde
                </option>
                <option
                  value="filled"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  Relleno Completo
                </option>
              </select>
            </div>
          </div>
        )}
        {/* 2.4B TOLERANCIA DE RELLENO (Solo para bote de pintura/bucket) */}
        {activeTool === 'bucket' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-[var(--text-main)] uppercase">
                Tolerancia
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] font-bold">
                {fillTolerance}
              </span>
            </div>
            <div className="flex flex-col gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-2">
              <input
                type="range"
                min={0}
                max={255}
                value={fillTolerance}
                onChange={(e) => setFillTolerance(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-default accent-[var(--accent-color)]"
              />
            </div>
          </div>
        )}

        {/* 2.5 SLIDER DE OPACIDAD (Solo para herramienta texto) */}
        {activeTool === 'text' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-[var(--text-main)]">
                OPACIDAD
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-2">
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={handleOpacityChange}
                className="w-full h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-default accent-[var(--accent-color)]"
              />
            </div>
          </div>
        )}

        {/* 2.5B CONFIGURACIÓN DE TEXTO CONTEXTUAL */}
        {activeTool === 'text' && (
          <div className="flex flex-col gap-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-3">
            <span className="text-[9px] font-bold text-[var(--text-main)] block uppercase tracking-wider">
              Opciones de Texto
            </span>

            {/* Fuente */}
            <div className="flex flex-col gap-1">
              <span className="text-[7.5px] font-bold text-[var(--text-muted)]">
                FUENTE
              </span>
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 flex items-center">
                <select
                  value={textFont}
                  onChange={(e) => setTextFont(e.target.value)}
                  className="text-[9px] font-bold text-[var(--text-main)] w-full bg-transparent border-none outline-none cursor-default py-0.5"
                >
                  <optgroup label="👾 Pixel & Retro" className="bg-[var(--bg-card)] text-[var(--text-main)] font-bold">
                    <option value='"Press Start 2P", monospace'>Press Start 2P (8-bit)</option>
                    <option value="'Pixelify Sans', sans-serif">Pixelify Sans (Retro Pixel)</option>
                    <option value="Silkscreen, sans-serif">Silkscreen (Micro Pixel)</option>
                    <option value="VT323, monospace">VT323 (CRT Terminal)</option>
                    <option value="'Jacquard 12', sans-serif">Jacquard 12 (Retro Gothic)</option>
                  </optgroup>
                  <optgroup label="⚡ Arcade & Display" className="bg-[var(--bg-card)] text-[var(--text-main)] font-bold">
                    <option value="'Bungee', sans-serif">Bungee (Arcade Block)</option>
                    <option value="'Monoton', sans-serif">Monoton (Retro Disco)</option>
                    <option value="'Righteous', sans-serif">Righteous (Synthwave)</option>
                    <option value="'Rubik Mono One', sans-serif">Rubik Mono (Classic Bold)</option>
                    <option value="'Creepster', sans-serif">Creepster (Retro Horror)</option>
                  </optgroup>
                  <optgroup label="✍️ Cursive & Scripts" className="bg-[var(--bg-card)] text-[var(--text-main)] font-bold">
                    <option value="Lobster, cursive">Lobster (Retro Script)</option>
                    <option value="Pacifico, cursive">Pacifico (Vintage Script)</option>
                    <option value="'Dancing Script', cursive">Dancing Script (Elegant)</option>
                    <option value="'Satisfy', cursive">Satisfy (Signature Script)</option>
                    <option value="'Sacramento', cursive">Sacramento (Thin Handwriting)</option>
                    <option value="'Shadows Into Light', cursive">Shadows Into Light (Handwritten)</option>
                  </optgroup>
                  <optgroup label="🏛️ Serif & Classic" className="bg-[var(--bg-card)] text-[var(--text-main)] font-bold">
                    <option value="'Playfair Display', serif">Playfair Display (Elegant Serif)</option>
                    <option value="Cinzel, serif">Cinzel (Roman Imperial)</option>
                    <option value="'Abril Fatface', serif">Abril Fatface (Retro Fat Serif)</option>
                    <option value="Georgia, serif">Georgia</option>
                  </optgroup>
                  <optgroup label="💻 Modern & Technical" className="bg-[var(--bg-card)] text-[var(--text-main)] font-bold">
                    <option value="Inter, sans-serif">Inter (Modern Sans)</option>
                    <option value="'Outfit', sans-serif">Outfit (Geometric Clean)</option>
                    <option value="'Ubuntu Mono', monospace">Ubuntu Mono (Technical Code)</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Tamaño */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[7.5px] font-bold text-[var(--text-muted)]">
                  TAMAÑO
                </span>
                <span className="text-[8px] font-mono font-bold">
                  {textSize}px
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-1">
                <input
                  type="range"
                  min={8}
                  max={72}
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-default accent-[var(--accent-color)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2.6 CHECKBOX SUAVIZADO Y BORDES SUAVES */}
        <div className="flex flex-col gap-3.5 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-3 shadow-sm">
          {/* Fila de Suavizado */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between cursor-default">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--accent-color)] font-bold">〰️</span>
                <span className="text-[9.5px] font-bold text-[var(--text-main)] tracking-wider">
                  SUAVIZADO DE TRAZO
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSmoothing(!smoothing)}
                className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer border border-[var(--border-color)]/30 ${
                  smoothing ? 'bg-[var(--accent-color)]' : 'bg-[var(--bg-primary)]'
                }`}
                title={smoothing ? 'Desactivar suavizado' : 'Activar suavizado'}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform duration-200 ${
                    smoothing ? 'translate-x-3.5 bg-white' : 'translate-x-0 bg-[var(--text-muted)]'
                  }`}
                />
              </button>
            </div>

            {smoothing && (
              <div className="flex flex-col gap-2 mt-2.5 p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)]/50 rounded-lg shadow-inner relative overflow-hidden transition-all duration-300">
                {/* Left accent colored line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-color)]" />
                
                <div className="pl-1.5 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] text-[var(--text-main)] font-bold">
                    <span className="opacity-80">ESTABILIZADO</span>
                    <span className="font-mono bg-[var(--bg-card)] px-2 py-0.5 border border-[var(--border-color)] rounded-md text-[8.5px] text-[var(--accent-color)] font-bold shadow-sm">
                      {smoothingLevel === 0 ? 'DESACTIVADO' : `NIVEL ${smoothingLevel}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={smoothingLevel}
                      onChange={(e) => setSmoothingLevel(Number(e.target.value))}
                      className="w-full h-1 bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                    />
                    <span className="text-[9px] font-mono font-bold w-4 text-center">
                      {smoothingLevel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fila de Bordes Suaves */}
          <div className="flex flex-col border-t border-[var(--border-color)]/60 pt-3">
            <div className="flex items-center justify-between cursor-default">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--accent-color)] font-bold">🌫️</span>
                <span className="text-[9.5px] font-bold text-[var(--text-main)] tracking-wider">
                  BORDES SUAVES
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSoftEdges(!softEdges)}
                className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer border border-[var(--border-color)]/30 ${
                  softEdges ? 'bg-[var(--accent-color)]' : 'bg-[var(--bg-primary)]'
                }`}
                title={softEdges ? 'Desactivar bordes suaves' : 'Activar bordes suaves'}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform duration-200 ${
                    softEdges ? 'translate-x-3.5 bg-white' : 'translate-x-0 bg-[var(--text-muted)]'
                  }`}
                />
              </button>
            </div>

            {softEdges && (
              <div className="flex flex-col gap-2 mt-2.5 p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)]/50 rounded-lg shadow-inner relative overflow-hidden transition-all duration-300">
                {/* Left accent colored line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-color)]" />
                
                <div className="pl-1.5 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] text-[var(--text-main)] font-bold">
                    <span className="opacity-80">DIFUMINADO</span>
                    <span className="font-mono bg-[var(--bg-card)] px-2 py-0.5 border border-[var(--border-color)] rounded-md text-[8.5px] text-[var(--accent-color)] font-bold shadow-sm">
                      {softEdgesLevel} px
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={softEdgesLevel}
                      onChange={(e) => setSoftEdgesLevel(Number(e.target.value))}
                      className="w-full h-1 bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                    />
                    <span className="text-[9px] font-mono font-bold w-4 text-center">
                      {softEdgesLevel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2.7 CONFIGURACIÓN DE CUADRÍCULA VISUAL */}
        <div className="flex flex-col gap-2 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-3">
          <label className="flex items-center gap-2 cursor-default text-[10px] text-[var(--text-main)] font-bold">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={toggleGrid}
              className="w-3.5 h-3.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] checked:bg-[var(--accent-color)] checked:border-[var(--accent-color)] text-white focus:ring-0 cursor-default transition-colors"
            />
            <span>CUADRÍCULA</span>
          </label>

          {showGrid && (
            <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-[var(--border-color)]/40">
              <span className="text-[7.5px] font-bold text-[var(--text-muted)] uppercase">
                Celda
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[8, 16, 32, 64].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGridSize(size)}
                    className={`text-[8px] font-bold py-1 border rounded transition-all cursor-default text-center ${
                      gridSize === size
                        ? 'bg-[var(--accent-color)] text-white border-transparent'
                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN: HISTORIAL DE ACCIONES (MVP-5) */}
      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => setHistoryCollapsed(!historyCollapsed)}
          className="flex items-center justify-between w-full text-[9px] font-bold text-[var(--text-muted)] tracking-wider hover:text-[var(--text-main)] transition-colors cursor-default"
        >
          <span>HISTORIAL DE ACCIONES</span>
          <span>{historyCollapsed ? '▲' : '▼'}</span>
        </button>

        {!historyCollapsed && (
          <div className="flex flex-col gap-1.5">
            {history.length === 0 ? (
              <div className="text-[8px] text-[var(--text-muted)] text-center py-2 italic bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md">
                Sin acciones registradas
              </div>
            ) : (
              <div className="flex flex-col max-h-[120px] overflow-y-auto border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 rounded-md scrollbar-thin gap-1">
                {history.map((snapshot, idx) => {
                  const isActive = idx === historyIndex;
                  const label = historyLabels[idx] || `Acción ${idx + 1}`;
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: El historial es una pila estrictamente cronológica donde los índices son identificadores únicos y estables
                      key={`history-step-${idx}`}
                      type="button"
                      onClick={() => {
                        const canvas = canvasRef?.current;
                        if (canvas) {
                          jumpToHistoryIndex(canvas, idx);
                        }
                      }}
                      className={`flex items-center gap-2 w-full text-left px-2 py-1 text-[9px] font-bold font-mono transition-all rounded cursor-default border border-transparent ${
                        isActive
                          ? 'bg-[#1E3A8A] text-white'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]/20'
                      }`}
                    >
                      {/* Mini vista previa */}
                      <div className="w-5 h-4 border border-[var(--border-color)]/20 bg-white rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img
                          src={snapshot}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="truncate flex-1">{label}</span>
                      <span className="text-[7.5px] opacity-60">#{idx}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <span className="text-[7.5px] text-[var(--text-muted)] text-center block leading-tight">
              Haz clic en cualquier acción para restaurar
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: GALERÍA DE LA SESIÓN */}
      <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[var(--border-color)]">
        <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider">
          VERSIONES DE LA SESIÓN
        </span>

        <button
          type="button"
          onClick={handleCapture}
          className="theme-btn w-full py-1.5 px-2 text-[9px] font-bold flex items-center justify-center gap-1.5 bg-[var(--accent-color)] text-white border-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-all cursor-default"
        >
          <span>💾</span> VERSIONAR DIBUJO
        </button>

        {sessionDrawings.length === 0 ? (
          <div className="text-[8px] text-[var(--text-muted)] text-center py-2 italic bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md">
            Sin versiones en esta sesión
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {sessionDrawings.map((dwg, idx) => {
                return (
                  <div
                    key={dwg.id || `session-dwg-${idx}`}
                    className="flex flex-col items-center gap-1 flex-shrink-0 relative group"
                  >
                    <button
                      type="button"
                      className="w-11 h-11 border border-[var(--border-color)] rounded bg-white dark:bg-zinc-800 cursor-pointer overflow-hidden hover:border-[var(--accent-color)] transition-all p-0 m-0 block"
                      onClick={() => handleLoadDrawing(dwg.thumbnail)}
                      title="Haga clic para restaurar esta versión"
                    >
                      <img
                        src={dwg.thumbnail}
                        alt={dwg.label || `Versión ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {/* Botón de borrar miniatura */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDrawingFromSession(idx);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer z-10"
                      title="Eliminar versión"
                    >
                      ×
                    </button>
                    <div className="flex flex-col items-center text-[7px] text-[var(--text-muted)] font-mono leading-none">
                      <span>
                        {dwg.timestamp.toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>{dwg.sizeKB} KB</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[7.5px] text-[var(--text-muted)] text-center block leading-tight">
              Haz clic para restaurar versión (Máx 20)
            </span>
          </div>
        )}
      </div>

      {/* --- MODAL CONFIRMACIÓN RESTAURAR VERSIÓN --- */}
      {isConfirmModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[420px] text-[var(--text-main)] my-auto">
                <h3 className="font-press-start text-[13.5px] text-center mb-6 tracking-wide text-[var(--accent-color)] flex items-center justify-center gap-2">
                  💾 RESTAURAR VERSIÓN
                </h3>

                <div className="mb-6 text-center">
                  <span className="text-[20px] block mb-3">⚠️</span>
                  <p className="text-[15.5px] font-bold leading-relaxed text-[var(--text-main)]">
                    ¿Deseas restaurar esta versión en el lienzo?
                  </p>
                  <p className="text-[13px] text-[var(--text-muted)] mt-2.5 leading-relaxed">
                    Se perderán todos los cambios que no hayas guardado en una
                    versión de la sesión o exportado.
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmModalOpen(false);
                      setPendingDataUrl(null);
                    }}
                    className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[13px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all cursor-default"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (loadDrawingOnCanvas && pendingDataUrl) {
                        loadDrawingOnCanvas(pendingDataUrl);
                      }
                      setIsConfirmModalOpen(false);
                      setPendingDataUrl(null);
                    }}
                    className="px-5 py-2.5 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all cursor-default"
                  >
                    RESTAURAR
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
