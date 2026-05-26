import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from '../../utils/colors';

interface ColorPickerProps {
  isOpen: boolean;
  initialColor: string;
  onClose: () => void;
  onSelect: (color: string) => void;
}

// Variable persistente a nivel de módulo para recordar la posición del selector
let savedPosition: { x: number; y: number } | null = null;

export function ColorPicker({
  isOpen,
  initialColor,
  onClose,
  onSelect,
}: ColorPickerProps) {
  const recentColors = useAppStore((state) => state.recentColors);
  const addRecentColor = useAppStore((state) => state.addRecentColor);
  const addToCustomPalette = useAppStore((state) => state.addToCustomPalette);

  // Estados locales de color en paralelo
  const [hexInput, setHexInput] = useState(initialColor);
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [l, setL] = useState(50);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingWheelRef = useRef(false);
  const lastInternalColorRef = useRef<string>('');

  // Estados para arrastrar la ventana
  const [position, setPosition] = useState(() => {
    if (savedPosition) return savedPosition;
    // Posición por defecto inteligente (a la derecha para no tapar el lienzo)
    const width = 360;
    const x = Math.max(40, window.innerWidth - width - 80);
    const y = 140;
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Actualizar todo desde HEX
  const updateAllFromHex = useCallback(
    (hex: string, isFromUserInteraction = true) => {
      if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
      setHexInput(hex);

      const rgb = hexToRgb(hex);
      if (rgb) {
        setR(rgb.r);
        setG(rgb.g);
        setB(rgb.b);

        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setH(hsl.h);
        setS(hsl.s);
        setL(hsl.l);

        if (isFromUserInteraction) {
          lastInternalColorRef.current = hex;
          onSelect(hex);
        }
      }
    },
    [onSelect],
  );

  // Sincronizar desde cambios externos (ej. Eyedropper o paleta externa)
  useEffect(() => {
    if (
      isOpen &&
      initialColor.toLowerCase() !== lastInternalColorRef.current.toLowerCase()
    ) {
      updateAllFromHex(initialColor, false);
      lastInternalColorRef.current = initialColor;
    }
  }, [isOpen, initialColor, updateAllFromHex]);

  // Actualizar todo desde RGB
  const updateAllFromRgb = (red: number, green: number, blue: number) => {
    const hex = rgbToHex(red, green, blue);
    setHexInput(hex);
    setR(red);
    setG(green);
    setB(blue);

    const hsl = rgbToHsl(red, green, blue);
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);

    lastInternalColorRef.current = hex;
    onSelect(hex);
  };

  // Actualizar todo desde HSL
  const updateAllFromHsl = (hue: number, sat: number, light: number) => {
    const rgb = hslToRgb(hue, sat, light);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    setR(rgb.r);
    setG(rgb.g);
    setB(rgb.b);
    setH(hue);
    setS(sat);
    setL(light);

    lastInternalColorRef.current = hex;
    onSelect(hex);
  };

  // Dibujar la Rueda Cromática en Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 4;

    // Rellenar fondo transparente
    ctx.clearRect(0, 0, width, height);

    // Dibujar rueda de color pixel a pixel
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          const sat = (dist / radius) * 100;
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          // Convertir HSL a RGB para los píxeles
          const rgb = hslToRgb(angle, sat, l);

          const index = (y * width + x) * 4;
          data[index] = rgb.r; // R
          data[index + 1] = rgb.g; // G
          data[index + 2] = rgb.b; // B
          data[index + 3] = 255; // A
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Dibujar el marcador del color seleccionado (anillo blanco/negro)
    const dist = (s / 100) * radius;
    const angleRad = h * (Math.PI / 180);
    const mx = cx + Math.cos(angleRad) * dist;
    const my = cy + Math.sin(angleRad) * dist;

    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [isOpen, h, s, l]);

  // Manejar eventos de click/drag sobre la rueda
  const handleWheelInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 4;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));

    const sat = Math.round((dist / radius) * 100);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    updateAllFromHsl(Math.round(angle), sat, l);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingWheelRef.current = true;
    handleWheelInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingWheelRef.current) {
      handleWheelInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingWheelRef.current = false;
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      updateAllFromHex(val);
    }
  };

  // Manejar arrastre de la ventana flotante
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    if ((e.target as HTMLElement).closest('button, input, select, canvas'))
      return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, canvas'))
      return;

    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const newX = Math.max(
        10,
        Math.min(window.innerWidth - 120, e.clientX - dragStartRef.current.x),
      );
      const newY = Math.max(
        10,
        Math.min(window.innerHeight - 80, e.clientY - dragStartRef.current.y),
      );
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      savedPosition = newPos;
    };

    const handleMouseUpGlobal = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = Math.max(
        10,
        Math.min(
          window.innerWidth - 120,
          touch.clientX - dragStartRef.current.x,
        ),
      );
      const newY = Math.max(
        10,
        Math.min(
          window.innerHeight - 80,
          touch.clientY - dragStartRef.current.y,
        ),
      );
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      savedPosition = newPos;
    };

    const handleTouchEndGlobal = () => {
      setIsDragging(false);
    };

    window.addEventListener('touchmove', handleTouchMoveGlobal, {
      passive: true,
    });
    window.addEventListener('touchend', handleTouchEndGlobal);

    return () => {
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [isDragging]);

  const handleSave = () => {
    let finalColor = hexInput;
    if (!/^#[0-9A-F]{6}$/i.test(finalColor)) {
      finalColor = rgbToHex(r, g, b);
    }
    onSelect(finalColor);
    addRecentColor(finalColor);
    onClose();
  };

  const handleAddToCustomPalette = () => {
    const colorToAdd = rgbToHex(r, g, b);
    addToCustomPalette(colorToAdd);
    useAppStore
      .getState()
      .setStatusText(
        `Color ${colorToAdd.toUpperCase()} añadido a tu paleta personalizada`,
      );
    setShowAddedFeedback(true);
    setTimeout(() => {
      setShowAddedFeedback(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed w-[320px] sm:w-[350px] bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-main)] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[9999] select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Barra superior de título (Arrastrable) */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: este div actúa como barra de título arrastrable */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        className="bg-[var(--accent-color)] text-white h-11 min-h-[44px] flex items-center justify-between px-4 cursor-move select-none active:brightness-95"
      >
        <span className="font-press-start text-[8px] tracking-widest font-bold">
          SELECTOR DE COLOR
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all outline-none cursor-pointer text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Cuerpo de la Ventana */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
        {showAddedFeedback && (
          <div className="bg-emerald-500 text-white text-center py-1.5 px-3 text-[9px] font-bold tracking-wider animate-pulse flex items-center justify-center gap-1 rounded-lg">
            <span>✨</span>
            <span>¡COLOR AÑADIDO A TU PALETA!</span>
            <span>✨</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-stretch">
          {/* Izquierda: Rueda de color interactiva */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Rueda Cromática
            </span>
            <canvas
              ref={canvasRef}
              width={100}
              height={100}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="cursor-crosshair rounded-full shadow-inner border border-[var(--border-color)] bg-[var(--bg-primary)]"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-[22px] h-[22px] border border-[var(--border-color)] rounded shadow-sm"
                style={{ backgroundColor: hexInput }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                className="w-18 text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded outline-none text-center uppercase"
              />
            </div>
          </div>

          {/* Derecha: Sliders RGB e HSL */}
          <div className="flex-1 flex flex-col gap-2 justify-center w-full">
            {/* Sliders RGB */}
            <div className="flex flex-col gap-1.5 bg-[var(--bg-primary)] p-2 border border-[var(--border-color)] rounded-xl">
              <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                Sliders RGB
              </span>

              {/* Red */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-red-500">
                  R
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={r}
                  onChange={(e) =>
                    updateAllFromRgb(Number(e.target.value), g, b)
                  }
                  className="flex-1 accent-red-500 h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {r}
                </span>
              </div>

              {/* Green */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-green-500">
                  G
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={g}
                  onChange={(e) =>
                    updateAllFromRgb(r, Number(e.target.value), b)
                  }
                  className="flex-1 accent-green-500 h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {g}
                </span>
              </div>

              {/* Blue */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-blue-500">
                  B
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={b}
                  onChange={(e) =>
                    updateAllFromRgb(r, g, Number(e.target.value))
                  }
                  className="flex-1 accent-blue-500 h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {b}
                </span>
              </div>
            </div>

            {/* Sliders HSL */}
            <div className="flex flex-col gap-1.5 bg-[var(--bg-primary)] p-2 border border-[var(--border-color)] rounded-xl">
              <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                Sliders HSL
              </span>

              {/* Hue */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-[var(--accent-color)]">
                  H
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={h}
                  onChange={(e) =>
                    updateAllFromHsl(Number(e.target.value), s, l)
                  }
                  className="flex-1 accent-[var(--accent-color)] h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {h}°
                </span>
              </div>

              {/* Saturation */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-[var(--accent-color)]">
                  S
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={s}
                  onChange={(e) =>
                    updateAllFromHsl(h, Number(e.target.value), l)
                  }
                  className="flex-1 accent-[var(--accent-color)] h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {s}%
                </span>
              </div>

              {/* Lightness */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[8px] font-mono font-bold text-[var(--accent-color)]">
                  L
                </span>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={l}
                  onChange={(e) =>
                    updateAllFromHsl(h, s, Number(e.target.value))
                  }
                  className="flex-1 accent-[var(--accent-color)] h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-6 text-[8px] font-mono text-right font-bold">
                  {l}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Colores Recientes */}
        <div className="bg-[var(--bg-primary)] p-2.5 border border-[var(--border-color)] rounded-xl">
          <span className="text-[7.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
            Colores Recientes
          </span>
          <div className="flex gap-1.5 justify-center">
            {recentColors.map((color, idx) => {
              return (
                <button
                  /* biome-ignore lint/suspicious/noArrayIndexKey: el indice es necesario ya que el color puede repetirse */
                  key={`${color}-${idx}`}
                  type="button"
                  onClick={() => updateAllFromHex(color)}
                  className="w-5 h-5 border border-[var(--border-color)] rounded hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color.toUpperCase()}
                />
              );
            })}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-1.5 border-t border-[var(--border-color)] pt-3">
          <button
            type="button"
            onClick={handleAddToCustomPalette}
            className="flex-1 px-2.5 py-1.5 text-[7.5px] font-bold border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-primary)] active:scale-95 transition-all text-[var(--text-main)] cursor-pointer"
          >
            ⭐ AÑADIR A MI PALETA
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[7.5px] font-bold border border-[var(--border-color)] hover:bg-[var(--bg-primary)] rounded-lg active:scale-95 transition-all text-[var(--text-muted)] cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-[7.5px] font-bold bg-[var(--accent-color)] text-white rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              ACEPTAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
