import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseLeave: React.MouseEventHandler<HTMLCanvasElement>;
  drawTextOnCanvas?: (text: string, x: number, y: number) => void;
}

export function CanvasArea({
  canvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  drawTextOnCanvas,
}: CanvasAreaProps) {
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const width = useCanvasStore((state) => state.width);
  const height = useCanvasStore((state) => state.height);
  const activeTool = useAppStore((state) => state.activeTool);

  // Estados para barra espaciadora / paneo
  const isSpacePressed = useAppStore((state) => state.isSpacePressed);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Entrada de texto flotante WYSIWYG
  const textInputCoords = useAppStore((state) => state.textInputCoords);
  const setTextInputCoords = useAppStore((state) => state.setTextInputCoords);
  const fgColor = useAppStore((state) => state.fgColor);
  const brushSize = useAppStore((state) => state.brushSize);
  const [textValue, setTextValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Manejador del zoom mediante rueda de mouse + Control
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const step = 25;
        if (e.deltaY < 0) {
          setZoom(zoom + step);
        } else {
          setZoom(zoom - step);
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, setZoom]);

  // Manejadores del Paneo (Drag-to-Scroll con Space)
  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpacePressed) {
      isPanningRef.current = true;
      const container = containerRef.current;
      if (container) {
        startPanRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: container.scrollLeft,
          scrollTop: container.scrollTop,
        };
      }
      e.preventDefault();
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      const container = containerRef.current;
      if (container) {
        const dx = e.clientX - startPanRef.current.x;
        const dy = e.clientY - startPanRef.current.y;
        container.scrollLeft = startPanRef.current.scrollLeft - dx;
        container.scrollTop = startPanRef.current.scrollTop - dy;
      }
      e.preventDefault();
    }
  };

  const handleContainerMouseUpOrLeave = () => {
    isPanningRef.current = false;
  };

  // Foco automático del textarea al aparecer
  useEffect(() => {
    if (textInputCoords && textareaRef.current) {
      textareaRef.current.focus();
      setTextValue('');
    }
  }, [textInputCoords]);

  // Consolidar el texto
  const handleTextBlur = () => {
    if (textInputCoords && drawTextOnCanvas && textValue.trim()) {
      drawTextOnCanvas(textValue, textInputCoords.x, textInputCoords.y);
    }
    setTextInputCoords(null);
    setTextValue('');
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTextInputCoords(null);
      setTextValue('');
    }
  };

  // Cursor del lienzo
  let cursorClass = 'cursor-crosshair';
  if (isSpacePressed) {
    cursorClass = isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab';
  } else {
    cursorClass = `cursor-tool-${activeTool}`;
  }

  const fontSize = brushSize * 4 + 10;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: el contenedor de lienzo maneja paneo y zoom interactivos no semánticos
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUpOrLeave}
      onMouseLeave={handleContainerMouseUpOrLeave}
      className={`flex-1 bg-[var(--bg-secondary)] pixel-grid-bg overflow-auto p-8 flex items-start justify-center relative select-none theme-transition ${
        isSpacePressed
          ? isPanningRef.current
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : ''
      }`}
    >
      {/* Contenedor del zoom para centrar el lienzo */}
      <div
        className="relative transition-transform duration-75 flex items-center justify-center min-w-max min-h-max"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          marginTop: '10px',
        }}
      >
        {/* El lienzo HTML5 (Canvas) */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onContextMenu={(e) => e.preventDefault()} // Desactivar clic derecho
          className={`pixelated-canvas bg-white shadow-sm border border-[var(--border-color)] theme-transition ${cursorClass}`}
        />

        {/* Textarea flotante in-situ WYSIWYG */}
        {textInputCoords && (
          <textarea
            ref={textareaRef}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            style={{
              position: 'absolute',
              left: `${textInputCoords.x}px`,
              top: `${textInputCoords.y}px`,
              fontFamily: '"Press Start 2P", monospace',
              fontSize: `${fontSize}px`,
              color: fgColor,
              caretColor: fgColor,
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px dashed var(--border-color)',
              outline: 'none',
              resize: 'none',
              margin: 0,
              padding: '2px',
              zIndex: 50,
              minWidth: '150px',
              height: `${fontSize + 16}px`,
              lineHeight: '1',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          />
        )}
      </div>
    </div>
  );
}
