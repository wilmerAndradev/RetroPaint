import { CLASSIC_PALETTE } from '../../constants/palette';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export function StatusBar() {
  const cursorX = useAppStore((state) => state.cursorX);
  const cursorY = useAppStore((state) => state.cursorY);
  const zoom = useAppStore((state) => state.zoom);
  const setFgColor = useAppStore((state) => state.setFgColor);
  const setBgColor = useAppStore((state) => state.setBgColor);

  const width = useCanvasStore((state) => state.width);
  const height = useCanvasStore((state) => state.height);

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

  return (
    <div className="bg-[var(--bg-primary)] h-[52px] min-h-[52px] flex items-center justify-between px-4 border-t border-[var(--border-color)] select-none text-[10px] text-[var(--text-main)] z-30 theme-transition">
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

        {/* Porcentaje Zoom */}
        <div className="flex items-center justify-center px-3 py-1 border-r border-[var(--border-color)] h-[24px] min-w-[50px]">
          <span>{zoom}%</span>
        </div>

        {/* Pequeño icono de cuadrícula en la esquina inferior derecha */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="opacity-70 text-[var(--text-main)]"
        >
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
      </div>
    </div>
  );
}
