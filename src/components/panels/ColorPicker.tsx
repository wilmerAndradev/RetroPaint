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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingWheelRef = useRef(false);

  // Actualizar todo desde HEX
  const updateAllFromHex = useCallback((hex: string) => {
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
    }
  }, []);

  // Inicializar colores al abrir modal
  useEffect(() => {
    if (isOpen) {
      updateAllFromHex(initialColor);
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

  if (!isOpen) return null;

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
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] p-4">
      <div className="w-full max-w-[440px] bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-main)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Barra superior de título */}
        <div className="bg-[var(--accent-color)] text-white h-12 min-h-[12px] flex items-center justify-between px-4">
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

        {/* Cuerpo del Modal */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto min-h-0">
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
            {/* Izquierda: Rueda de color interactiva */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Rueda Cromática
              </span>
              <canvas
                ref={canvasRef}
                width={120}
                height={120}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className="cursor-crosshair rounded-full shadow-inner border border-[var(--border-color)] bg-[var(--bg-primary)]"
              />
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-6 h-6 border border-[var(--border-color)] rounded shadow-sm"
                  style={{ backgroundColor: hexInput }}
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexChange}
                  className="w-20 text-[10px] font-mono font-bold px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded outline-none text-center uppercase"
                />
              </div>
            </div>

            {/* Derecha: Sliders RGB e HSL */}
            <div className="flex-1 flex flex-col gap-3 justify-center w-full">
              {/* Sliders RGB */}
              <div className="flex flex-col gap-2 bg-[var(--bg-primary)] p-3 border border-[var(--border-color)] rounded-xl">
                <span className="text-[7.5px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                  Sliders RGB
                </span>

                {/* Red */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-red-500">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {r}
                  </span>
                </div>

                {/* Green */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-green-500">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {g}
                  </span>
                </div>

                {/* Blue */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-blue-500">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {b}
                  </span>
                </div>
              </div>

              {/* Sliders HSL */}
              <div className="flex flex-col gap-2 bg-[var(--bg-primary)] p-3 border border-[var(--border-color)] rounded-xl">
                <span className="text-[7.5px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                  Sliders HSL
                </span>

                {/* Hue */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-[var(--accent-color)]">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {h}°
                  </span>
                </div>

                {/* Saturation */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-[var(--accent-color)]">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {s}%
                  </span>
                </div>

                {/* Lightness */}
                <div className="flex items-center gap-2">
                  <span className="w-4 text-[9px] font-mono font-bold text-[var(--accent-color)]">
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
                  <span className="w-8 text-[9px] font-mono text-right font-bold">
                    {l}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Colores Recientes */}
          <div className="bg-[var(--bg-primary)] p-3 border border-[var(--border-color)] rounded-xl">
            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
              Colores Recientes
            </span>
            <div className="flex gap-2 justify-center">
              {recentColors.map((color, idx) => {
                return (
                  <button
                    /* biome-ignore lint/suspicious/noArrayIndexKey: el indice es necesario ya que el color puede repetirse */
                    key={`${color}-${idx}`}
                    type="button"
                    onClick={() => updateAllFromHex(color)}
                    className="w-6 h-6 border border-[var(--border-color)] rounded hover:scale-110 active:scale-95 transition-all shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color.toUpperCase()}
                  />
                );
              })}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-2 border-t border-[var(--border-color)] pt-4 mt-2">
            <button
              type="button"
              onClick={handleAddToCustomPalette}
              className="flex-1 px-3 py-2 text-[8px] font-bold border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-primary)] active:scale-95 transition-all text-[var(--text-main)]"
            >
              ⭐ AÑADIR A MI PALETA
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[8px] font-bold border border-[var(--border-color)] hover:bg-[var(--bg-primary)] rounded-lg active:scale-95 transition-all text-[var(--text-muted)]"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-[8px] font-bold bg-[var(--accent-color)] text-white rounded-lg hover:brightness-110 active:scale-95 transition-all"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
