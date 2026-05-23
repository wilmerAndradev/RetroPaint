import { useState } from 'react';
import { TOOLS_LIST } from '../../constants/tools';
import { useAppStore } from '../../store/useAppStore';
import { ColorPicker } from '../panels/ColorPicker';
import { ToolButton } from './ToolButton';

export function ToolsPanel() {
  const fgColor = useAppStore((state) => state.fgColor);
  const bgColor = useAppStore((state) => state.bgColor);
  const setFgColor = useAppStore((state) => state.setFgColor);
  const setBgColor = useAppStore((state) => state.setBgColor);
  const swapColors = useAppStore((state) => state.swapColors);

  // Estados del selector modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<'fg' | 'bg'>('fg');

  const handleDoubleClick = (target: 'fg' | 'bg') => {
    setEditingTarget(target);
    setIsPickerOpen(true);
  };

  const handlePickerSelect = (color: string) => {
    if (editingTarget === 'fg') {
      setFgColor(color);
    } else {
      setBgColor(color);
    }
  };

  return (
    <div className="w-[150px] min-w-[150px] bg-[var(--bg-primary)] p-3 border-r border-[var(--border-color)] text-[var(--text-main)] theme-transition flex flex-col justify-between select-none h-full z-10">
      {/* 1. Lista Vertical de Herramientas */}
      <div className="flex flex-col gap-[6px]">
        {TOOLS_LIST.map((tool) => (
          <ToolButton
            key={tool.type}
            tool={tool.type}
            label={tool.label}
            shortcut={tool.shortcut}
          />
        ))}
      </div>

      {/* 2. Sección de Colores en el fondo de la barra lateral */}
      <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-[var(--border-color)]/60">
        {/* Contenedor de color frontal y fondo superpuestos */}
        <div className="flex items-center justify-between px-1">
          <div className="relative w-[50px] h-[50px] flex-shrink-0">
            {/* Color Secundario (Atrás / Derecha) */}
            <button
              type="button"
              onDoubleClick={() => handleDoubleClick('bg')}
              onClick={() => handleDoubleClick('bg')}
              className="absolute bottom-1 right-1 w-[30px] h-[30px] rounded border border-[var(--border-color)] shadow-sm cursor-pointer outline-none z-0"
              style={{ backgroundColor: bgColor }}
              title="Color secundario (Click para editar)"
              aria-label="Color secundario"
            />

            {/* Color Primario (Adelante / Izquierda) */}
            <button
              type="button"
              onDoubleClick={() => handleDoubleClick('fg')}
              onClick={() => handleDoubleClick('fg')}
              className="absolute top-1 left-1 w-[30px] h-[30px] rounded border border-[var(--border-color)] shadow-md cursor-pointer outline-none z-10"
              style={{ backgroundColor: fgColor }}
              title="Color primario (Click para editar)"
              aria-label="Color primario"
            />
          </div>

          {/* Botón de Intercambio */}
          <button
            type="button"
            onClick={() => swapColors()}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-main)] cursor-default transition-all"
            title="Intercambiar colores (Tecla X)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <title>Intercambiar</title>
              <path
                d="M4.5 5.5L7.5 2.5L10.5 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 10.5L8.5 13.5L5.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 2.5V11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M8.5 13.5V5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Botón + MÁS COLORES */}
        <button
          type="button"
          onClick={() => handleDoubleClick('fg')}
          className="w-full h-[32px] flex items-center justify-center gap-1.5 px-2 bg-transparent border border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-md hover:bg-[var(--bg-card)] text-[var(--text-main)] transition-all cursor-default"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <title>Agregar</title>
            <path
              d="M8 3V13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[8px] font-bold tracking-widest font-sans uppercase">
            MÁS COLORES
          </span>
        </button>
      </div>

      {/* Selector modal avanzado de color */}
      <ColorPicker
        isOpen={isPickerOpen}
        initialColor={editingTarget === 'fg' ? fgColor : bgColor}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
