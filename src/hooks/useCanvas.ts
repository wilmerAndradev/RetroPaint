import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { floodFill } from '../utils/floodFill';
import { useHistory } from './useHistory';

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // App store states
  const activeTool = useAppStore((state) => state.activeTool);
  const fgColor = useAppStore((state) => state.fgColor);
  const bgColor = useAppStore((state) => state.bgColor);
  const brushSize = useAppStore((state) => state.brushSize);
  const opacity = useAppStore((state) => state.opacity);
  const fillShapes = useAppStore((state) => state.fillShapes);
  const brushStyle = useAppStore((state) => state.brushStyle);
  const setCursorCoords = useAppStore((state) => state.setCursorCoords);
  const setStatusText = useAppStore((state) => state.setStatusText);

  // Canvas store states
  const width = useCanvasStore((state) => state.width);
  const height = useCanvasStore((state) => state.height);

  // History hook
  const { saveHistory, undo, redo, canUndo, canRedo } = useHistory();

  // Internal drawing states
  const isDrawingRef = useRef(false);
  const startCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const savedImageDataRef = useRef<ImageData | null>(null);
  const activeColorRef = useRef<string>('#000000');
  const secondaryColorRef = useRef<string>('#ffffff');
  const drawButtonRef = useRef<number>(0); // 0 = Izquierdo, 2 = Derecho
  const sprayIntervalRef = useRef<number | null>(null);
  const currentStrokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- NUEVOS ESTADOS INTERNOS PARA HERRAMIENTAS AVANZADAS ---

  // 1. Curva Bézier (2 pasos: paso 0 = definir línea, paso 1 = curvar)
  const bezierStepRef = useRef<number>(0);
  const bezierStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const bezierEndRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2. Polígono (array de puntos y estado activo)
  const polygonPointsRef = useRef<{ x: number; y: number }[]>([]);

  // 3. Selección y Portapapeles interactivo
  const selectionRectRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const isDraggingSelectionRef = useRef<boolean>(false);
  const selectionDragStartRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const selectionImageRef = useRef<ImageData | null>(null);
  const selectionOriginalPosRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const hasCutOrMovedRef = useRef<boolean>(false); // Si ya se borró el hueco original

  // Portapapeles global de la sesión (persiste en la sesión del hook)
  const clipboardImageRef = useRef<ImageData | null>(null);
  const clipboardSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const getOffscreenCanvas = useCallback((w: number, h: number) => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    if (
      offscreenCanvasRef.current.width !== w ||
      offscreenCanvasRef.current.height !== h
    ) {
      offscreenCanvasRef.current.width = w;
      offscreenCanvasRef.current.height = h;
    }
    return offscreenCanvasRef.current;
  }, []);

  // Limpiar intervalo de spray al desmontar
  useEffect(() => {
    return () => {
      if (sprayIntervalRef.current) {
        clearInterval(sprayIntervalRef.current);
      }
    };
  }, []);

  // Inicializar canvas con fondo transparente o blanco
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory(canvas);
      }
    }
  }, [saveHistory]);

  // Maneja redimensionamiento de lienzo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Guardar contenido actual
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        // Cambiar tamaño real
        canvas.width = width;
        canvas.height = height;

        // Rellenar fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Restaurar contenido previo
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  }, [width, height]);

  // Obtener coordenadas locales del mouse en el lienzo (alineado al zoom)
  const getCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    return { x, y };
  }, []);

  // Consolidar selección flotante activa si existe
  const consolidateSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectionRectRef.current || !selectionImageRef.current)
      return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pintar la selección en su posición actual de forma definitiva
    const pos = selectionOriginalPosRef.current;

    // Crear canvas temporal para dibujar el ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = selectionRectRef.current.w;
    tempCanvas.height = selectionRectRef.current.h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(selectionImageRef.current, 0, 0);
      ctx.drawImage(tempCanvas, pos.x, pos.y);
    }

    // Limpiar estados
    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;

    saveHistory(canvas);
    setStatusText('Selección consolidada en el lienzo');
  }, [saveHistory, setStatusText]);

  // Consolidar selección flotante de forma automática si se cambia de herramienta
  useEffect(() => {
    if (activeTool !== 'select') {
      consolidateSelection();
    }
    // Cancelar trazos a medio dibujar si se cambia de herramienta
    if (activeTool !== 'bezier') {
      bezierStepRef.current = 0;
    }
    if (activeTool !== 'polygon') {
      polygonPointsRef.current = [];
    }
  }, [activeTool, consolidateSelection]);

  // Dibuja una línea suavizada o de píxeles gruesos
  const drawLine = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      size: number,
      style: typeof brushStyle,
    ) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (style === 'pixel') {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let cx = x1;
        let cy = y1;

        while (true) {
          ctx.fillRect(
            cx - Math.floor(size / 2),
            cy - Math.floor(size / 2),
            size,
            size,
          );
          if (cx === x2 && cy === y2) break;
          const e2 = 2 * err;
          if (e2 > -dy) {
            err -= dy;
            cx += sx;
          }
          if (e2 < dx) {
            err += dx;
            cy += sy;
          }
        }
      } else if (style === 'chalk') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(distance / 2));

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = x1 + dx * t;
          const cy = y1 + dy * t;
          for (let j = 0; j < size * 3; j++) {
            const offsetX = (Math.random() - 0.5) * size * 1.5;
            const offsetY = (Math.random() - 0.5) * size * 1.5;
            ctx.fillRect(
              Math.round(cx + offsetX),
              Math.round(cy + offsetY),
              1,
              1,
            );
          }
        }
      } else if (style === 'watercolor') {
        ctx.save();
        ctx.globalAlpha = 0.08 * opacity;
        ctx.lineWidth = size * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.lineWidth = size;
        ctx.lineCap = activeTool === 'pencil' ? 'square' : 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    },
    [activeTool, opacity],
  );

  // Aplicar spray en una posición específica
  const applySpray = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      color: string,
      size: number,
    ) => {
      ctx.fillStyle = color;
      const radius = size * 5;
      const density = 8 + size * 4;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const sx = Math.round(x + Math.cos(angle) * r);
        const sy = Math.round(y + Math.sin(angle) * r);
        ctx.fillRect(sx, sy, 1, 1);
      }
    },
    [],
  );

  // Snapping de coordenadas (línea recta)
  const getSnappedCoords = useCallback(
    (startX: number, startY: number, curX: number, curY: number) => {
      const dx = curX - startX;
      const dy = curY - startY;
      const angle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return {
        x: Math.round(startX + Math.cos(snappedAngle) * distance),
        y: Math.round(startY + Math.sin(snappedAngle) * distance),
      };
    },
    [],
  );

  // --- MÉTODOS DE SELECCIÓN EXPUESTOS ---

  const deleteSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectionRectRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Rellenar la zona original con blanco (si no se había borrado ya al arrastrar)
    if (!hasCutOrMovedRef.current) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        selectionOriginalPosRef.current.x,
        selectionOriginalPosRef.current.y,
        selectionRectRef.current.w,
        selectionRectRef.current.h,
      );
    }

    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;
    saveHistory(canvas);
    setStatusText('Selección eliminada');
  }, [saveHistory, setStatusText]);

  const copySelection = useCallback(() => {
    if (!selectionRectRef.current || !selectionImageRef.current) {
      setStatusText('No hay ningún área seleccionada para copiar');
      return;
    }

    clipboardImageRef.current = selectionImageRef.current;
    clipboardSizeRef.current = {
      w: selectionRectRef.current.w,
      h: selectionRectRef.current.h,
    };
    setStatusText('Área seleccionada copiada al portapapeles');
  }, [setStatusText]);

  const cutSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectionRectRef.current || !selectionImageRef.current) {
      setStatusText('No hay ningún área seleccionada para cortar');
      return;
    }

    // Copiar primero
    copySelection();

    // Rellenar hueco con blanco
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        selectionOriginalPosRef.current.x,
        selectionOriginalPosRef.current.y,
        selectionRectRef.current.w,
        selectionRectRef.current.h,
      );
    }

    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;
    saveHistory(canvas);
    setStatusText('Área seleccionada cortada al portapapeles');
  }, [copySelection, saveHistory, setStatusText]);

  const pasteSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clipboardImageRef.current) {
      setStatusText('El portapapeles de la sesión está vacío');
      return;
    }

    // Consolidar selección flotante previa si la hay
    consolidateSelection();

    // Crear una nueva selección flotante en la esquina superior izquierda (10, 10)
    const w = clipboardSizeRef.current.w;
    const h = clipboardSizeRef.current.h;

    selectionRectRef.current = { x: 10, y: 10, w, h };
    selectionImageRef.current = clipboardImageRef.current;
    selectionOriginalPosRef.current = { x: 10, y: 10 };
    hasCutOrMovedRef.current = true; // Ya es una copia flotante pegada

    // Dibujar de forma flotante en el lienzo para previsualización
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Guardar el estado actual del lienzo (antes de pegar) en savedImageDataRef
      savedImageDataRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(clipboardImageRef.current, 0, 0);
        ctx.drawImage(tempCanvas, 10, 10);
      }
      // Dibujar caja discontinua
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(10, 10, w, h);
      ctx.restore();
    }

    useAppStore.getState().setActiveTool('select');
    setStatusText('Selección pegada en el lienzo. Puedes moverla ahora.');
  }, [consolidateSelection, setStatusText]);

  // --- MÉTODO EXPRESAMENTE DE TEXTO WYSIWYG ---

  const drawTextOnCanvas = useCallback(
    (text: string, x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !text.trim()) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.fillStyle = fgColor;
      ctx.font = `${brushSize * 4 + 10}px "Press Start 2P"`;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, y);
      ctx.restore();

      saveHistory(canvas);
      setStatusText('Texto insertado en el lienzo');
    },
    [fgColor, brushSize, saveHistory, setStatusText],
  );

  // --- EVENTOS DEL LIENZO ---

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoords(e);
      drawButtonRef.current = e.button;

      // Click izquierdo -> fgColor, Click derecho -> bgColor
      if (e.button === 2) {
        activeColorRef.current = bgColor;
        secondaryColorRef.current = fgColor;
      } else {
        activeColorRef.current = fgColor;
        secondaryColorRef.current = bgColor;
      }

      // --- CASO 1: MANIPULAR SELECCIÓN EXISTENTE ---
      if (activeTool === 'select' && selectionRectRef.current) {
        const rect = selectionRectRef.current;
        const pos = selectionOriginalPosRef.current;

        // Comprobar si el clic está dentro del área de selección flotante
        if (
          coords.x >= pos.x &&
          coords.x <= pos.x + rect.w &&
          coords.y >= pos.y &&
          coords.y <= pos.y + rect.h
        ) {
          isDraggingSelectionRef.current = true;
          selectionDragStartRef.current = coords;

          // Si es el primer arrastre de la selección recién cortada/creada,
          // rellenamos su ubicación original de fondo con blanco
          if (!hasCutOrMovedRef.current) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(pos.x, pos.y, rect.w, rect.h);
            ctx.restore();
            hasCutOrMovedRef.current = true;
          }

          // Guardar el lienzo con el hueco vacío en savedImageDataRef
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          return;
        }

        // Si hizo clic FUERA de la selección, la consolidamos de forma fija
        consolidateSelection();
      }

      // --- CASO 2: CURVA BÉZIER PASO 1 (Curvar línea) ---
      if (activeTool === 'bezier' && bezierStepRef.current === 1) {
        isDrawingRef.current = true;
        lastCoordsRef.current = coords;
        return;
      }

      // --- CASO 3: POLÍGONO INTERACTIVO MULTI-PUNTO ---
      if (activeTool === 'polygon') {
        const pts = polygonPointsRef.current;

        // Si el usuario hace clic derecho o está muy cerca del punto inicial, cerramos el polígono
        const nearStart =
          pts.length > 2 &&
          Math.abs(coords.x - pts[0].x) < 8 &&
          Math.abs(coords.y - pts[0].y) < 8;

        if (e.button === 2 || nearStart) {
          if (pts.length > 2) {
            // Cargar estado inicial antes de previsualización
            if (savedImageDataRef.current) {
              ctx.putImageData(savedImageDataRef.current, 0, 0);
            }

            ctx.save();
            ctx.strokeStyle = activeColorRef.current;
            ctx.fillStyle = secondaryColorRef.current;
            ctx.lineWidth = brushSize;

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();

            if (fillShapes) ctx.fill();
            ctx.stroke();
            ctx.restore();

            saveHistory(canvas);
            setStatusText('Polígono consolidado');
          }
          polygonPointsRef.current = [];
          savedImageDataRef.current = null;
          return;
        }

        // Si es el primer punto
        if (pts.length === 0) {
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }

        polygonPointsRef.current.push(coords);
        lastCoordsRef.current = coords;
        return;
      }

      // --- CASO 4: TEXTO EN CALIENTE WYSIWYG ---
      if (activeTool === 'text') {
        useAppStore.getState().setTextInputCoords({ x: coords.x, y: coords.y });
        return;
      }

      // --- CASO COMPORTAMIENTO DE DIBUJO ESTÁNDAR ---
      isDrawingRef.current = true;
      startCoordsRef.current = coords;
      lastCoordsRef.current = coords;

      savedImageDataRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      ctx.save();
      ctx.globalAlpha = opacity;

      if (activeTool === 'bucket') {
        floodFill(canvas, coords.x, coords.y, activeColorRef.current, 30);
        saveHistory(canvas);
        isDrawingRef.current = false;
      } else if (activeTool === 'eyedropper') {
        const pixelData = ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const hex = `#${(
          (1 << 24) +
          (pixelData[0] << 16) +
          (pixelData[1] << 8) +
          pixelData[2]
        )
          .toString(16)
          .slice(1)}`;

        if (e.button === 2) {
          useAppStore.getState().setBgColor(hex);
          setStatusText(`Color de fondo leído: ${hex.toUpperCase()}`);
        } else {
          useAppStore.getState().setFgColor(hex);
          setStatusText(`Color frontal leído: ${hex.toUpperCase()}`);
        }
        // Guardar también en los recientes de la sesión
        useAppStore.getState().addRecentColor(hex);
        isDrawingRef.current = false;
      } else if (
        activeTool === 'pencil' ||
        activeTool === 'brush' ||
        activeTool === 'eraser' ||
        activeTool === 'spray'
      ) {
        const color =
          activeTool === 'eraser' ? bgColor : activeColorRef.current;
        const size = brushSize; // ¡CORREGIDO!: Lápiz usa brushSize reactivo de forma nativa
        const style =
          activeTool === 'eraser'
            ? 'normal'
            : activeTool === 'spray'
              ? 'spray'
              : brushStyle;

        currentStrokePointsRef.current = [coords];

        if (style === 'spray') {
          if (sprayIntervalRef.current) {
            clearInterval(sprayIntervalRef.current);
          }
          applySpray(ctx, coords.x, coords.y, color, size);
          sprayIntervalRef.current = window.setInterval(() => {
            const currentCoords = lastCoordsRef.current;
            const activeCanvas = canvasRef.current;
            if (activeCanvas) {
              const activeCtx = activeCanvas.getContext('2d');
              if (activeCtx) {
                const activeColor =
                  drawButtonRef.current === 2
                    ? useAppStore.getState().bgColor
                    : useAppStore.getState().fgColor;
                applySpray(
                  activeCtx,
                  currentCoords.x,
                  currentCoords.y,
                  activeColor,
                  size,
                );
              }
            }
          }, 25);
        } else if (style === 'pixel' || style === 'chalk') {
          drawLine(
            ctx,
            coords.x,
            coords.y,
            coords.x,
            coords.y,
            color,
            size,
            style,
          );
        } else {
          const offscreen = getOffscreenCanvas(canvas.width, canvas.height);
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.clearRect(0, 0, canvas.width, canvas.height);
            offCtx.strokeStyle = color;
            offCtx.fillStyle = color;
            offCtx.lineCap = activeTool === 'pencil' ? 'square' : 'round';
            offCtx.lineJoin = 'round';
            offCtx.lineWidth = style === 'watercolor' ? size * 3 : size;

            offCtx.beginPath();
            offCtx.moveTo(coords.x, coords.y);
            offCtx.lineTo(coords.x, coords.y);
            offCtx.stroke();

            ctx.save();
            ctx.globalAlpha = style === 'watercolor' ? 0.08 * opacity : opacity;
            ctx.drawImage(offscreen, 0, 0);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    },
    [
      activeTool,
      fgColor,
      bgColor,
      brushSize,
      brushStyle,
      opacity,
      getCoords,
      saveHistory,
      setStatusText,
      drawLine,
      applySpray,
      getOffscreenCanvas,
      consolidateSelection,
      fillShapes,
    ],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoords(e);
      setCursorCoords(coords.x, coords.y);

      // --- CASO 1: MOVER ÁREA DE SELECCIÓN FLOTANTE ---
      if (
        activeTool === 'select' &&
        isDraggingSelectionRef.current &&
        selectionRectRef.current
      ) {
        const rect = selectionRectRef.current;
        const dragStart = selectionDragStartRef.current;

        const dx = coords.x - dragStart.x;
        const dy = coords.y - dragStart.y;

        // Restaurar fondo con hueco vacío
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        const newX = selectionOriginalPosRef.current.x + dx;
        const newY = selectionOriginalPosRef.current.y + dy;

        // Dibujar ImageData en canvas virtual
        if (selectionImageRef.current) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = rect.w;
          tempCanvas.height = rect.h;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(selectionImageRef.current, 0, 0);
            ctx.drawImage(tempCanvas, newX, newY);
          }
        }

        // Dibujar caja discontinua en la nueva posición
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(newX, newY, rect.w, rect.h);
        ctx.restore();
        return;
      }

      // --- CASO 2: PREVISUALIZACIÓN POLÍGONO INTERACTIVO ---
      if (activeTool === 'polygon' && polygonPointsRef.current.length > 0) {
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        const pts = polygonPointsRef.current;
        ctx.save();
        ctx.strokeStyle = fgColor;
        ctx.lineWidth = brushSize;

        // Dibujar lados fijos
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        // Dibujar línea discontinua de previsualización al ratón
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (!isDrawingRef.current) return;

      const startCoords = startCoordsRef.current;
      const lastCoords = lastCoordsRef.current;
      const color = activeTool === 'eraser' ? bgColor : activeColorRef.current;
      const size = brushSize; // ¡CORREGIDO!: Grosor reactivo en lápiz
      const style =
        activeTool === 'eraser'
          ? 'normal'
          : activeTool === 'spray'
            ? 'spray'
            : brushStyle;

      ctx.save();
      ctx.globalAlpha = opacity;

      // --- CASO 3: CURVA BÉZIER PASO 2 (Arquear curva) ---
      if (activeTool === 'bezier' && bezierStepRef.current === 1) {
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(bezierStartRef.current.x, bezierStartRef.current.y);
        // El cursor es el punto de control cuadrático
        ctx.quadraticCurveTo(
          coords.x,
          coords.y,
          bezierEndRef.current.x,
          bezierEndRef.current.y,
        );
        ctx.stroke();
        ctx.restore();
        return;
      }

      // --- DIBUJO ESTÁNDAR CONTINUO ---
      if (
        activeTool === 'pencil' ||
        activeTool === 'brush' ||
        activeTool === 'eraser' ||
        activeTool === 'spray'
      ) {
        if (style === 'spray') {
          const dx = coords.x - lastCoords.x;
          const dy = coords.y - lastCoords.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const stepSize = Math.max(3, size);
          const steps = Math.floor(distance / stepSize);

          if (steps > 0) {
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const ix = Math.round(lastCoords.x + dx * t);
              const iy = Math.round(lastCoords.y + dy * t);
              applySpray(ctx, ix, iy, color, size);
            }
          } else {
            applySpray(ctx, coords.x, coords.y, color, size);
          }
        } else if (style === 'pixel' || style === 'chalk') {
          drawLine(
            ctx,
            lastCoords.x,
            lastCoords.y,
            coords.x,
            coords.y,
            color,
            size,
            style,
          );
        } else {
          currentStrokePointsRef.current.push(coords);

          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }

          const offscreen = getOffscreenCanvas(canvas.width, canvas.height);
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.clearRect(0, 0, canvas.width, canvas.height);

            offCtx.strokeStyle = color;
            offCtx.fillStyle = color;
            offCtx.lineCap = activeTool === 'pencil' ? 'square' : 'round';
            offCtx.lineJoin = 'round';
            offCtx.lineWidth = style === 'watercolor' ? size * 3 : size;

            offCtx.beginPath();
            const points = currentStrokePointsRef.current;
            if (points.length > 0) {
              offCtx.moveTo(points[0].x, points[0].y);
              for (let i = 1; i < points.length; i++) {
                offCtx.lineTo(points[i].x, points[i].y);
              }
              offCtx.stroke();
            }

            ctx.save();
            ctx.globalAlpha = style === 'watercolor' ? 0.08 * opacity : opacity;
            ctx.drawImage(offscreen, 0, 0);
            ctx.restore();
          }
        }
        lastCoordsRef.current = coords;
      } else {
        // Formas geométricas
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = secondaryColorRef.current;
        ctx.lineWidth = brushSize;

        let endX = coords.x;
        let endY = coords.y;

        if (
          e.shiftKey &&
          (activeTool === 'line' ||
            activeTool === 'rectangle' ||
            activeTool === 'ellipse')
        ) {
          const snapped = getSnappedCoords(
            startCoords.x,
            startCoords.y,
            endX,
            endY,
          );
          endX = snapped.x;
          endY = snapped.y;
        }

        const widthShape = endX - startCoords.x;
        const heightShape = endY - startCoords.y;

        switch (activeTool) {
          case 'line':
            ctx.beginPath();
            ctx.moveTo(startCoords.x, startCoords.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
          case 'rectangle':
            if (fillShapes) {
              ctx.fillRect(
                startCoords.x,
                startCoords.y,
                widthShape,
                heightShape,
              );
            }
            ctx.strokeRect(
              startCoords.x,
              startCoords.y,
              widthShape,
              heightShape,
            );
            break;
          case 'ellipse': {
            ctx.beginPath();
            const radiusX = Math.abs(widthShape / 2);
            const radiusY = Math.abs(heightShape / 2);
            const centerX = startCoords.x + widthShape / 2;
            const centerY = startCoords.y + heightShape / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            if (fillShapes) {
              ctx.fill();
            }
            ctx.stroke();
            break;
          }
          case 'select': {
            // Dibujar caja discontinua de selección temporal
            ctx.strokeStyle = '#000000';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(
              startCoords.x,
              startCoords.y,
              widthShape,
              heightShape,
            );
            break;
          }
          case 'bezier': {
            // Paso 0: Línea recta de guía
            ctx.beginPath();
            ctx.moveTo(startCoords.x, startCoords.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
          }
          default:
            break;
        }
      }

      ctx.restore();
    },
    [
      activeTool,
      brushSize,
      brushStyle,
      opacity,
      bgColor,
      fgColor,
      fillShapes,
      getCoords,
      setCursorCoords,
      drawLine,
      applySpray,
      getSnappedCoords,
      getOffscreenCanvas,
    ],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (sprayIntervalRef.current) {
        clearInterval(sprayIntervalRef.current);
        sprayIntervalRef.current = null;
      }

      currentStrokePointsRef.current = [];

      const coords = getCoords(e);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // --- CASO 1: CONSOLIDAR MOVER SELECCIÓN ---
      if (
        activeTool === 'select' &&
        isDraggingSelectionRef.current &&
        selectionRectRef.current
      ) {
        isDraggingSelectionRef.current = false;

        const rect = selectionRectRef.current;
        const dragStart = selectionDragStartRef.current;
        const dx = coords.x - dragStart.x;
        const dy = coords.y - dragStart.y;

        const newX = selectionOriginalPosRef.current.x + dx;
        const newY = selectionOriginalPosRef.current.y + dy;

        // Registrar nueva posición definitiva de la caja
        selectionOriginalPosRef.current = { x: newX, y: newY };
        selectionRectRef.current = { ...rect, x: newX, y: newY };

        // Actualizar la instantánea del lienzo antes de dibujar la caja discontinua
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
          if (selectionImageRef.current) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = rect.w;
            tempCanvas.height = rect.h;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.putImageData(selectionImageRef.current, 0, 0);
              ctx.drawImage(tempCanvas, newX, newY);
            }
          }
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }

        // Redibujar la caja de selección activa
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(newX, newY, rect.w, rect.h);
        ctx.restore();
        return;
      }

      // --- CASO 2: CURVA BÉZIER GESTIÓN DE PASOS ---
      if (activeTool === 'bezier') {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        if (bezierStepRef.current === 0) {
          // Línea base completada -> pasar a paso 1 (curvar)
          bezierStartRef.current = startCoordsRef.current;
          bezierEndRef.current = coords;
          bezierStepRef.current = 1;

          // Guardar estado con la línea para curvar en caliente
          savedImageDataRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          setStatusText(
            'Curvas de Bézier: Haz click y arrastra en el lienzo para curvar la línea.',
          );
        } else if (bezierStepRef.current === 1) {
          // Curvatura completada -> consolidar de forma fija
          bezierStepRef.current = 0;
          savedImageDataRef.current = null;
          saveHistory(canvas);
          setStatusText('Curva de Bézier consolidada');
        }
        return;
      }

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      // --- CASO 3: FINALIZAR CAJA DE SELECCIÓN INICIAL ---
      if (activeTool === 'select') {
        const start = startCoordsRef.current;
        const w = Math.abs(coords.x - start.x);
        const h = Math.abs(coords.y - start.y);

        if (w > 4 && h > 4) {
          const x = Math.min(start.x, coords.x);
          const y = Math.min(start.y, coords.y);

          selectionRectRef.current = { x, y, w, h };
          selectionOriginalPosRef.current = { x, y };
          hasCutOrMovedRef.current = false;

          // Extraer porción de imagen del lienzo original (antes del recuadro discontinuo)
          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }
          selectionImageRef.current = ctx.getImageData(x, y, w, h);

          // Redibujar la caja discontinua
          ctx.save();
          ctx.strokeStyle = '#000000';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
          ctx.restore();

          setStatusText(
            `Área seleccionada: ${w}x${h}px. Puedes arrastrar para moverla.`,
          );
        } else {
          selectionRectRef.current = null;
          selectionImageRef.current = null;
          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }
        }
        return;
      }

      // Formas normales
      if (savedImageDataRef.current) {
        savedImageDataRef.current = null;
      }
      saveHistory(canvas);
    },
    [activeTool, getCoords, saveHistory, setStatusText],
  );

  const onMouseLeave = useCallback(() => {
    if (sprayIntervalRef.current) {
      clearInterval(sprayIntervalRef.current);
      sprayIntervalRef.current = null;
    }

    currentStrokePointsRef.current = [];
    setCursorCoords(null, null);

    // Cancelar arrastre de selección si sale del lienzo
    if (activeTool === 'select' && isDraggingSelectionRef.current) {
      isDraggingSelectionRef.current = false;
      return;
    }

    // No consolidamos polígonos ni curvas Bézier al salir del mouse para dar mejor control
    if (activeTool === 'polygon' || activeTool === 'bezier') {
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas) {
      saveHistory(canvas);
    }
  }, [activeTool, saveHistory, setCursorCoords]);

  // Cargar dibujo desde dataURL (galería de sesión)
  const loadDrawingOnCanvas = useCallback(
    (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            saveHistory(canvas);
            setStatusText('Dibujo cargado desde la galería');
          };
          img.src = dataUrl;
        }
      }
    },
    [saveHistory, setStatusText],
  );

  // Limpiar el lienzo
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Limpiar selecciones activas
        selectionRectRef.current = null;
        selectionImageRef.current = null;
        hasCutOrMovedRef.current = false;

        saveHistory(canvas);
        setStatusText('Lienzo limpiado');
      }
    }
  }, [saveHistory, setStatusText]);

  // Acciones de Undo / Redo expuestas directamente
  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Consolidar selección flotante antes de deshacer
      consolidateSelection();
      const success = undo(canvas);
      if (success) setStatusText('Deshacer realizado');
    }
  }, [undo, setStatusText, consolidateSelection]);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      consolidateSelection();
      const success = redo(canvas);
      if (success) setStatusText('Rehacer realizado');
    }
  }, [redo, setStatusText, consolidateSelection]);

  return {
    canvasRef,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    clearCanvas,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,

    // Métodos avanzados de selección
    deleteSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    selectionActive: !!selectionRectRef.current,

    // Método de texto WYSIWYG
    drawTextOnCanvas,
    loadDrawingOnCanvas,
  };
}
