import type React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportPNG } from '../../utils/exportCanvas';

interface ToolbarProps {
  clearCanvas: (width?: number, height?: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  clearCanvas,
  undo,
  redo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const activeTool = useAppStore((state) => state.activeTool);
  const setStatusText = useAppStore((state) => state.setStatusText);

  const fillTolerance = useCanvasStore((state) => state.fillTolerance);
  const setFillTolerance = useCanvasStore((state) => state.setFillTolerance);

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newZoom = Number(e.target.value);
    setZoom(newZoom);
    setStatusText(`Zoom cambiado a ${newZoom}%`);
  };

  const handleSave = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      exportPNG(canvas, 'retro-paint');
      setStatusText('Imagen guardada en descargas.');
    }
  };

  return (
    <div className="bg-[#D4D0C8] h-[34px] flex items-center px-2 border-b border-[#808080] gap-1 select-none">
      {/* Nuevo */}
      <button
        type="button"
        onClick={() => clearCanvas()}
        className="win95-btn py-[3px] px-[6px] flex items-center gap-1"
        title="Nuevo lienzo (Ctrl+N)"
      >
        <span className="text-xs">📄</span>
        <span className="text-[10px]">Nuevo</span>
      </button>

      {/* Guardar */}
      <button
        type="button"
        onClick={handleSave}
        className="win95-btn py-[3px] px-[6px] flex items-center gap-1"
        title="Guardar como PNG (Ctrl+S)"
      >
        <span className="text-xs">💾</span>
        <span className="text-[10px]">Guardar</span>
      </button>

      {/* Separador */}
      <div className="w-[2px] h-[20px] bg-[#808080] mx-1 border-r border-white" />

      {/* Deshacer */}
      <button
        type="button"
        disabled={!canUndo}
        onClick={undo}
        className={`win95-btn py-[3px] px-[6px] flex items-center gap-1 ${
          !canUndo ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Deshacer (Ctrl+Z)"
      >
        <span className="text-xs">↩️</span>
        <span className="text-[10px]">Deshacer</span>
      </button>

      {/* Rehacer */}
      <button
        type="button"
        disabled={!canRedo}
        onClick={redo}
        className={`win95-btn py-[3px] px-[6px] flex items-center gap-1 ${
          !canRedo ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Rehacer (Ctrl+Y)"
      >
        <span className="text-xs">↪️</span>
        <span className="text-[10px]">Rehacer</span>
      </button>

      {/* Separador */}
      <div className="w-[2px] h-[20px] bg-[#808080] mx-1 border-r border-white" />

      {/* Selector de Zoom */}
      <div className="flex items-center gap-1">
        <label htmlFor="toolbar-zoom" className="text-[10px] mr-1">
          Zoom:
        </label>
        <div className="win95-sunken-soft bg-white flex items-center">
          <select
            id="toolbar-zoom"
            value={zoom}
            onChange={handleZoomChange}
            className="bg-transparent text-[10px] px-1 py-[2px] outline-none border-none cursor-default font-mono"
          >
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={100}>100%</option>
            <option value={200}>200%</option>
            <option value={300}>300%</option>
            <option value={400}>400%</option>
            <option value={800}>800%</option>
          </select>
        </div>
      </div>

      {/* Tolerancia del Relleno (Bote de pintura / bucket) */}
      {activeTool === 'bucket' && (
        <div className="flex items-center gap-2 text-[10px] ml-4 pl-4 border-l border-[#808080]/40">
          <label htmlFor="toolbar-tolerance" className="text-[10px] mr-1">
            Tolerancia:
          </label>
          <input
            id="toolbar-tolerance"
            type="range"
            min={0}
            max={255}
            value={fillTolerance}
            onChange={(e) => setFillTolerance(Number(e.target.value))}
            className="w-20 cursor-pointer h-1.5 accent-[var(--accent-color)]"
            title="Tolerancia del bote de pintura (0-255)"
          />
          <span className="font-mono text-[9px] w-6 text-right">
            {fillTolerance}
          </span>
        </div>
      )}
    </div>
  );
}
