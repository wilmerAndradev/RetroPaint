import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';
import { CanvasArea } from './components/canvas/CanvasArea';
import { HeaderBar } from './components/layout/HeaderBar';
import { StatusBar } from './components/layout/StatusBar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { ToolsPanel } from './components/tools/ToolsPanel';
import { useCanvas } from './hooks/useCanvas';
import { useKeyboard } from './hooks/useKeyboard';
import { useAppStore } from './store/useAppStore';

function App() {
  const theme = useAppStore((state) => state.theme);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Inicializar hook del lienzo y sus manejadores
  const {
    canvasRef,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
    clearCanvas,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    drawTextOnCanvas,
    deleteSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    loadDrawingOnCanvas,
    cancelActiveOperation,
    selectAll,
    deselect,
    openImageFile,
    pasteFromClipboard,
  } = useCanvas();

  // Inicializar manejadores de teclado globales
  useKeyboard({
    undo: handleUndo,
    redo: handleRedo,
    cancelActiveOperation,
    copySelection,
    cutSelection,
    pasteSelection,
    deleteSelection,
    canvasRef,
    selectAll,
    deselect,
    openImageFile,
    pasteFromClipboard,
  });

  // Animaciones de entrada sincronizadas (Initial load staggered animation)
  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.6 },
      });

      tl.fromTo(
        '.header-bar-anim',
        { y: -64, opacity: 0 },
        { y: 0, opacity: 1 },
      )
        .fromTo(
          '.tools-panel-anim',
          { x: -150, opacity: 0 },
          { x: 0, opacity: 1 },
          '-=0.35',
        )
        .fromTo(
          '.properties-panel-anim',
          { x: 180, opacity: 0 },
          { x: 0, opacity: 1 },
          '-=0.45',
        )
        .fromTo(
          '.canvas-area-anim',
          { scale: 0.96, opacity: 0 },
          { scale: 1, opacity: 1 },
          '-=0.4',
        )
        .fromTo(
          '.status-bar-anim',
          { y: 48, opacity: 0 },
          { y: 0, opacity: 1 },
          '-=0.45',
        );
    },
    { scope: containerRef },
  );

  // Animación de destello al cambiar el tema
  useGSAP(() => {
    if (!theme) return;

    gsap.fromTo(
      '.theme-transition-overlay',
      { opacity: 0.7 },
      { opacity: 0, duration: 0.4, ease: 'power2.out' },
    );
  }, [theme]);

  // Asignar clase del tema
  const themeClass = theme === 'dark' ? 'dark' : '';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden select-none theme-transition relative ${themeClass}`}
    >
      {/* Destello para cambio de tema */}
      <div className="theme-transition-overlay absolute inset-0 bg-white/40 dark:bg-black/30 pointer-events-none z-[10000] opacity-0" />

      {/* 1. Barra Superior Unificada */}
      <div className="header-bar-anim z-50">
        <HeaderBar
          clearCanvas={clearCanvas}
          undo={handleUndo}
          redo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          canvasRef={canvasRef}
        />
      </div>

      {/* 2. Área Central (Lienzo y Paneles Laterales) */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
        {/* Panel Izquierdo: Herramientas de dibujo y selectores de color */}
        <div className="tools-panel-anim z-20 h-full">
          <ToolsPanel />
        </div>

        {/* Centro: Lienzo de dibujo interactivo */}
        <div className="canvas-area-anim flex-1 h-full min-w-0">
          <CanvasArea
            canvasRef={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            drawTextOnCanvas={drawTextOnCanvas}
          />
        </div>

        {/* Panel Derecho: Propiedades de la herramienta activa */}
        <div className="properties-panel-anim z-20 h-full">
          <PropertiesPanel
            deleteSelection={deleteSelection}
            copySelection={copySelection}
            cutSelection={cutSelection}
            pasteSelection={pasteSelection}
            canvasRef={canvasRef}
            loadDrawingOnCanvas={loadDrawingOnCanvas}
          />
        </div>
      </div>

      {/* 3. Barra Inferior Unificada (Paleta + Estado) */}
      <div className="status-bar-anim z-30">
        <StatusBar />
      </div>
    </div>
  );
}

export default App;
