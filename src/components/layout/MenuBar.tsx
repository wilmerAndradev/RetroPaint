import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { exportJPEG, exportPNG, exportWEBP } from '../../utils/exportCanvas';

interface MenuBarProps {
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function MenuBar({
  clearCanvas,
  undo,
  redo,
  canUndo,
  canRedo,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const setStatusText = useAppStore((state) => state.setStatusText);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuName);
    }
  };

  const handleMouseEnter = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const triggerAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  // Menús interactivos
  const menus = {
    Archivo: [
      { label: 'Nuevo', shortcut: 'Ctrl+N', action: () => clearCanvas() },
      {
        label: 'Guardar (PNG)',
        shortcut: 'Ctrl+S',
        action: () => {
          const canvas = document.querySelector('canvas');
          if (canvas) exportPNG(canvas, 'retro-paint');
        },
      },
      {
        label: 'Exportar JPEG',
        shortcut: '',
        action: () => {
          const canvas = document.querySelector('canvas');
          if (canvas) exportJPEG(canvas, 'retro-paint');
        },
      },
      {
        label: 'Exportar WEBP',
        shortcut: '',
        action: () => {
          const canvas = document.querySelector('canvas');
          if (canvas) exportWEBP(canvas, 'retro-paint');
        },
      },
      { divider: true },
      { label: 'Salir', shortcut: '', action: () => window.close() },
    ],
    Editar: [
      {
        label: 'Deshacer',
        shortcut: 'Ctrl+Z',
        disabled: !canUndo,
        action: () => undo(),
      },
      {
        label: 'Rehacer',
        shortcut: 'Ctrl+Y',
        disabled: !canRedo,
        action: () => redo(),
      },
      { divider: true },
      { label: 'Limpiar Lienzo', shortcut: '', action: () => clearCanvas() },
    ],
    Ver: [
      {
        label: 'Acercar (+)',
        shortcut: '+',
        action: () => {
          setZoom(zoom + 25);
          setStatusText(`Zoom: ${zoom + 25}%`);
        },
      },
      {
        label: 'Alejar (-)',
        shortcut: '-',
        action: () => {
          setZoom(zoom - 25);
          setStatusText(`Zoom: ${zoom - 25}%`);
        },
      },
      {
        label: 'Zoom 100%',
        shortcut: '',
        action: () => {
          setZoom(100);
          setStatusText('Zoom al 100%');
        },
      },
    ],
    Ayuda: [
      {
        label: 'Acerca de Retro Paint...',
        shortcut: '',
        action: () => setShowAbout(true),
      },
    ],
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#D4D0C8] h-[24px] flex items-center px-1 border-b border-[#808080] select-none text-[11px] gap-1 z-50 relative"
    >
      {Object.entries(menus).map(([menuName, items]) => {
        const isOpen = activeMenu === menuName;
        return (
          <div key={menuName} className="relative h-full flex items-center">
            {/* Botón de cabecera de menú */}
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter(menuName)}
              onClick={() => handleMenuClick(menuName)}
              className={`px-3 py-[2px] cursor-default hover:bg-[#1E3A8A] hover:text-white outline-none ${
                isOpen ? 'bg-[#1E3A8A] text-white' : 'text-black'
              }`}
            >
              {menuName}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-[22px] left-0 bg-[#D4D0C8] win95-raised-double min-w-[160px] flex flex-col p-1 z-50">
                {items.map((item, idx) => {
                  if ('divider' in item) {
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: dividers are static elements without labels
                        key={`div-${idx}`}
                        className="h-[2px] bg-[#808080] my-1 border-b border-white"
                      />
                    );
                  }

                  const isItemDisabled = 'disabled' in item && item.disabled;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={isItemDisabled}
                      onClick={() =>
                        !isItemDisabled && triggerAction(item.action)
                      }
                      className={`flex justify-between items-center px-4 py-1 text-left w-full cursor-default ${
                        isItemDisabled
                          ? 'text-[#808080] win95-text-shadow'
                          : 'hover:bg-[#1E3A8A] hover:text-white text-black'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span
                          className={`text-[9px] ml-4 ${isItemDisabled ? 'text-[#808080]' : 'text-[#404040] hover:text-white'}`}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* About Box Modal Dialog */}
      {showAbout && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 select-none">
          <div className="w-[320px] bg-[#D4D0C8] win95-raised-double p-[3px]">
            {/* Dialog Titlebar */}
            <div className="win95-title-bar-gradient h-[22px] flex items-center justify-between px-2">
              <span className="font-press-start text-[8px] text-white font-bold">
                Acerca de Retro Paint
              </span>
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="win95-btn w-[14px] h-[14px] flex items-center justify-center p-0 text-[8px]"
              >
                ✕
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 flex flex-col items-center gap-4 text-center">
              {/* App Icon */}
              <div className="w-12 h-12 bg-white win95-sunken-soft flex items-center justify-center text-2xl">
                🎨
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-press-start text-[9px] font-bold text-[#1E3A8A]">
                  RETRO PAINT WEB
                </h3>
                <span className="text-[10px] text-black">
                  Versión 1.0.0 (Win95 Edition)
                </span>
                <span className="text-[9px] text-[#404040] mt-2">
                  Construido con React 19 + TypeScript + Zustand + Tailwind CSS
                  v4 + Biome.
                </span>
                <span className="text-[8px] text-emerald-800 font-bold mt-2">
                  Pair-programmed with Antigravity AI
                </span>
              </div>

              {/* Accept button */}
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="win95-btn min-w-[70px] mt-2"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
