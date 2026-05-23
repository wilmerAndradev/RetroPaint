import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type React from 'react';
import { useRef } from 'react';
import { TOOLS_LIST } from '../../constants/tools';
import { useAppStore } from '../../store/useAppStore';
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
  const setOpacity = useAppStore((state) => state.setOpacity);
  const fillShapes = useAppStore((state) => state.fillShapes);
  const setFillShapes = useAppStore((state) => state.setFillShapes);
  const smoothing = useAppStore((state) => state.smoothing);
  const setSmoothing = useAppStore((state) => state.setSmoothing);
  const softEdges = useAppStore((state) => state.softEdges);
  const setSoftEdges = useAppStore((state) => state.setSoftEdges);
  const brushStyle = useAppStore((state) => state.brushStyle);
  const setBrushStyle = useAppStore((state) => state.setBrushStyle);

  // Estados y acciones para la Galería de la Sesión
  const sessionDrawings = useAppStore((state) => state.sessionDrawings);
  const saveDrawingToSession = useAppStore(
    (state) => state.saveDrawingToSession,
  );
  const deleteDrawingFromSession = useAppStore(
    (state) => state.deleteDrawingFromSession,
  );

  const cardRef = useRef<HTMLDivElement>(null);

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
      const confirmLoad = window.confirm(
        '¿Deseas cargar este dibujo en el lienzo? Se perderán los cambios que no hayas guardado.',
      );
      if (confirmLoad) {
        loadDrawingOnCanvas(dataUrl);
      }
    }
  };

  // Iconos o imágenes de apoyo para la descripción de la herramienta activa
  const getToolDescription = () => {
    switch (activeTool) {
      case 'select':
        return 'Selecciona un área para mover, copiar o editar.';
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
    <div className="w-[180px] min-w-[180px] bg-[var(--bg-primary)] p-4 border-l border-[var(--border-color)] flex flex-col gap-5 select-none h-full overflow-y-auto z-10 theme-transition">
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
            <span className="text-[9px] font-bold text-[var(--text-main)]">
              GROSOR
            </span>
            <div className="flex justify-around items-center h-[34px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-1">
              {([1, 3, 6] as const).map((size) => {
                const isSelected = brushSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    className={`w-6 h-6 flex items-center justify-center rounded border transition-all cursor-default ${
                      isSelected
                        ? 'bg-[var(--bg-primary)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold'
                        : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-primary)]'
                    }`}
                    title={`Tamaño ${size}px`}
                  >
                    <div
                      className="rounded-full transition-all"
                      style={{
                        width: size === 1 ? '3px' : size === 3 ? '6px' : '10px',
                        height:
                          size === 1 ? '3px' : size === 3 ? '6px' : '10px',
                        backgroundColor: isSelected
                          ? 'var(--accent-color)'
                          : 'var(--text-main)',
                      }}
                    />
                  </button>
                );
              })}
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

        {/* 2.5 SLIDER DE OPACIDAD */}
        {(activeTool === 'brush' ||
          activeTool === 'rectangle' ||
          activeTool === 'ellipse' ||
          activeTool === 'polygon' ||
          activeTool === 'text') && (
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

        {/* 2.6 CHECKBOX SUAVIZADO Y BORDES SUAVES */}
        <div className="flex flex-col gap-3 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-3">
          <label className="flex items-center gap-2 cursor-default text-[10px] text-[var(--text-main)] font-bold">
            <input
              type="checkbox"
              checked={smoothing}
              onChange={(e) => setSmoothing(e.target.checked)}
              className="w-3.5 h-3.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] checked:bg-[var(--accent-color)] checked:border-[var(--accent-color)] text-white focus:ring-0 cursor-default transition-colors"
            />
            <span>SUAVIZADO</span>
          </label>

          <label className="flex items-center gap-2 cursor-default text-[10px] text-[var(--text-main)] font-bold">
            <input
              type="checkbox"
              checked={softEdges}
              onChange={(e) => setSoftEdges(e.target.checked)}
              className="w-3.5 h-3.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] checked:bg-[var(--accent-color)] checked:border-[var(--accent-color)] text-white focus:ring-0 cursor-default transition-colors"
            />
            <span>BORDES SUAVES</span>
          </label>
        </div>
      </div>

      {/* SECCIÓN 3: GALERÍA DE LA SESIÓN */}
      <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[var(--border-color)]">
        <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider">
          GALERÍA DE LA SESIÓN
        </span>

        <button
          type="button"
          onClick={handleCapture}
          className="theme-btn w-full py-1.5 px-2 text-[9px] font-bold flex items-center justify-center gap-1.5 bg-[var(--accent-color)] text-white border-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-all cursor-default"
        >
          <span>📸</span> CAPTURAR DIBUJO
        </button>

        {sessionDrawings.length === 0 ? (
          <div className="text-[8px] text-[var(--text-muted)] text-center py-2 italic bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md">
            Sin capturas en esta sesión
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {sessionDrawings.map((dwg, idx) => {
                return (
                  <button
                    /* biome-ignore lint/suspicious/noArrayIndexKey: el indice es necesario ya que las capturas de dibujo son temporales e identificadas por orden */
                    key={`session-dwg-${idx}`}
                    type="button"
                    className="relative group flex-shrink-0 w-11 h-11 border border-[var(--border-color)] rounded bg-white dark:bg-zinc-800 cursor-pointer overflow-hidden hover:border-[var(--accent-color)] transition-all p-0 m-0 block"
                    onClick={() => handleLoadDrawing(dwg)}
                    title="Haga clic para cargar en el lienzo"
                  >
                    <img
                      src={dwg}
                      alt={`Captura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Botón de borrar miniatura */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDrawingFromSession(idx);
                      }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      title="Eliminar captura"
                    >
                      ×
                    </button>
                  </button>
                );
              })}
            </div>
            <span className="text-[7.5px] text-[var(--text-muted)] text-center block leading-tight">
              Haz clic para restaurar (Máx 5)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
