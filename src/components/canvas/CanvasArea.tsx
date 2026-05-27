import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseLeave: React.MouseEventHandler<HTMLCanvasElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLCanvasElement>;
  drawTextOnCanvas?: (text: string, x: number, y: number) => void;
  ignoreBlurRef?: React.RefObject<boolean>;
  justCommittedTextRef?: React.RefObject<boolean>;
  startResizeSelection: (handle: string, e: React.MouseEvent) => void;
}

function getDynamicCursor(
  tool: string,
  brushSize: number,
  zoom: number,
  hasActiveTextBox?: boolean,
): string {
  // Escalar el tamaño según el nivel del zoom (porcentaje / 100)
  const scaledSize = Math.max(8, Math.min(brushSize * (zoom / 100), 200));
  const half = scaledSize / 2;
  const center = half + 2;
  const svgSize = scaledSize + 4;

  switch (tool) {
    case 'brush':
    case 'pencil':
    case 'spray':
    case 'airbrush': {
      // Círculo SVG del tamaño real del pincel
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
          <circle cx="${center}" cy="${center}" r="${half}"
            fill="none" stroke="black" stroke-width="1.5" opacity="0.8"/>
          <circle cx="${center}" cy="${center}" r="${half}"
            fill="none" stroke="white" stroke-width="0.5" opacity="0.6"/>
        </svg>
      `;
      const encoded = encodeURIComponent(svg.trim());
      return `url("data:image/svg+xml,${encoded}") ${center} ${center}, crosshair`;
    }

    case 'eraser': {
      // Cuadrado SVG del tamaño del borrador
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
          <rect x="2" y="2" width="${scaledSize}" height="${scaledSize}"
            fill="none" stroke="black" stroke-width="1.5" opacity="0.8"/>
          <rect x="2" y="2" width="${scaledSize}" height="${scaledSize}"
            fill="none" stroke="white" stroke-width="0.5" opacity="0.6"/>
        </svg>
      `;
      const encoded = encodeURIComponent(svg.trim());
      return `url("data:image/svg+xml,${encoded}") ${center} ${center}, crosshair`;
    }

    case 'fill':
    case 'bucket':
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M6 14l10-10 12 12-10 10z' fill='%23ffffff' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Cpath d='M16 4l12 12' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Cpath d='M6 14s-3 2-4 5c-1 3 1 5 4 4 3-1 4-4 4-4' fill='%2338bdf8' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Ccircle cx='2' cy='22' r='2' fill='%2338bdf8'/%3E%3C/svg%3E\") 2 22, pointer";

    case 'eyedropper':
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M2 30l6-6 18-18a4 4 0 0 0-6-6L2 18z' fill='%23ffffff' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Cpath d='M2 30l4-1' stroke='%230f2b5c' stroke-width='2'/%3E%3Cpath d='M16 6l10 10' stroke='%230f2b5c' stroke-width='1.5'/%3E%3C/svg%3E\") 2 30, pointer";

    case 'text':
      return hasActiveTextBox ? 'crosshair' : 'text';
    case 'select':
      return 'crosshair';
    case 'move':
      return 'move';
    case 'zoom':
      return 'zoom-in';
    default:
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cline x1='16' y1='4' x2='16' y2='28' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Cline x1='4' y1='16' x2='28' y2='16' stroke='%230f2b5c' stroke-width='1.5'/%3E%3Ccircle cx='16' cy='16' r='3' fill='none' stroke='%2338bdf8' stroke-width='1.5'/%3E%3C/svg%3E\") 16 16, crosshair";
  }
}

export function CanvasArea({
  canvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onDoubleClick,
  drawTextOnCanvas,
  ignoreBlurRef,
  justCommittedTextRef,
  startResizeSelection,
}: CanvasAreaProps) {
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const brushSize = useAppStore((state) => state.brushSize);
  const activeTool = useAppStore((state) => state.activeTool);
  const cursorX = useAppStore((state) => state.cursorX);
  const cursorY = useAppStore((state) => state.cursorY);
  const smoothing = useAppStore((state) => state.smoothing);

  const width = useCanvasStore((state) => state.width);
  const height = useCanvasStore((state) => state.height);
  const canvasBackground = useCanvasStore((state) => state.canvasBackground);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const showRulers = useCanvasStore((state) => state.showRulers);
  const activeSelection = useCanvasStore((state) => state.activeSelection);

  // Estados para barra espaciadora / paneo
  const isSpacePressed = useAppStore((state) => state.isSpacePressed);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Refs de las reglas
  const hRulerRef = useRef<HTMLCanvasElement | null>(null);
  const vRulerRef = useRef<HTMLCanvasElement | null>(null);

  // Entrada de texto flotante WYSIWYG
  const textInputCoords = useAppStore((state) => state.textInputCoords);
  const setTextInputCoords = useAppStore((state) => state.setTextInputCoords);
  const textValue = useAppStore((state) => state.textValue);
  const setTextValue = useAppStore((state) => state.setTextValue);
  const fgColor = useAppStore((state) => state.fgColor);
  const textFont = useAppStore((state) => state.textFont);
  const textSize = useAppStore((state) => state.textSize);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Manejador del zoom mediante rueda de mouse + Control
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const step = 25;
        if (e.deltaY < 0) {
          setZoom(zoom + step);
        } else {
          setZoom(zoom - step);
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, setZoom]);

  // Manejadores del Paneo (Drag-to-Scroll con Space)
  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Si la barra espaciadora está presionada, iniciamos paneo
    if (isSpacePressed && containerRef.current) {
      isPanningRef.current = true;
      startPanRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      };
      e.preventDefault();
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current && containerRef.current) {
      const dx = e.clientX - startPanRef.current.x;
      const dy = e.clientY - startPanRef.current.y;
      const container = containerRef.current;
      if (container) {
        container.scrollLeft = startPanRef.current.scrollLeft - dx;
        container.scrollTop = startPanRef.current.scrollTop - dy;
      }
      e.preventDefault();
    }
  };

  const handleContainerMouseUpOrLeave = () => {
    isPanningRef.current = false;
  };

  // Foco automático del textarea al aparecer con retardo para evitar robo de foco del navegador
  useEffect(() => {
    if (textInputCoords && textareaRef.current) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textInputCoords]);

  // Consolidar el texto y dibujarlo en el lienzo
  const commitText = useCallback(() => {
    // Activar flag para que el mousedown del canvas que sigue al click en
    // "Aplicar" o al blur no abra un nuevo cuadro de texto inmediatamente.
    // Se auto-resetea en 150ms para permitir clics posteriores normales.
    if (justCommittedTextRef) {
      justCommittedTextRef.current = true;
      setTimeout(() => {
        if (justCommittedTextRef) {
          justCommittedTextRef.current = false;
        }
      }, 150);
    }

    const state = useAppStore.getState();
    const currentCoords = state.textInputCoords;
    const currentValue = state.textValue;

    if (currentCoords && drawTextOnCanvas && currentValue.trim()) {
      drawTextOnCanvas(currentValue, currentCoords.x, currentCoords.y);
    }
    setTextInputCoords(null);
    setTextValue('');
  }, [drawTextOnCanvas, setTextInputCoords, setTextValue, justCommittedTextRef]);

  // Cuando el textarea pierde foco, consolidar el texto
  const handleTextBlur = useCallback(() => {
    if (ignoreBlurRef?.current) {
      ignoreBlurRef.current = false;
      return;
    }
    commitText();
  }, [commitText, ignoreBlurRef]);

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      // Escape: descartar sin guardar
      e.preventDefault();
      setTextInputCoords(null);
      setTextValue('');
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter o Cmd+Enter: confirmar y dibujar en el lienzo
      e.preventDefault();
      commitText();
    }
  };

  // --- ARRASTRE DE CAJA DE TEXTO WYSIWYG ---
  const handleToolbarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Solo arrastrar con clic izquierdo
      e.preventDefault();
      e.stopPropagation();

      if (!textInputCoords) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startCoords = { x: textInputCoords.x, y: textInputCoords.y };
      const currentZoom = zoom;

      const onMouseMove = (moveEvent: MouseEvent) => {
        // Calcular el desplazamiento compensando el nivel de zoom activo
        const dx = (moveEvent.clientX - startX) / (currentZoom / 100);
        const dy = (moveEvent.clientY - startY) / (currentZoom / 100);

        const newX = Math.round(startCoords.x + dx);
        const newY = Math.round(startCoords.y + dy);

        setTextInputCoords({ x: newX, y: newY });
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [textInputCoords, zoom, setTextInputCoords],
  );

  // --- DIBUJO DE REGLAS COORDENADAS (RULERS) ---
  const updateRulers = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const hRuler = hRulerRef.current;
    const vRuler = vRulerRef.current;

    if (!canvas || !container || !hRuler || !vRuler || !showRulers) return;

    // Canvas 2D cannot resolve CSS custom properties — use getComputedStyle
    const rootStyles = getComputedStyle(document.documentElement);
    const bgColor =
      rootStyles.getPropertyValue('--bg-primary').trim() || '#eef2f6';
    const borderCol =
      rootStyles.getPropertyValue('--border-color').trim() || '#ccd4dc';
    const textCol =
      rootStyles.getPropertyValue('--text-muted').trim() || '#7e8e9f';
    const accentCol =
      rootStyles.getPropertyValue('--accent-hover').trim() || '#00a2ff';

    const canvasRect = canvas.getBoundingClientRect();
    const hRect = hRuler.getBoundingClientRect();
    const vRect = vRuler.getBoundingClientRect();

    // 1. Dibujar regla horizontal
    const hCtx = hRuler.getContext('2d');
    if (!hCtx) return;
    if (hRuler.width !== hRuler.clientWidth) {
      hRuler.width = hRuler.clientWidth;
    }
    const hWidth = hRuler.width;

    hCtx.clearRect(0, 0, hWidth, 20);
    hCtx.fillStyle = bgColor;
    hCtx.fillRect(0, 0, hWidth, 20);

    hCtx.strokeStyle = borderCol;
    hCtx.lineWidth = 1;
    hCtx.beginPath();
    hCtx.moveTo(0, 19.5);
    hCtx.lineTo(hWidth, 19.5);
    hCtx.stroke();

    // 2. Dibujar regla vertical
    const vCtx = vRuler.getContext('2d');
    if (!vCtx) return;
    if (vRuler.height !== vRuler.clientHeight) {
      vRuler.height = vRuler.clientHeight;
    }
    const vHeight = vRuler.height;

    vCtx.clearRect(0, 0, 20, vHeight);
    vCtx.fillStyle = bgColor;
    vCtx.fillRect(0, 0, 20, vHeight);

    vCtx.strokeStyle = borderCol;
    vCtx.lineWidth = 1;
    vCtx.beginPath();
    vCtx.moveTo(19.5, 0);
    vCtx.lineTo(19.5, vHeight);
    vCtx.stroke();

    // Posición del lienzo relativa a las reglas
    const canvasLeftInRuler = canvasRect.left - hRect.left;
    const canvasTopInRuler = canvasRect.top - vRect.top;

    const visualScale = canvasRect.width / width; // escala visual real en pantalla

    // Cálculo del intervalo de ticks adaptativo
    let step = 50;
    if (visualScale >= 8) step = 5;
    else if (visualScale >= 4) step = 10;
    else if (visualScale >= 2) step = 20;
    else if (visualScale >= 1) step = 50;
    else if (visualScale >= 0.5) step = 100;
    else step = 200;

    // Dibujar números y marcas en regla horizontal
    hCtx.fillStyle = textCol;
    hCtx.font = '8px monospace';
    hCtx.textAlign = 'left';
    hCtx.textBaseline = 'top';

    const startX = Math.floor(-canvasLeftInRuler / visualScale / step) * step;
    const endX =
      Math.ceil((hWidth - canvasLeftInRuler) / visualScale / step) * step;

    for (let x = Math.max(0, startX); x <= Math.min(width, endX); x += step) {
      const screenX = canvasLeftInRuler + x * visualScale;

      hCtx.fillStyle = textCol;
      hCtx.fillRect(screenX, 12, 1, 8);

      // Sub-ticks
      const subStep = step / 5;
      for (let i = 1; i < 5; i++) {
        const sx = screenX + i * subStep * visualScale;
        if (sx >= 0 && sx <= hWidth) {
          hCtx.fillRect(sx, 16, 1, 4);
        }
      }

      hCtx.fillText(`${x}`, screenX + 2, 2);
    }

    // Dibujar números y marcas en regla vertical
    vCtx.fillStyle = textCol;
    vCtx.font = '8px monospace';
    vCtx.textAlign = 'left';
    vCtx.textBaseline = 'top';

    const startY = Math.floor(-canvasTopInRuler / visualScale / step) * step;
    const endY =
      Math.ceil((vHeight - canvasTopInRuler) / visualScale / step) * step;

    for (let y = Math.max(0, startY); y <= Math.min(height, endY); y += step) {
      const screenY = canvasTopInRuler + y * visualScale;

      vCtx.fillStyle = textCol;
      vCtx.fillRect(12, screenY, 8, 1);

      // Sub-ticks
      const subStep = step / 5;
      for (let i = 1; i < 5; i++) {
        const sy = screenY + i * subStep * visualScale;
        if (sy >= 0 && sy <= vHeight) {
          vCtx.fillRect(16, sy, 4, 1);
        }
      }

      vCtx.save();
      vCtx.translate(2, screenY + 2);
      vCtx.fillText(`${y}`, 0, 0);
      vCtx.restore();
    }

    // 3. Dibujar marcador de cursor en tiempo real (en el color de acento)
    if (cursorX !== null && cursorY !== null) {
      const screenCursorX = canvasLeftInRuler + cursorX * visualScale;
      const screenCursorY = canvasTopInRuler + cursorY * visualScale;

      // Marcador horizontal
      if (screenCursorX >= 0 && screenCursorX <= hWidth) {
        hCtx.strokeStyle = accentCol;
        hCtx.lineWidth = 1;
        hCtx.beginPath();
        hCtx.moveTo(screenCursorX, 0);
        hCtx.lineTo(screenCursorX, 20);
        hCtx.stroke();
      }

      // Marcador vertical
      if (screenCursorY >= 0 && screenCursorY <= vHeight) {
        vCtx.strokeStyle = accentCol;
        vCtx.lineWidth = 1;
        vCtx.beginPath();
        vCtx.moveTo(0, screenCursorY);
        vCtx.lineTo(20, screenCursorY);
        vCtx.stroke();
      }
    }
  }, [width, height, cursorX, cursorY, showRulers, canvasRef.current]);

  // Ejecutar updateRulers después de cada render, scroll o resize
  useEffect(() => {
    updateRulers();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateRulers();
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateRulers);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateRulers);
    };
  }, [updateRulers]);

  // Recalcular el cursor eficientemente con useMemo
  const dynamicCursor = useMemo(() => {
    if (isSpacePressed) {
      return isPanningRef.current ? 'grabbing' : 'grab';
    }
    return getDynamicCursor(activeTool, brushSize, zoom, !!textInputCoords);
  }, [activeTool, brushSize, zoom, isSpacePressed, textInputCoords]);

  const canvasBackgroundClass = useMemo(() => {
    if (canvasBackground === 'transparent') return 'canvas-transparent-bg';
    if (canvasBackground === 'black') return 'bg-black';
    return 'bg-white';
  }, [canvasBackground]);

  const lineCount = textValue.split('\n').length || 1;
  const textareaHeight = lineCount * (textSize * 1.2) + 12;

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      style={{
        display: 'grid',
        gridTemplateColumns: showRulers ? '20px 1fr' : '0px 1fr',
        gridTemplateRows: showRulers ? '20px 1fr' : '0px 1fr',
      }}
    >
      {showRulers && (
        <>
          {/* Corner (top-left 20x20) */}
          <div className="bg-[var(--bg-primary)] border-r border-b border-[var(--border-color)] w-5 h-5 flex-shrink-0 z-20 theme-transition" />

          {/* Horizontal Ruler Container */}
          <div className="h-5 overflow-hidden z-20 relative bg-[var(--bg-primary)] border-b border-[var(--border-color)] theme-transition">
            <canvas
              ref={hRulerRef}
              className="w-full h-full block font-mono"
              style={{ height: '20px' }}
            />
          </div>

          {/* Vertical Ruler Container */}
          <div className="w-5 overflow-hidden z-20 relative bg-[var(--bg-primary)] border-r border-[var(--border-color)] theme-transition">
            <canvas
              ref={vRulerRef}
              className="w-full h-full block font-mono"
              style={{ width: '20px' }}
            />
          </div>
        </>
      )}

      {/* Main Viewport Container */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: el contenedor de lienzo maneja paneo y zoom interactivos no semánticos */}
      <div
        ref={containerRef}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUpOrLeave}
        onMouseLeave={handleContainerMouseUpOrLeave}
        className={`bg-[var(--bg-secondary)] pixel-grid-bg overflow-auto p-8 flex items-start justify-center relative select-none theme-transition ${
          isSpacePressed
            ? isPanningRef.current
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
        style={{
          gridColumnStart: showRulers ? 2 : 1,
          gridRowStart: showRulers ? 2 : 1,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Contenedor del zoom para centrar el lienzo */}
        <div
          className="relative transition-transform duration-75 flex items-center justify-center min-w-max min-h-max"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            marginTop: '10px',
          }}
        >
          {/* El lienzo HTML5 (Canvas) */}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            onContextMenu={(e) => e.preventDefault()} // Desactivar clic derecho
            className={`${smoothing ? '' : 'pixelated-canvas'} shadow-sm border border-[var(--border-color)] theme-transition ${canvasBackgroundClass}`}
            style={{ cursor: dynamicCursor }}
          />

          {/* Cuadrícula Visual sobre el Lienzo (Feature 4) */}
          {showGrid && (
            <svg
              width={width}
              height={height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                opacity: 0.3,
                zIndex: 10,
              }}
            >
              <title>Cuadrícula Visual</title>
              <defs>
                <pattern
                  id="visual-grid-pattern"
                  width={gridSize}
                  height={gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke="var(--text-main)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#visual-grid-pattern)"
              />
            </svg>
          )}

          {/* Hormigas marchantes animadas en selección activa */}
          {activeSelection && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
                zIndex: 40,
              }}
            >
              <title>Selección Activa</title>
              <rect
                className="selection-overlay-shadow"
                x={activeSelection.x}
                y={activeSelection.y}
                width={activeSelection.width}
                height={activeSelection.height}
              />
              <rect
                className="selection-overlay"
                x={activeSelection.x}
                y={activeSelection.y}
                width={activeSelection.width}
                height={activeSelection.height}
              />
              {/* Manejadores premium de cambio de tamaño (8 puntos de control) */}
              {(() => {
                const { x, y, width, height } = activeSelection;
                const handles = [
                  { name: 'nw', cx: x, cy: y, cursor: 'nwse-resize' },
                  { name: 'n', cx: x + width / 2, cy: y, cursor: 'ns-resize' },
                  { name: 'ne', cx: x + width, cy: y, cursor: 'nesw-resize' },
                  { name: 'e', cx: x + width, cy: y + height / 2, cursor: 'ew-resize' },
                  { name: 'se', cx: x + width, cy: y + height, cursor: 'nwse-resize' },
                  { name: 's', cx: x + width / 2, cy: y + height, cursor: 'ns-resize' },
                  { name: 'sw', cx: x, cy: y + height, cursor: 'nesw-resize' },
                  { name: 'w', cx: x, cy: y + height / 2, cursor: 'ew-resize' },
                ];

                return handles.map((h) => (
                  <rect
                    key={h.name}
                    x={h.cx - 4}
                    y={h.cy - 4}
                    width="8"
                    height="8"
                    fill="var(--accent-color)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{
                      cursor: h.cursor,
                      pointerEvents: 'all',
                      filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.35))',
                    }}
                    onMouseDown={(e) => startResizeSelection(h.name, e)}
                  />
                ));
              })()}
            </svg>
          )}

          {/* Textarea flotante in-situ WYSIWYG */}
          {textInputCoords && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: `${textInputCoords.x}px`,
                top: `${textInputCoords.y}px`,
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              {/* Barra de herramientas flotante sobre la entrada */}
              <div
                onMouseDown={handleToolbarMouseDown}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
                  padding: '4px 8px',
                  borderRadius: '4px 4px 0 0',
                  transform: 'translateY(-100%)',
                  position: 'absolute',
                  top: '-4px',
                  left: '0',
                  whiteSpace: 'nowrap',
                  fontSize: '8.5px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: 'var(--text-main)',
                  zIndex: 60,
                  cursor: 'move', // Cursor de mover
                  userSelect: 'none',
                }}
                title="Haz clic y arrastra aquí para mover la caja de texto"
              >
                {/* Ícono de movimiento (flecha de cuatro puntas) SVG premium */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '2px', color: 'var(--accent-color)' }}
                >
                  <title>Mover Caja de Texto</title>
                  <polyline points="5 9 2 12 5 15" />
                  <polyline points="9 5 12 2 15 5" />
                  <polyline points="15 19 12 22 9 19" />
                  <polyline points="19 9 22 12 19 15" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
                <span
                  style={{ color: 'var(--accent-color)', marginRight: '2px' }}
                >
                  📝 TEXTO
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Detener propagación para no activar el drag de la toolbar
                    e.stopPropagation();
                    // Prevenir que el blur del textarea dispare commitText
                    // antes de que el onClick lo haga — evita el doble commit
                    if (ignoreBlurRef) ignoreBlurRef.current = true;
                  }}
                  onClick={commitText}
                  title="Aplicar texto al lienzo (Ctrl+Enter)"
                  className="px-2 py-0.5 bg-[var(--accent-color)] text-white border border-transparent rounded text-[8px] font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  ✓ Aplicar
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Detener propagación para no activar el drag de la toolbar
                    e.stopPropagation();
                    // Ignorar el blur que se dispara al perder foco
                    if (ignoreBlurRef) ignoreBlurRef.current = true;
                  }}
                  onClick={() => {
                    setTextInputCoords(null);
                    setTextValue('');
                  }}
                  title="Descartar texto (Esc)"
                  className="px-2 py-0.5 bg-red-500 text-white border border-transparent rounded text-[8px] font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  ✗ Cancelar
                </button>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    marginLeft: '4px',
                    fontSize: '7.5px',
                  }}
                >
                  Ctrl+Enter para guardar | Enter para nueva línea
                </span>
              </div>

              {/* Textarea de escritura real-time */}
              <textarea
                ref={textareaRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={handleTextKeyDown}
                placeholder="Escribe aquí tu texto..."
                style={{
                  fontFamily: textFont,
                  fontSize: `${textSize}px`,
                  color: fgColor,
                  caretColor: fgColor,
                  background: 'transparent',
                  border: '1px dashed var(--accent-color)',
                  borderRadius: '3px',
                  outline: 'none',
                  resize: 'none',
                  margin: 0,
                  padding: '4px 6px',
                  minWidth: '200px',
                  maxWidth: `${width - textInputCoords.x}px`,
                  width: `${Math.max(
                    200,
                    textValue
                      .split('\n')
                      .reduce(
                        (max, line) =>
                          Math.max(max, line.length * (textSize * 0.55)),
                        200,
                      ),
                  )}px`,
                  height: `${textareaHeight}px`,
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  textShadow:
                    '0 0 1px rgba(255,255,255,0.6), 0 0 1px rgba(0,0,0,0.6)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
