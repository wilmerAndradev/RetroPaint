import { useState } from 'react';
import { CLASSIC_PALETTE } from '../../constants/palette';
import { useAppStore } from '../../store/useAppStore';
import { ColorPicker } from './ColorPicker';

export function ColorPalette() {
  const fgColor = useAppStore((state) => state.fgColor);
  const bgColor = useAppStore((state) => state.bgColor);
  const setFgColor = useAppStore((state) => state.setFgColor);
  const setBgColor = useAppStore((state) => state.setBgColor);
  const swapColors = useAppStore((state) => state.swapColors);

  // Paleta personalizada de Zustand
  const customPalette = useAppStore((state) => state.customPalette);

  // Estados del selector modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<'fg' | 'bg'>('fg');
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(
    null,
  );

  const handleColorClick = (color: string, buttonType: number) => {
    if (buttonType === 2) {
      // Click derecho -> Color de fondo
      setBgColor(color);
    } else {
      // Click izquierdo/otro -> Color frontal
      setFgColor(color);
    }
  };

  const handleDoubleClick = (_color: string, target: 'fg' | 'bg') => {
    setEditingCustomIndex(null);
    setEditingTarget(target);
    setIsPickerOpen(true);
  };

  const handleCustomDoubleClick = (_color: string, index: number) => {
    setEditingCustomIndex(index);
    setIsPickerOpen(true);
  };

  const handlePickerSelect = (color: string) => {
    if (editingCustomIndex !== null) {
      // Actualizar el slot de la paleta personalizada en Zustand
      const newPalette = [...customPalette];
      newPalette[editingCustomIndex] = color;
      useAppStore.setState({ customPalette: newPalette });
      setEditingCustomIndex(null);
    } else {
      if (editingTarget === 'fg') {
        setFgColor(color);
      } else {
        setBgColor(color);
      }
    }
  };

  const currentInitialColor =
    editingCustomIndex !== null
      ? customPalette[editingCustomIndex]
      : editingTarget === 'fg'
        ? fgColor
        : bgColor;

  return (
    <div className="bg-[var(--bg-primary)] h-[62px] border-t border-[var(--border-color)] flex items-center p-1 px-3 gap-3 select-none theme-transition">
      {/* Indicador de Colores Activos (Traslape MS Paint) */}
      <div className="relative w-[38px] h-[38px] flex-shrink-0 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-[2px] theme-transition">
        {/* Color de Fondo (Atrás / Derecha) */}
        <button
          type="button"
          onContextMenu={(e) => {
            e.preventDefault();
            handleDoubleClick(bgColor, 'bg');
          }}
          className="absolute bottom-1 right-1 w-[18px] h-[18px] border border-[var(--border-color)] rounded-sm cursor-pointer outline-none"
          style={{ backgroundColor: bgColor }}
          title="Color secundario (Doble click para editar)"
          aria-label="Color secundario"
        />

        {/* Color Frontal (Adelante / Izquierda) */}
        <button
          type="button"
          onClick={() => swapColors()}
          onContextMenu={(e) => {
            e.preventDefault();
            handleDoubleClick(fgColor, 'fg');
          }}
          className="absolute top-1 left-1 w-[18px] h-[18px] border border-[var(--border-color)] rounded-sm cursor-pointer z-10 border-none outline-none animate-pulse-subtle"
          style={{ backgroundColor: fgColor }}
          title="Color primario (Doble click para editar)"
          aria-label="Color primario"
        />

        {/* Swap curves indicator overlay */}
        <button
          type="button"
          onClick={() => swapColors()}
          className="absolute top-[1px] right-[2px] text-[7px] text-[var(--text-muted)] leading-none opacity-40 hover:opacity-100 cursor-default outline-none z-20"
          title="Intercambiar colores"
        >
          ⇄
        </button>
      </div>

      {/* Grid de colores (3 filas x 16 columnas) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-[2px] rounded-md flex flex-col gap-[2px]">
        {/* Fila 1 */}
        <div className="flex gap-[2px]">
          {CLASSIC_PALETTE.slice(0, 16).map((color) => (
            <button
              key={`row1-${color}`}
              type="button"
              onMouseDown={(e) => handleColorClick(color, e.button)}
              onContextMenu={(e) => e.preventDefault()}
              onDoubleClick={() => handleDoubleClick(color, 'fg')}
              className="w-[12px] h-[12px] border border-[var(--border-color)]/30 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9] transition-transform"
              style={{ backgroundColor: color }}
              title={`Color: ${color.toUpperCase()}`}
            />
          ))}
        </div>

        {/* Fila 2 */}
        <div className="flex gap-[2px]">
          {CLASSIC_PALETTE.slice(16, 32).map((color) => (
            <button
              key={`row2-${color}`}
              type="button"
              onMouseDown={(e) => handleColorClick(color, e.button)}
              onContextMenu={(e) => e.preventDefault()}
              onDoubleClick={() => handleDoubleClick(color, 'fg')}
              className="w-[12px] h-[12px] border border-[var(--border-color)]/30 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9] transition-transform"
              style={{ backgroundColor: color }}
              title={`Color: ${color.toUpperCase()}`}
            />
          ))}
        </div>

        {/* Fila 3: Paleta Personalizada de la Sesión */}
        <div className="flex gap-[2px] border-t border-[var(--border-color)]/20 pt-[2px]">
          {customPalette.map((color, index) => {
            return (
              <button
                /* biome-ignore lint/suspicious/noArrayIndexKey: El orden de los slots de la paleta es estático y posicional */
                key={`custom-${index}-${color}`}
                type="button"
                onMouseDown={(e) => handleColorClick(color, e.button)}
                onContextMenu={(e) => e.preventDefault()}
                onDoubleClick={() => handleCustomDoubleClick(color, index)}
                className="w-[12px] h-[12px] border border-[var(--border-color)]/30 rounded-sm outline-none flex-shrink-0 cursor-default active:scale-[0.9] transition-transform relative group"
                style={{ backgroundColor: color }}
                title={`Personalizado ${index + 1}: ${color.toUpperCase()} (Doble click para editar)`}
              >
                {color.toLowerCase() === '#ffffff' && (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] text-[var(--text-muted)] opacity-50">
                    +
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Texto de Ayuda de Selección */}
      <div className="hidden md:flex flex-col text-[7.5px] text-[var(--text-muted)] leading-[1.3] font-sans ml-1">
        <span>🖱️ Click Izq: Primario</span>
        <span>🖱️ Click Der: Secundario</span>
        <span>✨ Doble Click: Editar Slot</span>
      </div>

      {/* Selector modal avanzado */}
      <ColorPicker
        isOpen={isPickerOpen}
        initialColor={currentInitialColor}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
