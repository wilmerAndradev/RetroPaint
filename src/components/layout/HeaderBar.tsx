import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportJPEG, exportPNG, exportWEBP } from '../../utils/exportCanvas';

interface HeaderBarProps {
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function HeaderBar({
  clearCanvas,
  undo,
  redo,
  canUndo,
  canRedo,
  canvasRef,
}: HeaderBarProps) {
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const setStatusText = useAppStore((state) => state.setStatusText);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  // Dimensiones del lienzo en store
  const canvasWidth = useCanvasStore((state) => state.width);
  const canvasHeight = useCanvasStore((state) => state.height);
  const setDimensions = useCanvasStore((state) => state.setDimensions);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de dropdowns
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);

  // Estados de modales premium
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Estado para el redimensionamiento personalizado
  const [customWidth, setCustomWidth] = useState(canvasWidth);
  const [customHeight, setCustomHeight] = useState(canvasHeight);

  // Estado para la exportación avanzada
  const [exportFileName, setExportFileName] = useState('retro-paint-dibujo');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>(
    'png',
  );
  const [exportQuality, setExportQuality] = useState(90);
  const [exportPreviewUrl, setExportPreviewUrl] = useState('');

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setZoomDropdownOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Generar miniatura cuando se abre el modal de exportación
  useEffect(() => {
    if (isExportModalOpen && canvasRef.current) {
      setExportPreviewUrl(canvasRef.current.toDataURL());
    }
  }, [isExportModalOpen, canvasRef]);

  const handleZoomSelect = (val: number) => {
    setZoom(val);
    setStatusText(`Zoom cambiado a ${val}%`);
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ajustar el lienzo al tamaño de la imagen cargada si es conveniente, o mantener el lienzo y centrarla
        setDimensions(img.width, img.height);

        // Esperar brevemente a que Zustand actualice y redibujar
        setTimeout(() => {
          const freshCtx = canvas.getContext('2d');
          if (freshCtx) {
            freshCtx.fillStyle = '#FFFFFF';
            freshCtx.fillRect(0, 0, img.width, img.height);
            freshCtx.drawImage(img, 0, 0);
            setStatusText(
              `Imagen importada correctamente: ${file.name} (${img.width}x${img.height})`,
            );
          }
        }, 50);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const windowContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Imprimir Retro Paint</title></head>
      <body style="margin:0; display:flex; align-items:center; justify-content:center; height:100vh;">
        <img src="${dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(windowContent);
      printWindow.document.close();
      setStatusText('Ventana de impresión iniciada.');
    }
  };

  // Alternar el tema Claro/Oscuro
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  // Aplicar redimensionado del lienzo
  const applyResize = () => {
    if (customWidth < 16 || customHeight < 16) {
      setStatusText('Las dimensiones mínimas son 16x16 px');
      return;
    }
    if (customWidth > 3000 || customHeight > 3000) {
      setStatusText('Las dimensiones máximas son 3000x3000 px');
      return;
    }
    setDimensions(customWidth, customHeight);
    setIsResizeModalOpen(false);
    setStatusText(
      `Tamaño del lienzo cambiado a ${customWidth}x${customHeight}px`,
    );
  };

  // Presets de tamaño de lienzo
  const applyPresetSize = (w: number, h: number) => {
    setCustomWidth(w);
    setCustomHeight(h);
  };

  // Exportar con nombre y formato elegido
  const triggerDownload = () => {
    if (!canvasRef.current) return;
    const fileName = exportFileName.trim() || 'dibujo-sin-nombre';

    if (exportFormat === 'png') {
      exportPNG(canvasRef.current, fileName);
    } else if (exportFormat === 'jpeg') {
      exportJPEG(canvasRef.current, fileName, exportQuality / 100);
    } else if (exportFormat === 'webp') {
      exportWEBP(canvasRef.current, fileName, exportQuality / 100);
    }

    setIsExportModalOpen(false);
    setStatusText(
      `Imagen exportada con éxito como ${exportFormat.toUpperCase()}`,
    );
  };

  return (
    <div className="bg-[var(--bg-primary)] h-[64px] min-h-[64px] flex items-center justify-between px-4 border-b border-[var(--border-color)] text-[var(--text-main)] theme-transition select-none z-50">
      {/* 1. Izquierda: Logo Retro Paint */}
      <div className="flex items-center gap-3">
        <svg
          width="32"
          height="32"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          <title>Retro Paint Logo</title>
          <rect x="3" y="1" width="10" height="14" fill="var(--accent-color)" />
          <rect x="4" y="2" width="8" height="12" fill="var(--bg-card)" />
          <rect x="5" y="4" width="2" height="2" fill="#FF4B4B" />
          <rect x="9" y="4" width="2" height="2" fill="#FFC93C" />
          <rect x="5" y="8" width="2" height="2" fill="#4BC56B" />
          <rect x="9" y="8" width="2" height="2" fill="#00A2FF" />
          <rect x="7" y="11" width="2" height="2" fill="#9D4EDD" />
          <rect
            x="3"
            y="1"
            width="10"
            height="1"
            fill="#FFFFFF"
            opacity="0.4"
          />
          <rect
            x="3"
            y="1"
            width="1"
            height="14"
            fill="#FFFFFF"
            opacity="0.4"
          />
        </svg>
        <div className="flex flex-col">
          <span className="font-press-start text-[8px] text-[var(--text-main)] tracking-widest font-bold leading-3">
            RETRO
          </span>
          <span className="font-press-start text-[8px] text-[var(--text-main)] tracking-widest font-bold leading-3">
            PAINT
          </span>
        </div>
      </div>

      {/* 2. Centro/Derecha: Controles */}
      <div className="flex items-center gap-[6px]">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Botón NUEVO */}
        <button
          type="button"
          onClick={clearCanvas}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Nuevo Lienzo (Limpiar)"
        >
          <span className="text-[12px]">📄</span>
          <span className="text-[8px] font-bold tracking-wider">NUEVO</span>
        </button>

        {/* Botón ABRIR */}
        <button
          type="button"
          onClick={handleOpenFile}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Abrir Imagen Local"
        >
          <span className="text-[12px]">📂</span>
          <span className="text-[8px] font-bold tracking-wider">ABRIR</span>
        </button>

        {/* Botón TAMAÑO LIENZO */}
        <button
          type="button"
          onClick={() => {
            setCustomWidth(canvasWidth);
            setCustomHeight(canvasHeight);
            setIsResizeModalOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Cambiar tamaño del lienzo"
        >
          <span className="text-[12px]">📐</span>
          <span className="text-[8px] font-bold tracking-wider">TAMAÑO</span>
        </button>

        {/* Botón EXPORTAR */}
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Exportar en formato Pro (PNG, JPG, WEBP)"
        >
          <span className="text-[12px]">💾</span>
          <span className="text-[8px] font-bold tracking-wider">EXPORTAR</span>
        </button>

        {/* Botón IMPRIMIR */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Imprimir lienzo"
        >
          <span className="text-[12px]">🖨️</span>
          <span className="text-[8px] font-bold tracking-wider">IMPRIMIR</span>
        </button>

        {/* Separador */}
        <div className="w-[1px] h-[32px] bg-[var(--border-color)] mx-1" />

        {/* Botón DESHACER */}
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          className={`flex flex-col items-center justify-center gap-1 px-3 h-[48px] rounded-md transition-all active:scale-[0.97] ${
            canUndo
              ? 'text-[var(--text-main)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)]'
              : 'text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-transparent'
          }`}
          title="Deshacer (Ctrl+Z)"
        >
          <span className="text-[12px]">↩️</span>
          <span className="text-[8px] font-bold tracking-wider">DESHACER</span>
        </button>

        {/* Botón REHACER */}
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          className={`flex flex-col items-center justify-center gap-1 px-3 h-[48px] rounded-md transition-all active:scale-[0.97] ${
            canRedo
              ? 'text-[var(--text-main)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)]'
              : 'text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-transparent'
          }`}
          title="Rehacer (Ctrl+Y)"
        >
          <span className="text-[12px]">↪️</span>
          <span className="text-[8px] font-bold tracking-wider">REHACER</span>
        </button>

        {/* Separador */}
        <div className="w-[1px] h-[32px] bg-[var(--border-color)] mx-1" />

        {/* ZOOM Dropdown */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setZoomDropdownOpen(!zoomDropdownOpen)}
            className={`flex items-center gap-1 px-2.5 h-[34px] hover:bg-[var(--bg-card)] border ${
              zoomDropdownOpen
                ? 'border-[var(--border-color)] bg-[var(--bg-card)]'
                : 'border-transparent'
            } hover:border-[var(--border-color)] rounded-md text-[var(--text-main)] transition-all`}
          >
            <span className="text-[10px] font-bold font-mono">🔍 {zoom}%</span>
            <span className="text-[7px] text-[var(--text-muted)]">▼</span>
          </button>

          {zoomDropdownOpen && (
            <div className="absolute top-[38px] right-0 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-md shadow-md py-1 min-w-[90px] z-50">
              {[25, 50, 100, 200, 300, 400, 800].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => handleZoomSelect(z)}
                  className={`w-full text-left px-3 py-1 text-[10px] hover:bg-[var(--bg-primary)] font-mono ${
                    z === zoom
                      ? 'bg-[var(--bg-primary)] font-bold text-[var(--accent-color)]'
                      : 'text-[var(--text-main)]'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="w-[1px] h-[32px] bg-[var(--border-color)] mx-1" />

        {/* SWITCH DESLIZANTE DE TEMAS CLARO / OSCURO */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold tracking-wider text-[var(--text-muted)] hidden md:inline">
            TEMA
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full p-0.5 w-[56px] h-[28px] relative cursor-pointer outline-none transition-all active:scale-95 duration-200"
            title={
              theme === 'light'
                ? 'Cambiar a Modo Oscuro'
                : 'Cambiar a Modo Claro'
            }
          >
            {/* Iconos fijos de fondo */}
            <span className="absolute left-[6px] text-[10px]">☀️</span>
            <span className="absolute right-[6px] text-[10px]">🌙</span>

            {/* Tirador deslizante */}
            <div
              className={`absolute top-[2px] w-[22px] h-[22px] rounded-full bg-[var(--accent-color)] shadow-md flex items-center justify-center transition-all duration-300 ${
                theme === 'light' ? 'left-[2px]' : 'left-[30px]'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
            </div>
          </button>
        </div>
      </div>

      {/* --- MODAL TAMAÑO LIENZO --- */}
      {isResizeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[420px] text-[var(--text-main)] max-h-[90vh] overflow-y-auto">
            <h3 className="font-press-start text-[10px] text-center mb-6 tracking-wide text-[var(--accent-color)]">
              📐 TAMAÑO DEL LIENZO
            </h3>

            {/* Presets Rápidos */}
            <div className="mb-6">
              <span className="text-[9px] font-bold uppercase tracking-wider block mb-3 text-[var(--text-muted)]">
                Presets Rápidos
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '32 x 32 (Icono)', w: 32, h: 32 },
                  { label: '64 x 64 (Sprite)', w: 64, h: 64 },
                  { label: '400 x 300 (Classic)', w: 400, h: 300 },
                  { label: '800 x 600 (SVGA)', w: 800, h: 600 },
                  { label: '1024x768 (HD Retro)', w: 1024, h: 768 },
                  { label: '1280x720 (Moderno)', w: 1280, h: 720 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyPresetSize(item.w, item.h)}
                    className="px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[9px] font-bold hover:border-[var(--accent-color)] active:scale-95 transition-all text-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom inputs */}
            <div className="mb-6">
              <span className="text-[9px] font-bold uppercase tracking-wider block mb-3 text-[var(--text-muted)]">
                Dimensiones Personalizadas (px)
              </span>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label
                    htmlFor="custom-width-input"
                    className="text-[8px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                  >
                    Ancho
                  </label>
                  <input
                    id="custom-width-input"
                    type="number"
                    value={customWidth}
                    onChange={(e) =>
                      setCustomWidth(parseInt(e.target.value, 10) || 0)
                    }
                    min={16}
                    max={3000}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[12px] font-bold font-mono p-2 rounded-md focus:border-[var(--accent-color)] outline-none"
                  />
                </div>
                <div className="text-[12px] font-bold text-[var(--text-muted)] mt-4">
                  ×
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="custom-height-input"
                    className="text-[8px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                  >
                    Alto
                  </label>
                  <input
                    id="custom-height-input"
                    type="number"
                    value={customHeight}
                    onChange={(e) =>
                      setCustomHeight(parseInt(e.target.value, 10) || 0)
                    }
                    min={16}
                    max={3000}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[12px] font-bold font-mono p-2 rounded-md focus:border-[var(--accent-color)] outline-none"
                  />
                </div>
              </div>
              <span className="text-[7.5px] block mt-2 text-[var(--text-muted)] italic">
                * Nota: Redimensionar el lienzo conservará los trazos actuales
                centrados.
              </span>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsResizeModalOpen(false)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[9px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={applyResize}
                className="px-4 py-2 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[9px] font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                APLICAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL EXPORTAR PREMIUM --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[550px] text-[var(--text-main)] max-h-[90vh] overflow-y-auto">
            <h3 className="font-press-start text-[10px] text-center mb-6 tracking-wide text-[var(--accent-color)]">
              💾 EXPORTAR LIENZO PREMIUM
            </h3>

            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Vista previa */}
              <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-xl relative min-h-[160px]">
                <span className="text-[8px] font-bold uppercase tracking-wider block mb-2 text-[var(--text-muted)] absolute top-2">
                  Vista Previa
                </span>
                {exportPreviewUrl ? (
                  <img
                    src={exportPreviewUrl}
                    alt="Vista previa"
                    className="max-h-[150px] max-w-full object-contain shadow-md rounded-md bg-white border border-[var(--border-color)] p-1 mt-4"
                  />
                ) : (
                  <span className="text-[9px] text-[var(--text-muted)] font-bold">
                    Generando miniatura...
                  </span>
                )}
                <span className="text-[8px] font-mono font-bold mt-2 text-[var(--text-muted)]">
                  {canvasWidth} × {canvasHeight} px
                </span>
              </div>

              {/* Parámetros de descarga */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Nombre de archivo */}
                <div>
                  <label
                    htmlFor="export-filename-input"
                    className="text-[8px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                  >
                    Nombre del Archivo
                  </label>
                  <input
                    id="export-filename-input"
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-bold p-2 rounded-md focus:border-[var(--accent-color)] outline-none"
                    placeholder="Nombre del archivo"
                  />
                </div>

                {/* Formato */}
                <div>
                  <span className="text-[8px] font-bold tracking-wide uppercase block mb-1.5 text-[var(--text-muted)]">
                    Formato de Salida
                  </span>
                  <div className="flex rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] p-0.5">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={`flex-1 text-center py-1 text-[9px] font-bold rounded uppercase transition-all ${
                          exportFormat === fmt
                            ? 'bg-[var(--accent-color)] text-white shadow-sm'
                            : 'text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG (Pro)' : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control de calidad (solo JPG/WEBP) */}
                {exportFormat !== 'png' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="export-quality-input"
                        className="text-[8px] font-bold tracking-wide uppercase text-[var(--text-muted)]"
                      >
                        Calidad de Compresión
                      </label>
                      <span className="text-[9px] font-bold font-mono text-[var(--accent-color)]">
                        {exportQuality}%
                      </span>
                    </div>
                    <input
                      id="export-quality-input"
                      type="range"
                      min="10"
                      max="100"
                      value={exportQuality}
                      onChange={(e) =>
                        setExportQuality(parseInt(e.target.value, 10))
                      }
                      className="w-full accent-[var(--accent-color)] bg-[var(--bg-primary)] rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[9px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={triggerDownload}
                className="px-5 py-2 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[9px] font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>🚀</span> EXPORTAR DIBUJO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
