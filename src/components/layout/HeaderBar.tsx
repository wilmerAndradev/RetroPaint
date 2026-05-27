import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportJPEG, exportPNG, exportWEBP } from '../../utils/exportCanvas';

interface HeaderBarProps {
  clearCanvas: (width?: number, height?: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

interface ResizePreviewProps {
  canvasWidth: number;
  canvasHeight: number;
  customWidth: number;
  customHeight: number;
  resizeModeLocal: 'center' | 'top-left' | 'clean';
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function ResizePreviewCanvas({
  canvasWidth,
  canvasHeight,
  customWidth,
  customHeight,
  resizeModeLocal,
  canvasRef,
}: ResizePreviewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 150, 100);

    // Draw background
    ctx.fillStyle = '#1e293b'; // slate 800
    ctx.fillRect(0, 0, 150, 100);

    // Fit bounding boxes
    const maxW = Math.max(canvasWidth, customWidth);
    const maxH = Math.max(canvasHeight, customHeight);
    const s = Math.min(130 / maxW, 80 / maxH);

    const ow = canvasWidth * s;
    const oh = canvasHeight * s;
    const nw = customWidth * s;
    const nh = customHeight * s;

    // Center coordinates
    const nX = 75 - nw / 2;
    const nY = 50 - nh / 2;

    let oX = 75 - ow / 2;
    let oY = 50 - oh / 2;

    if (resizeModeLocal === 'top-left') {
      oX = nX;
      oY = nY;
    }

    // Draw new canvas outline (dashed light blue)
    ctx.strokeStyle = '#38bdf8'; // sky 400
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(nX, nY, nw, nh);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.fillRect(nX, nY, nw, nh);

    if (resizeModeLocal !== 'clean') {
      // Draw original content clipped to original bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(oX, oY, ow, oh);
      ctx.clip();

      if (canvasRef.current) {
        ctx.drawImage(canvasRef.current, oX, oY, ow, oh);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(oX, oY, ow, oh);
      }
      ctx.restore();

      // Original bounds (solid red)
      ctx.strokeStyle = '#f43f5e'; // rose 500
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(oX, oY, ow, oh);
    } else {
      // Clean mode: original greyed out
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(oX, oY, ow, oh);
    }
  }, [
    canvasWidth,
    canvasHeight,
    customWidth,
    customHeight,
    resizeModeLocal,
    canvasRef,
  ]);

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
      <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
        VISTA PREVIA
      </span>
      <canvas
        ref={previewCanvasRef}
        width={150}
        height={100}
        className="border border-[var(--border-color)] rounded bg-white dark:bg-zinc-800 shadow-sm"
      />
    </div>
  );
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

  // Estados de modales premium desde Zustand
  const isResizeModalOpen = useAppStore((state) => state.isResizeModalOpen);
  const setIsResizeModalOpen = useAppStore(
    (state) => state.setIsResizeModalOpen,
  );
  const isExportModalOpen = useAppStore((state) => state.isExportModalOpen);
  const setIsExportModalOpen = useAppStore(
    (state) => state.setIsExportModalOpen,
  );
  const isNewCanvasModalOpen = useAppStore(
    (state) => state.isNewCanvasModalOpen,
  );
  const setIsNewCanvasModalOpen = useAppStore(
    (state) => state.setIsNewCanvasModalOpen,
  );
  const isShortcutsModalOpen = useAppStore(
    (state) => state.isShortcutsModalOpen,
  );
  const setIsShortcutsModalOpen = useAppStore(
    (state) => state.setIsShortcutsModalOpen,
  );

  // Estados locales para nuevos modals
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [newWidth, setNewWidth] = useState(canvasWidth);
  const [newHeight, setNewHeight] = useState(canvasHeight);
  const [newBackground, setNewBackground] = useState<
    'white' | 'black' | 'transparent'
  >('white');
  const [shortcutsTab, setShortcutsTab] = useState<
    'herramientas' | 'edicion' | 'navegacion'
  >('herramientas');

  // Estado para el redimensionamiento personalizado
  const [customWidth, setCustomWidth] = useState(canvasWidth);
  const [customHeight, setCustomHeight] = useState(canvasHeight);
  const [resizeModeLocal, setResizeModeLocal] = useState<
    'center' | 'top-left' | 'clean'
  >('center');

  const [lockRatio, setLockRatio] = useState(false);
  const [unit, setUnit] = useState<'px' | 'cm' | 'in'>('px');

  const originalRatio = canvasWidth / (canvasHeight || 1);

  const handleWidthChange = (newWidth: number) => {
    setCustomWidth(newWidth);
    if (lockRatio) {
      setCustomHeight(Math.round(newWidth / originalRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setCustomHeight(newHeight);
    if (lockRatio) {
      setCustomWidth(Math.round(newHeight * originalRatio));
    }
  };

  const pxToUnit = (px: number, u: 'px' | 'cm' | 'in') => {
    if (u === 'px') return px;
    if (u === 'in') return parseFloat((px / 96).toFixed(2));
    return parseFloat((px / (96 / 2.54)).toFixed(2));
  };

  const unitToPx = (val: number, u: 'px' | 'cm' | 'in') => {
    if (u === 'px') return Math.round(val);
    if (u === 'in') return Math.round(val * 96);
    return Math.round(val * (96 / 2.54));
  };

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
    setDimensions(customWidth, customHeight, resizeModeLocal);
    setIsResizeModalOpen(false);
    setStatusText(
      `Tamaño del lienzo cambiado a ${customWidth}x${customHeight}px (${resizeModeLocal.toUpperCase()})`,
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
      {/* 1. Izquierda: Logo Retro Paint y Creador */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
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

        {/* Separador vertical sutil */}
        <div className="w-[1px] h-6 bg-[var(--border-color)]/30" />

        {/* Firma clickable visible siempre */}
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          className="flex flex-col items-start cursor-pointer transition-all text-left group hover:scale-[1.02] active:scale-[0.98]"
          title="Ver información de RetroPaint y tecnologías"
        >
          <span className="text-[6.5px] text-[var(--text-muted)] font-mono tracking-wider font-bold uppercase leading-none mb-0.5 opacity-80 group-hover:opacity-100">
            Creado por
          </span>
          <span className="text-[7.5px] text-[var(--accent-color)] font-press-start tracking-tight font-bold hover:underline leading-none">
            WilmerAndradev
          </span>
        </button>
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
          onClick={() => {
            setNewWidth(canvasWidth);
            setNewHeight(canvasHeight);
            setIsNewCanvasModalOpen(true);
          }}
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

        {/* Botón ATAJOS */}
        <button
          type="button"
          onClick={() => setIsShortcutsModalOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 h-[48px] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] rounded-md transition-all active:scale-[0.97] text-[var(--text-main)]"
          title="Ver atajos de teclado (F1 o Ctrl+H)"
        >
          <span className="text-[12px]">⌨️</span>
          <span className="text-[8px] font-bold tracking-wider">ATAJOS</span>
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
      {isResizeModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[420px] text-[var(--text-main)] my-auto">
                <h3 className="font-press-start text-[13px] text-center mb-6 tracking-wide text-[var(--accent-color)]">
                  📐 TAMAÑO DEL LIENZO
                </h3>

                {/* Presets Rápidos */}
                <div className="mb-6">
                  <span className="text-[12px] font-bold uppercase tracking-wider block mb-3 text-[var(--text-muted)]">
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
                        className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[12.5px] font-bold hover:border-[var(--accent-color)] active:scale-95 transition-all text-center"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom inputs */}
                <div className="mb-6">
                  {/* Selector de Unidades */}
                  <div className="mb-4">
                    <span className="text-[11.5px] font-bold tracking-wide uppercase block mb-1.5 text-[var(--text-muted)]">
                      Unidad de Medida
                    </span>
                    <div className="flex rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] p-0.5">
                      {(['px', 'cm', 'in'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`flex-1 text-center py-1.5 text-[12.5px] font-bold rounded uppercase transition-all ${
                            unit === u
                              ? 'bg-[var(--accent-color)] text-white shadow-sm'
                              : 'text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          {u === 'in' ? 'pulgadas' : u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[12px] font-bold uppercase tracking-wider block mb-3 text-[var(--text-muted)]">
                    Dimensiones Personalizadas ({unit})
                  </span>

                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label
                        htmlFor="custom-width-input"
                        className="text-[11px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                      >
                        Ancho
                      </label>
                      <input
                        id="custom-width-input"
                        type="number"
                        step={unit === 'px' ? 1 : 0.01}
                        value={pxToUnit(customWidth, unit)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleWidthChange(unitToPx(val, unit));
                        }}
                        min={unit === 'px' ? 16 : 0.1}
                        max={unit === 'px' ? 3000 : 100}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[13.5px] font-bold font-mono p-2.5 rounded-md focus:border-[var(--accent-color)] outline-none"
                      />
                    </div>
                    <div className="text-[14px] font-bold text-[var(--text-muted)] mt-4">
                      ×
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="custom-height-input"
                        className="text-[11px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                      >
                        Alto
                      </label>
                      <input
                        id="custom-height-input"
                        type="number"
                        step={unit === 'px' ? 1 : 0.01}
                        value={pxToUnit(customHeight, unit)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleHeightChange(unitToPx(val, unit));
                        }}
                        min={unit === 'px' ? 16 : 0.1}
                        max={unit === 'px' ? 3000 : 100}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[13.5px] font-bold font-mono p-2.5 rounded-md focus:border-[var(--accent-color)] outline-none"
                      />
                    </div>
                  </div>

                  {/* Bloqueo de proporciones */}
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] select-none text-[var(--text-main)] font-bold mt-3">
                    <input
                      type="checkbox"
                      checked={lockRatio}
                      onChange={(e) => setLockRatio(e.target.checked)}
                      className="mt-0.5 accent-[var(--accent-color)] cursor-pointer"
                    />
                    <span>🔗 Mantener proporciones</span>
                  </label>

                  {/* Opción de redimensionamiento */}
                  <div className="mt-4">
                    <span className="text-[11.5px] font-bold tracking-wide uppercase block mb-2 text-[var(--text-muted)]">
                      Modo de Redimensionamiento
                    </span>
                    <div className="flex flex-col gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] p-2.5 rounded-lg">
                      {[
                        {
                          mode: 'center',
                          label: 'Conservar contenido centrado',
                          desc: 'Mantiene el dibujo en el centro',
                        },
                        {
                          mode: 'top-left',
                          label: 'Conservar en esquina superior izquierda',
                          desc: 'Mantiene el dibujo en la coordenada (0,0)',
                        },
                        {
                          mode: 'clean',
                          label: 'Empezar con un lienzo limpio',
                          desc: 'Borra el dibujo y crea un lienzo en blanco',
                        },
                      ].map((opt) => (
                        <label
                          key={opt.mode}
                          className="flex items-start gap-2.5 cursor-pointer text-[12.5px] select-none text-[var(--text-main)] hover:bg-[var(--bg-card)] p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="radio"
                            name="resize-mode"
                            checked={resizeModeLocal === opt.mode}
                            onChange={() =>
                              setResizeModeLocal(
                                opt.mode as 'center' | 'top-left' | 'clean',
                              )
                            }
                            className="mt-0.5 accent-[var(--accent-color)]"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {opt.desc}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vista previa relativa */}
                <div className="flex justify-center mb-6">
                  <ResizePreviewCanvas
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    customWidth={customWidth}
                    customHeight={customHeight}
                    resizeModeLocal={resizeModeLocal}
                    canvasRef={canvasRef}
                  />
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setIsResizeModalOpen(false)}
                    className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[13px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={applyResize}
                    className="px-5 py-2.5 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all"
                  >
                    APLICAR
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* --- MODAL EXPORTAR PREMIUM --- */}
      {isExportModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[550px] text-[var(--text-main)] my-auto">
                <h3 className="font-press-start text-[13px] text-center mb-6 tracking-wide text-[var(--accent-color)]">
                  💾 EXPORTAR LIENZO PREMIUM
                </h3>

                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {/* Vista previa */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-xl relative min-h-[160px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider block mb-2 text-[var(--text-muted)] absolute top-2">
                      Vista Previa
                    </span>
                    {exportPreviewUrl ? (
                      <img
                        src={exportPreviewUrl}
                        alt="Vista previa"
                        className="max-h-[150px] max-w-full object-contain shadow-md rounded-md bg-white border border-[var(--border-color)] p-1 mt-4"
                      />
                    ) : (
                      <span className="text-[12px] text-[var(--text-muted)] font-bold">
                        Generando miniatura...
                      </span>
                    )}
                    <span className="text-[11px] font-mono font-bold mt-2 text-[var(--text-muted)]">
                      {canvasWidth} × {canvasHeight} px
                    </span>
                  </div>

                  {/* Parámetros de descarga */}
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Nombre de archivo */}
                    <div>
                      <label
                        htmlFor="export-filename-input"
                        className="text-[11px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                      >
                        Nombre del Archivo
                      </label>
                      <input
                        id="export-filename-input"
                        type="text"
                        value={exportFileName}
                        onChange={(e) => setExportFileName(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[13px] font-bold p-2.5 rounded-md focus:border-[var(--accent-color)] outline-none"
                        placeholder="Nombre del archivo"
                      />
                    </div>

                    {/* Formato */}
                    <div>
                      <span className="text-[11px] font-bold tracking-wide uppercase block mb-1.5 text-[var(--text-muted)]">
                        Formato de Salida
                      </span>
                      <div className="flex rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] p-0.5">
                        {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setExportFormat(fmt)}
                            className={`flex-1 text-center py-1.5 text-[12.5px] font-bold rounded uppercase transition-all ${
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
                            className="text-[11px] font-bold tracking-wide uppercase text-[var(--text-muted)]"
                          >
                            Calidad de Compresión
                          </label>
                          <span className="text-[12px] font-bold font-mono text-[var(--accent-color)]">
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
                    className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[13px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={triggerDownload}
                    className="px-5 py-2.5 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>🚀</span> EXPORTAR DIBUJO
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* --- MODAL CONFIRMACIÓN NUEVO LIENZO --- */}
      {isNewCanvasModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-6 w-full max-w-[420px] text-[var(--text-main)] my-auto">
                <h3 className="font-press-start text-[13px] text-center mb-6 tracking-wide text-[var(--accent-color)] flex items-center justify-center gap-2">
                  📄 NUEVO LIENZO
                </h3>

                <div className="mb-6 text-center">
                  <span className="text-[20px] block mb-3">⚠️</span>
                  <p className="text-[15.5px] font-bold leading-relaxed text-[var(--text-main)]">
                    ¿Desea iniciar un lienzo totalmente nuevo?
                  </p>
                  <p className="text-[12.5px] text-[var(--text-muted)] mt-2 leading-relaxed">
                    El dibujo actual, todas sus capas y el historial de acciones
                    se borrarán de forma definitiva.
                  </p>
                </div>

                {/* Presets de tamaño para el nuevo lienzo */}
                <div className="mb-6">
                  <span className="text-[12px] font-bold uppercase tracking-wider block mb-2.5 text-[var(--text-muted)]">
                    Presets de tamaño
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '32 x 32 (Icono)', w: 32, h: 32 },
                      { label: '64 x 64 (Sprite)', w: 64, h: 64 },
                      { label: '400 x 300 (Classic)', w: 400, h: 300 },
                      { label: '800 x 600 (SVGA)', w: 800, h: 600 },
                      { label: '1280x720 (Moderno)', w: 1280, h: 720 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setNewWidth(item.w);
                          setNewHeight(item.h);
                        }}
                        className={`px-3 py-2 border rounded-md text-[12.5px] font-bold hover:border-[var(--accent-color)] active:scale-95 transition-all text-center ${
                          newWidth === item.w && newHeight === item.h
                            ? 'bg-[var(--accent-color)] text-white border-transparent'
                            : 'bg-[var(--bg-primary)] border-[var(--border-color)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensiones personalizadas */}
                <div className="mb-6">
                  <span className="text-[12px] font-bold uppercase tracking-wider block mb-3 text-[var(--text-muted)]">
                    Dimensiones (px)
                  </span>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label
                        htmlFor="new-width-input"
                        className="text-[11px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                      >
                        Ancho
                      </label>
                      <input
                        id="new-width-input"
                        type="number"
                        value={newWidth}
                        onChange={(e) =>
                          setNewWidth(parseInt(e.target.value, 10) || 0)
                        }
                        min={16}
                        max={3000}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[13.5px] font-bold font-mono p-2.5 rounded-md focus:border-[var(--accent-color)] outline-none"
                      />
                    </div>
                    <div className="text-[14px] font-bold text-[var(--text-muted)] mt-4">
                      ×
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="new-height-input"
                        className="text-[11px] font-bold tracking-wide uppercase block mb-1 text-[var(--text-muted)]"
                      >
                        Alto
                      </label>
                      <input
                        id="new-height-input"
                        type="number"
                        value={newHeight}
                        onChange={(e) =>
                          setNewHeight(parseInt(e.target.value, 10) || 0)
                        }
                        min={16}
                        max={3000}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[13.5px] font-bold font-mono p-2.5 rounded-md focus:border-[var(--accent-color)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Selector de Fondo */}
                <div className="mb-6">
                  <span className="text-[12px] font-bold uppercase tracking-wider block mb-2.5 text-[var(--text-muted)]">
                    Fondo
                  </span>
                  <div className="flex gap-2">
                    {(['white', 'black', 'transparent'] as const).map((bg) => {
                      const labels: Record<string, string> = {
                        white: 'Blanco ●',
                        black: 'Negro ●',
                        transparent: 'Transparente ◻',
                      };
                      return (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setNewBackground(bg)}
                          className={`px-3 py-2 border rounded-md text-[12.5px] font-bold hover:border-[var(--accent-color)] active:scale-95 transition-all text-center flex-1 ${
                            newBackground === bg
                              ? 'bg-[var(--accent-color)] text-white border-transparent'
                              : 'bg-[var(--bg-primary)] border-[var(--border-color)]'
                          }`}
                        >
                          {labels[bg]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsNewCanvasModalOpen(false)}
                    className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[13px] font-bold hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newWidth < 16 || newHeight < 16) {
                        setStatusText('Las dimensiones mínimas son 16x16 px');
                        return;
                      }
                      if (newWidth > 3000 || newHeight > 3000) {
                        setStatusText(
                          'Las dimensiones máximas son 3000x3000 px',
                        );
                        return;
                      }
                      useCanvasStore
                        .getState()
                        .setCanvasBackground(newBackground);
                      clearCanvas(newWidth, newHeight);
                      setIsNewCanvasModalOpen(false);
                    }}
                    className="px-5 py-2.5 bg-[var(--accent-color)] text-white border border-transparent rounded-lg text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all"
                  >
                    CREAR LIENZO
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* --- MODAL ATAJOS DE TECLADO --- */}
      {isShortcutsModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-5 w-full max-w-[500px] text-[var(--text-main)] my-auto flex flex-col">
                {/* Title Bar */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
                  <h3 className="font-press-start text-[13px] tracking-wide text-[var(--accent-color)] flex items-center gap-2">
                    ⌨️ ATAJOS DE TECLADO
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsShortcutsModalOpen(false)}
                    className="text-[14px] font-bold hover:text-[var(--accent-color)] transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Tabs Menu */}
                <div className="flex border-b border-[var(--border-color)] gap-1 mb-4">
                  {['herramientas', 'edicion', 'navegacion'].map((tab) => {
                    const labels: Record<string, string> = {
                      herramientas: 'HERRAMIENTAS',
                      edicion: 'EDICIÓN',
                      navegacion: 'NAVEGACIÓN',
                    };
                    const isActive = shortcutsTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() =>
                          setShortcutsTab(
                            tab as 'herramientas' | 'edicion' | 'navegacion',
                          )
                        }
                        className={`px-3 py-2 text-[12px] font-bold tracking-wider rounded-t-lg transition-all ${
                          isActive
                            ? 'bg-[var(--bg-card)] border-x border-t border-[var(--border-color)] text-[var(--accent-color)] -mb-[1px] relative z-10'
                            : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Shortcuts List */}
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-2 max-h-[260px]">
                  {shortcutsTab === 'herramientas' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'P', desc: 'Lápiz (Pencil)' },
                        { key: 'B', desc: 'Pincel (Brush)' },
                        { key: 'E', desc: 'Borrador (Eraser)' },
                        { key: 'F', desc: 'Relleno (Bucket Fill)' },
                        { key: 'I', desc: 'Cuentagotas (Eyedropper)' },
                        { key: 'T', desc: 'Texto flotante' },
                        { key: 'L', desc: 'Línea recta' },
                        { key: 'R', desc: 'Rectángulo' },
                        { key: 'O', desc: 'Elipse (Círculo)' },
                        { key: 'S', desc: 'Selección de área' },
                        { key: 'A', desc: 'Aerógrafo (Spray)' },
                        { key: 'C', desc: 'Curva Bézier' },
                        { key: 'G', desc: 'Polígono libre' },
                      ].map((s) => (
                        <div
                          key={s.key}
                          className="flex justify-between items-center bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 rounded-md"
                        >
                          <span className="text-[12px] font-bold text-[var(--text-main)]">
                            {s.desc}
                          </span>
                          <kbd className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-mono px-2.5 py-1 rounded shadow-sm text-[var(--accent-color)] font-bold">
                            {s.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  )}

                  {shortcutsTab === 'edicion' && (
                    <div className="flex flex-col gap-2">
                      {[
                        { key: 'Ctrl + Z', desc: 'Deshacer acción' },
                        { key: 'Ctrl + Y', desc: 'Rehacer acción' },
                        { key: 'Ctrl + S', desc: 'Guardar / Exportar imagen' },
                        { key: 'Ctrl + C', desc: 'Copiar selección' },
                        { key: 'Ctrl + X', desc: 'Cortar selección' },
                        { key: 'Ctrl + V', desc: 'Pegar selección' },
                        { key: 'Delete', desc: 'Borrar selección activa' },
                        {
                          key: 'X',
                          desc: 'Intercambiar colores (Frontal/Fondo)',
                        },
                        { key: 'H', desc: 'Alternar Relleno de Formas' },
                      ].map((s) => (
                        <div
                          key={s.key}
                          className="flex justify-between items-center bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 rounded-md"
                        >
                          <span className="text-[12px] font-bold text-[var(--text-main)]">
                            {s.desc}
                          </span>
                          <kbd className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-mono px-2.5 py-1 rounded shadow-sm text-[var(--accent-color)] font-bold">
                            {s.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  )}

                  {shortcutsTab === 'navegacion' && (
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          key: 'Espacio + Arrastrar',
                          desc: 'Panear lienzo (Mano)',
                        },
                        { key: '+', desc: 'Acercar zoom' },
                        { key: '-', desc: 'Alejar zoom' },
                        {
                          key: '0 o Ctrl + 0',
                          desc: 'Restablecer zoom al 100%',
                        },
                        {
                          key: 'Shift (Mantener)',
                          desc: 'Líneas a 45° / Cuadrados y Círculos perfectos',
                        },
                        {
                          key: 'Alt (Mantener)',
                          desc: 'Cuentagotas temporal (Selector)',
                        },
                        {
                          key: '[ / ]',
                          desc: 'Disminuir / Aumentar pincel en 1px',
                        },
                        {
                          key: 'Shift + [ / ]',
                          desc: 'Disminuir / Aumentar pincel en 10px',
                        },
                        {
                          key: 'Escape',
                          desc: 'Cancelar operación o deseleccionar',
                        },
                      ].map((s) => (
                        <div
                          key={s.key}
                          className="flex justify-between items-center bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 rounded-md"
                        >
                          <span className="text-[12px] font-bold text-[var(--text-main)]">
                            {s.desc}
                          </span>
                          <kbd className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-mono px-2.5 py-1 rounded shadow-sm text-[var(--accent-color)] font-bold">
                            {s.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Close Button */}
                <div className="border-t border-[var(--border-color)] pt-3 mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsShortcutsModalOpen(false)}
                    className="px-5 py-2.5 bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]/90 active:scale-95 transition-all text-[13px] font-bold rounded-lg uppercase tracking-wider"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* --- MODAL DE INFORMACIÓN (ACERCA DE) --- */}
      {isInfoModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-2xl rounded-xl p-5 w-full max-w-[480px] text-[var(--text-main)] my-auto flex flex-col relative overflow-hidden">
                
                {/* Decoración retro en la esquina                 {/* Title Bar */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4 z-10">
                  <h3 className="font-press-start text-[11px] tracking-wide text-[var(--accent-color)] flex items-center gap-2">
                    ℹ️ ACERCA DE RETROPAINT
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsInfoModalOpen(false)}
                    className="text-[14px] font-bold hover:text-[var(--accent-color)] transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border-color)]/10"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-4 z-10 text-left">
                  {/* Creador destacado */}
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-lg flex flex-col gap-1 items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-mono tracking-wider text-[var(--text-muted)] uppercase font-bold">
                      Desarrollado y Diseñado por
                    </span>
                    <span className="text-[14px] text-[var(--accent-color)] font-press-start tracking-wider font-extrabold my-1 select-all">
                      WilmerAndradev
                    </span>
                  </div>

                  {/* Descripción del Programa */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-[var(--accent-color)] uppercase">
                      El Proyecto
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-main)] font-medium">
                      RetroPaint es un sencillo editor de dibujo web inspirado en el clásico MS Paint de los años 90. Permite realizar dibujos de pixel-art, pintar con paletas de colores personalizadas, y seleccionar y mover elementos libremente en el lienzo con una interfaz limpia y nostálgica.
                    </p>
                  </div>

                  {/* Tecnologías Utilizadas */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)]/25 pb-1">
                      <span className="text-[11px] font-bold tracking-wider text-[var(--accent-color)] uppercase">
                        Tecnologías Utilizadas
                      </span>
                      <span className="text-[9.5px] font-mono text-[var(--text-muted)] font-semibold uppercase">
                        Haz clic para ver detalles de uso
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'React 19', desc: 'Interfaces reactivas de alto rendimiento' },
                        { name: 'Vite', desc: 'Empaquetador de desarrollo ultrarrápido' },
                        { name: 'Zustand', desc: 'Gestor del estado global centralizado' },
                        { name: 'Tailwind CSS', desc: 'Sistema de estilos retro responsivo' },
                        { name: 'GSAP', desc: 'Micro-animaciones fluidas premium' },
                        { name: 'TypeScript', desc: 'Estabilidad con tipado estático robusto' },
                        { name: 'Canvas API', desc: 'Renderizado y edición de píxeles veloz' },
                        { name: 'Biome / Vitest', desc: 'Entorno de calidad y pruebas unitarias' },
                      ].map((tech) => {
                        const isSelected = selectedTech === tech.name;
                        return (
                          <button
                            key={tech.name}
                            type="button"
                            onClick={() =>
                              setSelectedTech(selectedTech === tech.name ? null : tech.name)
                            }
                            className={`w-full text-left bg-[var(--bg-primary)] border px-3 py-2 rounded-md transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 shadow-sm'
                                : 'border-[var(--border-color)]/60 hover:border-[var(--accent-color)]/40 hover:bg-[var(--bg-primary)]/80'
                            }`}
                          >
                            <div className="text-[11.5px] font-bold text-[var(--text-main)] font-mono flex items-center justify-between">
                              <span>{tech.name}</span>
                              <span className="text-[9px] text-[var(--accent-color)] font-bold">
                                {isSelected ? '▲' : '▼'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] leading-tight mt-[2px]">
                              {tech.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Resumen dinámico al hacer clic en una tecnología */}
                    {selectedTech && (
                      <div className="bg-[var(--bg-primary)] border-l-2 border-[var(--accent-color)] p-3 rounded-md text-[11.5px] leading-relaxed transition-all mt-1.5 animate-fadeIn">
                        <span className="font-bold text-[var(--accent-color)] font-mono uppercase block mb-1 text-[11px]">
                          Uso de {selectedTech} en RetroPaint:
                        </span>
                        <p className="text-[var(--text-main)] font-medium text-justify">
                          {{
                            'React 19':
                              'Estructura la interfaz de usuario de forma modular y reactiva. Gestiona el ciclo de vida del lienzo, la renderización de las herramientas dinámicas y los paneles flotantes con un rendimiento excepcional.',
                            'Vite':
                              'Funciona como el motor de construcción rápido del proyecto, permitiendo un flujo de desarrollo instantáneo mediante recarga rápida de módulos (HMR) y un empaquetado final ligero y optimizado.',
                            'Zustand':
                              'Es el núcleo del estado global de la aplicación. Administra y sincroniza en tiempo real las herramientas activas, el color seleccionado, el grosor del pincel, el zoom y las dimensiones del lienzo sin re-renderizados innecesarios.',
                            'Tailwind CSS':
                              'Proporciona el sistema de diseño responsivo de RetroPaint. Permite crear la apariencia clásica de los 90 junto con el soporte nativo para los temas claro y oscuro con transiciones suaves.',
                            'GSAP':
                              'Añade micro-animaciones premium a la interfaz. Se encarga de hacer que la apertura de modales, los cambios de temas y las interacciones con botones se sientan fluidas y dinámicas en pantalla.',
                            'TypeScript':
                              'Asegura la solidez del código mediante tipado estático estricto. Previene errores en tiempo de desarrollo al definir rigurosamente la estructura del lienzo, las herramientas y el historial de cambios.',
                            'Canvas API':
                              'Es el motor gráfico de dibujo en tiempo real. Gestiona la rasterización directa de píxeles para el lápiz, pincel, figuras geométricas, relleno de color y las transformaciones de escala en la selección.',
                            'Biome / Vitest':
                              'Biome mantiene la calidad del código, el formateo y el análisis estático limpio. Vitest se utiliza para ejecutar pruebas unitarias del algoritmo de selección de píxeles contiguos de forma instantánea.',
                          }[selectedTech] || ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Close Button */}
                <div className="border-t border-[var(--border-color)] pt-3 mt-5 flex justify-end z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInfoModalOpen(false);
                      setSelectedTech(null);
                    }}
                    className="px-6 py-2.5 bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]/90 active:scale-95 transition-all text-[10.5px] font-press-start rounded-lg uppercase tracking-wide cursor-pointer shadow-md"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
