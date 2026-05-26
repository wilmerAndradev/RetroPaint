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
  const smoothing = useAppStore((state) => state.smoothing);
  const smoothingLevel = useAppStore((state) => state.smoothingLevel);
  const softEdges = useAppStore((state) => state.softEdges);
  const softEdgesLevel = useAppStore((state) => state.softEdgesLevel);
  const textFont = useAppStore((state) => state.textFont);
  const textSize = useAppStore((state) => state.textSize);

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

  // Referencias adicionales para estabilización y recuperaciones de selección
  const originalImageDataBeforeMoveRef = useRef<ImageData | null>(null);
  const lastStabilizedCoordsRef = useRef<{ x: number; y: number } | null>(null);

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

    // 1. Restaurar el lienzo al estado limpio con el hueco vacío (para borrar cualquier previsualización)
    if (savedImageDataRef.current) {
      ctx.putImageData(savedImageDataRef.current, 0, 0);
    }

    // 2. Pintar la selección en su posición final de forma definitiva
    const pos = selectionOriginalPosRef.current;
    const rect = selectionRectRef.current;

    // Crear canvas temporal para dibujar el ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.w;
    tempCanvas.height = rect.h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(selectionImageRef.current, 0, 0);
      ctx.drawImage(tempCanvas, pos.x, pos.y);
    }

    // Limpiar estados
    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;
    originalImageDataBeforeMoveRef.current = null;
    savedImageDataRef.current = null;

    // Limpiar recuadro de hormigas marchantes en Zustand
    useCanvasStore.getState().setActiveSelection(null);

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

    // Restaurar el lienzo con el hueco blanco
    if (savedImageDataRef.current) {
      ctx.putImageData(savedImageDataRef.current, 0, 0);
    }

    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;
    originalImageDataBeforeMoveRef.current = null;
    savedImageDataRef.current = null;

    useCanvasStore.getState().setActiveSelection(null);

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

    copySelection();

    // El lienzo ya tiene el hueco blanco en savedImageDataRef.current.
    // Así que simplemente vaciamos la selección flotante, restauramos el hueco y guardamos historia!
    if (savedImageDataRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }
    }

    selectionRectRef.current = null;
    selectionImageRef.current = null;
    hasCutOrMovedRef.current = false;
    originalImageDataBeforeMoveRef.current = null;
    savedImageDataRef.current = null;

    useCanvasStore.getState().setActiveSelection(null);

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

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Guardar el estado original del lienzo (para Escape)
      originalImageDataBeforeMoveRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Guardar el lienzo antes del pegado flotante (que no tiene hueco porque es un paste)
      savedImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(clipboardImageRef.current, 0, 0);
        ctx.drawImage(tempCanvas, 10, 10);
      }
    }

    useCanvasStore.getState().setActiveSelection({ x: 10, y: 10, width: w, height: h });
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

      // Extraer la familia tipográfica primaria para asegurar su carga robusta en el navegador
      const primaryFont = textFont.split(',')[0].trim().replace(/['"]/g, '');
      const fontSpec = `${textSize}px "${primaryFont}"`;

      const executeDraw = () => {
        // A. Consolidar cualquier selección activa previa antes de iniciar esta
        if (selectionRectRef.current) {
          consolidateSelection();
        }

        // B. Calcular las dimensiones exactas del texto
        const lines = text.split('\n');
        
        // Crear un contexto temporal para medir con precisión
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        tempCtx.font = `${textSize}px ${textFont}`;
        let maxLineWidth = 0;
        for (const line of lines) {
          const metrics = tempCtx.measureText(line);
          if (metrics.width > maxLineWidth) {
            maxLineWidth = metrics.width;
          }
        }
        
        // Agregar un pequeño margen de 8px horizontal y 6px vertical
        const textWidth = Math.max(1, Math.ceil(maxLineWidth) + 8);
        const lineHeight = textSize * 1.2;
        const textHeight = Math.max(1, Math.ceil(lines.length * lineHeight) + 6);

        // C. Crear un canvas virtual de esa medida para pintar el texto con fondo transparente
        const offscreen = document.createElement('canvas');
        offscreen.width = textWidth;
        offscreen.height = textHeight;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        offCtx.fillStyle = fgColor;
        offCtx.font = `${textSize}px ${textFont}`;
        offCtx.textBaseline = 'top';
        
        lines.forEach((line, index) => {
          offCtx.fillText(line, 4, 3 + index * lineHeight);
        });

        // D. Extraer la porción en ImageData para la selección flotante
        const textImageData = offCtx.getImageData(0, 0, textWidth, textHeight);

        // E. Guardar estados históricos previos
        originalImageDataBeforeMoveRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        savedImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // F. Asignar los parámetros del recuadro flotante
        selectionRectRef.current = {
          x: x,
          y: y,
          w: textWidth,
          h: textHeight
        };
        selectionOriginalPosRef.current = { x: x, y: y };
        selectionImageRef.current = textImageData;
        isDraggingSelectionRef.current = false;

        // G. Pintar el texto flotante en la posición inicial del lienzo
        ctx.save();
        ctx.drawImage(offscreen, x, y);
        ctx.restore();

        // H. Sincronizar Zustand con el recuadro animado y activar herramienta de selección
        useCanvasStore.getState().setActiveSelection({
          x: x,
          y: y,
          width: textWidth,
          height: textHeight
        });

        useAppStore.getState().setActiveTool('select');
        saveHistory(canvas, 'Texto Flotante');
        setStatusText('Texto insertado como selección flotante. ¡Arrástralo o cópialo libremente!');
      };

      if (document.fonts) {
        setStatusText('Cargando tipografía de Google Fonts...');
        document.fonts
          .load(fontSpec)
          .then(() => {
            executeDraw();
          })
          .catch((err) => {
            console.warn('Error al precargar fuente, dibujando con fallback:', err);
            executeDraw();
          });
      } else {
        executeDraw();
      }
    },
    [fgColor, textFont, textSize, saveHistory, setStatusText, consolidateSelection],
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
      lastStabilizedCoordsRef.current = coords;

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

        // 1. Restaurar fondo con hueco vacío
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        const newX = selectionOriginalPosRef.current.x + dx;
        const newY = selectionOriginalPosRef.current.y + dy;

        // 2. Dibujar ImageData en canvas virtual
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

        // 3. Sincronizar recuadro de hormigas marchantes en Zustand
        useCanvasStore
          .getState()
          .setActiveSelection({ x: newX, y: newY, width: rect.w, height: rect.h });
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
        // Estabilización de coordenadas si el suavizado está activo
        let activeCoords = coords;
        if (smoothing) {
          const lastStab = lastStabilizedCoordsRef.current || coords;
          
          // 1. Aplicar correa virtual (leash) de precisión (0-16px de radio)
          const leashRadius = smoothingLevel * 0.8;
          const dx = coords.x - lastStab.x;
          const dy = coords.y - lastStab.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          let targetX = coords.x;
          let targetY = coords.y;
          
          if (distance < leashRadius) {
            targetX = lastStab.x;
            targetY = lastStab.y;
          } else {
            const ratio = (distance - leashRadius) / distance;
            targetX = lastStab.x + dx * ratio;
            targetY = lastStab.y + dy * ratio;
          }
          
          // 2. Promedio móvil exponencial (EMA) sobre el objetivo para fluidez extrema
          const weight = 1 / (1 + smoothingLevel * 1.2);
          const stabX = lastStab.x + (targetX - lastStab.x) * weight;
          const stabY = lastStab.y + (targetY - lastStab.y) * weight;
          
          activeCoords = { x: stabX, y: stabY };
          lastStabilizedCoordsRef.current = activeCoords;
        }

        if (style === 'spray') {
          const dx = activeCoords.x - lastCoords.x;
          const dy = activeCoords.y - lastCoords.y;
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
            applySpray(ctx, activeCoords.x, activeCoords.y, color, size);
          }
        } else if (style === 'pixel' || style === 'chalk') {
          drawLine(
            ctx,
            lastCoords.x,
            lastCoords.y,
            activeCoords.x,
            activeCoords.y,
            color,
            size,
            style,
          );
        } else {
          currentStrokePointsRef.current.push(activeCoords);

          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }

          const offscreen = getOffscreenCanvas(canvas.width, canvas.height);
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.clearRect(0, 0, canvas.width, canvas.height);

            offCtx.fillStyle = color;
            offCtx.strokeStyle = color;
            offCtx.lineCap = 'round';
            offCtx.lineJoin = 'round';

            // Configurar filtro de Bordes Suaves (Feathering) en el canvas virtual
            if (softEdges) {
              offCtx.filter = `blur(${softEdgesLevel}px)`;
            } else {
              offCtx.filter = 'none';
            }

            const points = currentStrokePointsRef.current;
            if (points.length > 0) {
              if (points.length === 1) {
                // Dibujar un solo círculo inicial
                offCtx.beginPath();
                offCtx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
                offCtx.fill();
              } else {
                // Array para guardar los tamaños de cada punto
                const pointSizes = new Array(points.length);
                const isTaperedBrush = activeTool === 'brush' && (style === 'normal' || style === 'watercolor');

                if (isTaperedBrush) {
                  // Calcular velocidad entre puntos
                  const speeds = new Array(points.length).fill(0);
                  for (let i = 1; i < points.length; i++) {
                    const dx = points[i].x - points[i - 1].x;
                    const dy = points[i].y - points[i - 1].y;
                    speeds[i] = Math.sqrt(dx * dx + dy * dy);
                  }
                  
                  // Suavizar la velocidad (filtro EMA)
                  let avgSpeed = 0;
                  for (let i = 0; i < points.length; i++) {
                    avgSpeed = avgSpeed * 0.8 + speeds[i] * 0.2;
                    
                    // Modulación de grosor por velocidad (más rápido = más fino)
                    const speedFactor = Math.max(0.35, Math.min(1.0, 1.0 - (avgSpeed / 25)));
                    let targetSize = size * speedFactor;
                    
                    // Taper-In (cónica de inicio) en los primeros 12 puntos
                    const startDistance = i;
                    if (startDistance < 12) {
                      const ratio = startDistance / 12;
                      targetSize *= (0.15 + 0.85 * ratio);
                    }
                    
                    // Taper-Out (cónica de fin/punta activa) en los últimos 12 puntos
                    const pointsFromEnd = points.length - 1 - i;
                    if (pointsFromEnd < 12) {
                      const ratio = pointsFromEnd / 12;
                      targetSize *= (0.15 + 0.85 * ratio);
                    }
                    
                    pointSizes[i] = Math.max(1, targetSize);
                  }
                  pointSizes[0] = pointSizes[1] ? pointSizes[1] * 0.3 : size * 0.15;
                } else {
                  // Grosor uniforme para otros pinceles o lápiz, garantizando extremos redondeados perfectos
                  pointSizes.fill(size);
                }

                // Dibujar los dabs interpolados
                const drawDab = (x: number, y: number, rSize: number) => {
                  offCtx.beginPath();
                  offCtx.arc(x, y, rSize / 2, 0, Math.PI * 2);
                  offCtx.fill();
                };
                
                drawDab(points[0].x, points[0].y, pointSizes[0]);
                
                // Interpolación lineal entre dabs
                const interpolateDabs = (
                  x1: number, y1: number, s1: number,
                  x2: number, y2: number, s2: number
                ) => {
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const spacing = Math.max(0.4, Math.min(s1, s2) * 0.05); // Espaciado ultra-denso del 5% del tamaño para fluidez absoluta
                  
                  if (dist > spacing) {
                    const steps = Math.ceil(dist / spacing);
                    for (let step = 1; step <= steps; step++) {
                      const t = step / steps;
                      const ix = x1 + dx * t;
                      const iy = y1 + dy * t;
                      const isize = s1 + (s2 - s1) * t;
                      drawDab(ix, iy, isize);
                    }
                  } else {
                    drawDab(x2, y2, s2);
                  }
                };

                let currentX = points[0].x;
                let currentY = points[0].y;
                
                for (let i = 1; i < points.length - 1; i++) {
                  const p0 = points[i - 1];
                  const p1 = points[i];
                  const p2 = points[i + 1];
                  
                  const s0 = pointSizes[i - 1];
                  const s1 = pointSizes[i];
                  const s2 = pointSizes[i + 1];
                  
                  const startX = i === 1 ? p0.x : (p0.x + p1.x) / 2;
                  const startY = i === 1 ? p0.y : (p0.y + p1.y) / 2;
                  
                  const endX = (p1.x + p2.x) / 2;
                  const endY = (p1.y + p2.y) / 2;
                  
                  const startS = i === 1 ? s0 : (s0 + s1) / 2;
                  const endS = (s1 + s2) / 2;
                  
                  const segmentLen = Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY));
                  const stepSize = Math.max(0.4, Math.min(startS, endS) * 0.05);
                  const curveSteps = Math.max(5, Math.ceil(segmentLen / stepSize));
                  
                  let prevCurveX = startX;
                  let prevCurveY = startY;
                  let prevCurveS = startS;
                  
                  for (let step = 0; step <= curveSteps; step++) {
                    const t = step / curveSteps;
                    const mt = 1 - t;
                    const bx = mt * mt * startX + 2 * mt * t * p1.x + t * t * endX;
                    const by = mt * mt * startY + 2 * mt * t * p1.y + t * t * endY;
                    const bs = startS + (endS - startS) * t;
                    
                    interpolateDabs(prevCurveX, prevCurveY, prevCurveS, bx, by, bs);
                    
                    prevCurveX = bx;
                    prevCurveY = by;
                    prevCurveS = bs;
                  }
                  
                  currentX = endX;
                  currentY = endY;
                }
                
                const lastIdx = points.length - 1;
                interpolateDabs(
                  currentX, currentY, pointSizes[lastIdx - 1],
                  points[lastIdx].x, points[lastIdx].y, pointSizes[lastIdx]
                );
              }
            }

            ctx.save();
            ctx.globalAlpha = style === 'watercolor' ? 0.08 * opacity : opacity;
            ctx.drawImage(offscreen, 0, 0);
            ctx.restore();
          }
        }
        lastCoordsRef.current = activeCoords;
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
      softEdgesLevel,
      softEdges,
      smoothingLevel,
      smoothing,
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

        // 1. Restaurar fondo con hueco vacío
        if (savedImageDataRef.current) {
          ctx.putImageData(savedImageDataRef.current, 0, 0);
        }

        // 2. Dibujar ImageData en su nueva posición definitiva flotante
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

        // 3. Sincronizar recuadro de hormigas marchantes en Zustand
        useCanvasStore
          .getState()
          .setActiveSelection({ x: newX, y: newY, width: rect.w, height: rect.h });
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

          // 1. Restaurar lienzo original antes del dibujo de previsualización
          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }

          // 2. Guardar lienzo original completo (antes de recortar el hueco)
          originalImageDataBeforeMoveRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 3. Extraer la porción seleccionada
          selectionImageRef.current = ctx.getImageData(x, y, w, h);

          // 4. Crear el hueco vacío en el lienzo (rellenar con blanco)
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, w, h);
          ctx.restore();

          // 5. Guardar el lienzo con el hueco en savedImageDataRef
          savedImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 6. Dibujar la selección en su posición actual de previsualización flotante
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(selectionImageRef.current, 0, 0);
            ctx.drawImage(tempCanvas, x, y);
          }

          // 7. Sincronizar recuadro de hormigas marchantes en Zustand
          useCanvasStore
            .getState()
            .setActiveSelection({ x, y, width: w, height: h });

          setStatusText(
            `Área seleccionada: ${w}x${h}px. Puedes arrastrar para moverla.`,
          );
        } else {
          selectionRectRef.current = null;
          selectionImageRef.current = null;
          if (savedImageDataRef.current) {
            ctx.putImageData(savedImageDataRef.current, 0, 0);
          }
          useCanvasStore.getState().setActiveSelection(null);
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

  // Consolidar polígono activo si existe
  const consolidatePolygon = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = polygonPointsRef.current;
    if (pts.length > 2) {
      if (savedImageDataRef.current) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }

      ctx.save();
      ctx.strokeStyle = drawButtonRef.current === 2 ? bgColor : fgColor;
      ctx.fillStyle = drawButtonRef.current === 2 ? fgColor : bgColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      if (fillShapes) {
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
      saveHistory(canvas);
      setStatusText('Polígono consolidado');
    } else {
      if (savedImageDataRef.current) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }
    }
    polygonPointsRef.current = [];
    savedImageDataRef.current = null;
  }, [brushSize, fgColor, bgColor, fillShapes, saveHistory, setStatusText]);

  const onDoubleClick = useCallback(() => {
    if (activeTool === 'polygon') {
      consolidatePolygon();
    }
  }, [consolidatePolygon, activeTool]);

  const selectAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    consolidateSelection();

    const w = canvas.width;
    const h = canvas.height;

    // 1. Guardar la imagen original antes de recortar (para Escape/Cancel)
    originalImageDataBeforeMoveRef.current = ctx.getImageData(0, 0, w, h);

    selectionRectRef.current = { x: 0, y: 0, w, h };
    selectionOriginalPosRef.current = { x: 0, y: 0 };
    hasCutOrMovedRef.current = false;
    selectionImageRef.current = ctx.getImageData(0, 0, w, h);

    // 2. Recortar la selección (rellenar el lienzo original con blanco)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 3. Guardar el lienzo con el hueco en savedImageDataRef
    savedImageDataRef.current = ctx.getImageData(0, 0, w, h);

    // 4. Dibujar la selección en previsualización flotante
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(selectionImageRef.current, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
    }

    useCanvasStore
      .getState()
      .setActiveSelection({ x: 0, y: 0, width: w, height: h });
    useAppStore.getState().setActiveTool('select');
    setStatusText(`Lienzo completo seleccionado (${w}x${h}px)`);
  }, [consolidateSelection, setStatusText]);

  const deselect = useCallback(() => {
    consolidateSelection();
  }, [consolidateSelection]);

  const cancelActiveOperation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Cancelar selección activa flotante
    if (selectionRectRef.current) {
      if (originalImageDataBeforeMoveRef.current) {
        ctx.putImageData(originalImageDataBeforeMoveRef.current, 0, 0);
      } else if (savedImageDataRef.current) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }
      selectionRectRef.current = null;
      selectionImageRef.current = null;
      hasCutOrMovedRef.current = false;
      originalImageDataBeforeMoveRef.current = null;
      useCanvasStore.getState().setActiveSelection(null);
      setStatusText('Selección cancelada y restaurada');
      return;
    }

    // 2. Cancelar dibujo de polígono interactivo
    if (activeTool === 'polygon' && polygonPointsRef.current.length > 0) {
      if (savedImageDataRef.current) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }
      polygonPointsRef.current = [];
      savedImageDataRef.current = null;
      setStatusText('Dibujo de polígono cancelado');
      return;
    }

    // 3. Cancelar curva Bézier en progreso
    if (activeTool === 'bezier' && bezierStepRef.current > 0) {
      if (savedImageDataRef.current) {
        ctx.putImageData(savedImageDataRef.current, 0, 0);
      }
      bezierStepRef.current = 0;
      savedImageDataRef.current = null;
      setStatusText('Curva Bézier cancelada');
      return;
    }
  }, [activeTool, setStatusText]);

  const openImageFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          consolidateSelection();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          saveHistory(canvas);
          setStatusText(`Imagen "${file.name}" cargada correctamente`);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [saveHistory, setStatusText, consolidateSelection]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              consolidateSelection();

              const w = img.width;
              const h = img.height;
              const canvasWidth = canvas.width;
              const canvasHeight = canvas.height;

              const x = Math.round((canvasWidth - w) / 2);
              const y = Math.round((canvasHeight - h) / 2);

              selectionRectRef.current = { x, y, w, h };
              selectionOriginalPosRef.current = { x, y };
              hasCutOrMovedRef.current = true;

              savedImageDataRef.current = ctx.getImageData(
                0,
                0,
                canvasWidth,
                canvasHeight,
              );
              originalImageDataBeforeMoveRef.current = ctx.getImageData(
                0,
                0,
                canvasWidth,
                canvasHeight,
              );

              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = w;
              tempCanvas.height = h;
              const tempCtx = tempCanvas.getContext('2d');
              if (!tempCtx) return;
              tempCtx.drawImage(img, 0, 0);
              selectionImageRef.current = tempCtx.getImageData(0, 0, w, h);

              ctx.drawImage(tempCanvas, x, y);

              useAppStore.getState().setActiveTool('select');
              useCanvasStore
                .getState()
                .setActiveSelection({ x, y, width: w, height: h });

              setStatusText('Imagen pegada desde el portapapeles del sistema');
              URL.revokeObjectURL(url);
            };
            img.src = url;
            return;
          }
        }
      }
      pasteSelection();
    } catch {
      pasteSelection();
    }
  }, [setStatusText, consolidateSelection, pasteSelection]);

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

    // Métodos avanzados recuperados
    onDoubleClick,
    cancelActiveOperation,
    selectAll,
    deselect,
    openImageFile,
    pasteFromClipboard,
  };
}
