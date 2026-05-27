import { useState } from 'react';
import { CLASSIC_PALETTE } from '../../constants/palette';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

function ZoomIndicator() {
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={() => setZoom(Math.max(25, zoom - 25))}
        className="w-4 h-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] rounded-sm flex items-center justify-center text-[9px] cursor-default font-bold active:scale-90 select-none text-[var(--text-main)]"
        title="Alejar (-)"
      >
        −
      </button>

      {editing ? (
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => {
            const val = parseInt(inputVal, 10);
            if (!Number.isNaN(val) && val >= 25 && val <= 800) {
              setZoom(val);
            }
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-10 bg-[var(--bg-primary)] border border-[var(--border-color)] text-center text-[9px] font-bold font-mono outline-none h-4 p-0 text-[var(--text-main)]"
          style={{ width: 40 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setInputVal(String(zoom));
          }}
          className="cursor-text hover:underline min-w-[32px] text-center font-mono text-[10px] bg-transparent border-none p-0 outline-none text-[var(--text-main)] block m-0"
          style={{ cursor: 'text', minWidth: 32, textAlign: 'center' }}
          title="Click para editar zoom"
        >
          {zoom}%
        </button>
      )}

      <button
        type="button"
        onClick={() => setZoom(Math.min(800, zoom + 25))}
        className="w-4 h-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] rounded-sm flex items-center justify-center text-[9px] cursor-default font-bold active:scale-90 select-none text-[var(--text-main)]"
        title="Acercar (+)"
      >
        +
      </button>
    </div>
  );
}

export function StatusBar() {
  const cursorX = useAppStore((state) => state.cursorX);
  const cursorY = useAppStore((state) => state.cursorY);
  const setFgColor = useAppStore((state) => state.setFgColor);
  const setBgColor = useAppStore((state) => state.setBgColor);
  const customPalette = useAppStore((state) => state.customPalette);

  const width = useCanvasStore((state) => state.width);
  const height = useCanvasStore((state) => state.height);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);

  // Manejo de clicks de colores en la paleta
  const handleColorClick = (color: string, buttonType: number) => {
    if (buttonType === 2) {
      // Click derecho -> Color de fondo
      setBgColor(color);
    } else {
      // Click izquierdo/otro -> Color frontal
      setFgColor(color);
    }
  };

  // Tomamos 14 colores de la fila 1 y 14 colores de la fila 2 para tener 28 colores en total
  const row1Colors = CLASSIC_PALETTE.slice(0, 14);
  const row2Colors = CLASSIC_PALETTE.slice(20, 34);
  const customRowColors = customPalette.slice(0, 14);

  return (
    <div className="bg-[var(--bg-primary)] h-[62px] min-h-[62px] flex items-center justify-between px-4 border-t border-[var(--border-color)] select-none text-[10px] text-[var(--text-main)] z-30 theme-transition">
      {/* 1. Izquierda: Label y Paleta de Colores Física */}
      <div className="flex items-center gap-4">
        <span className="text-[8px] font-bold tracking-widest font-sans uppercase text-[var(--text-muted)]">
          PALETA DE COLORES
        </span>

        {/* Paleta compacta de 2x14 */}
        <div className="flex flex-col gap-[2px] bg-[var(--bg-card)] border border-[var(--border-color)] p-[3px] rounded-md shadow-sm">
          {/* Fila 1 */}
          <div className="flex gap-[2px]">
            {row1Colors.map((color) => (
              <button
                key={`row1-${color}`}
                type="button"
                onMouseDown={(e) => handleColorClick(color, e.button)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-3.5 h-3.5 border border-[var(--border-color)]/40 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9]"
                style={{ backgroundColor: color }}
                title={`Color: ${color.toUpperCase()}`}
              />
            ))}
          </div>

          {/* Fila 2 */}
          <div className="flex gap-[2px]">
            {row2Colors.map((color) => (
              <button
                key={`row2-${color}`}
                type="button"
                onMouseDown={(e) => handleColorClick(color, e.button)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-3.5 h-3.5 border border-[var(--border-color)]/40 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9]"
                style={{ backgroundColor: color }}
                title={`Color: ${color.toUpperCase()}`}
              />
            ))}
          </div>

          {/* Fila 3: Colores Personalizados */}
          <div className="flex gap-[2px] border-t border-[var(--border-color)]/20 pt-[2px]">
            {customRowColors.map((color, index) => (
              <button
                /* biome-ignore lint/suspicious/noArrayIndexKey: El orden de los slots de la paleta es estático y posicional */
                key={`custom-${index}-${color}`}
                type="button"
                onMouseDown={(e) => handleColorClick(color, e.button)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-3.5 h-3.5 border border-[var(--border-color)]/40 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9] relative group animate-pulse-subtle"
                style={{ backgroundColor: color }}
                title={`Personalizado ${index + 1}: ${color.toUpperCase()} (Click Izq/Der para usar)`}
              >
                {color.toLowerCase() === '#ffffff' && (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] text-[var(--text-muted)] opacity-50">
                    +
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* 2. Derecha: Coordenadas, Dimensiones, Zoom e Icono Grid */}
      <div className="flex items-center gap-4 font-mono font-bold text-[var(--text-main)]">
        {/* Coordenadas X, Y */}
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 border-r border-[var(--border-color)] h-[24px]">
          <span className="text-[var(--text-muted)]">X:</span>
          <span className="min-w-[20px] text-right">
            {cursorX !== null ? cursorX : 0}
          </span>
          <span className="text-[var(--text-muted)] ml-1">Y:</span>
          <span className="min-w-[20px] text-right">
            {cursorY !== null ? cursorY : 0}
          </span>
        </div>

        {/* Dimensiones Lienzo */}
        <div className="flex items-center justify-center gap-1 px-3 py-1 border-r border-[var(--border-color)] h-[24px]">
          <span>
            {width} x {height}
          </span>
        </div>

        {/* Porcentaje Zoom Interactivo (MVP-3 / Sprint 4) */}
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 border-r border-[var(--border-color)] h-[24px] min-w-[100px]">
          <ZoomIndicator />
        </div>

        {/* Pequeño icono de cuadrícula en la esquina inferior derecha */}
        <button
          type="button"
          onClick={toggleGrid}
          className={`p-1.5 rounded hover:bg-[var(--bg-card)] border transition-all cursor-default flex items-center justify-center ${
            showGrid
              ? 'bg-[var(--bg-card)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold'
              : 'bg-transparent border-transparent text-[var(--text-main)] opacity-70'
          }`}
          title="Alternar cuadrícula visual (Ctrl+G)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <title>Cuadrícula</title>
            <circle cx="2" cy="2" r="1" fill="currentColor" />
            <circle cx="6" cy="2" r="1" fill="currentColor" />
            <circle cx="10" cy="2" r="1" fill="currentColor" />
            <circle cx="2" cy="6" r="1" fill="currentColor" />
            <circle cx="6" cy="6" r="1" fill="currentColor" />
            <circle cx="10" cy="6" r="1" fill="currentColor" />
            <circle cx="2" cy="10" r="1" fill="currentColor" />
            <circle cx="6" cy="10" r="1" fill="currentColor" />
            <circle cx="10" cy="10" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
