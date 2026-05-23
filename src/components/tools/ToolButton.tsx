import gsap from 'gsap';
import { useAppStore } from '../../store/useAppStore';
import type { ToolType } from '../../types/tools';

interface ToolButtonProps {
  tool: ToolType;
  label: string;
  shortcut: string;
}

export function ToolButton({ tool, label, shortcut }: ToolButtonProps) {
  const activeTool = useAppStore((state) => state.activeTool);
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const isActive = activeTool === tool;

  // El color del trazo cambia reactivamente según si el botón está activo o no
  const strokeColor = 'currentColor';

  // Renderizar un icono de pixel art específico en SVG
  const renderPixelIcon = () => {
    switch (tool) {
      case 'select':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <rect
              x="1.5"
              y="2.5"
              width="13"
              height="11"
              stroke={strokeColor}
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'eraser':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <rect
              x="2.5"
              y="5.5"
              width="7"
              height="5"
              fill={isActive ? '#93C5FD' : '#FF80FF'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <rect
              x="6.5"
              y="2.5"
              width="7"
              height="5"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <line
              x1="6.5"
              y1="2.5"
              x2="6.5"
              y2="7.5"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'bucket':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M2 10 L8 4 L12 8 L6 14 Z"
              fill={isActive ? '#93C5FD' : '#C0C0C0'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M12 8 L14 6 C15 5, 15 3, 13 4 Z"
              stroke={strokeColor}
              strokeWidth="1.5"
              fill="#00A2FF"
            />
            <circle cx="11" cy="12" r="1.5" fill="#00A2FF" />
            <circle cx="14" cy="13" r="1" fill="#00A2FF" />
          </svg>
        );
      case 'eyedropper':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M12 2 L14 4 L13 5 L11 3 Z"
              fill={isActive ? '#93C5FD' : '#808080'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M5 9 L11 3 L13 5 L7 11 Z"
              fill="#C0C0C0"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M2 14 L5 11 L7 13 Z"
              fill="#00A2FF"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <rect x="1" y="14" width="2" height="2" fill={strokeColor} />
          </svg>
        );
      case 'pencil':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M11 2 L14 5 L6 13 L3 10 Z"
              fill={isActive ? '#93C5FD' : '#FFFF00'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M2 14 L3 10 L6 13 Z"
              fill="#FF8080"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <polygon points="2,14 3,12 4,13" fill={strokeColor} />
          </svg>
        );
      case 'brush':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M4 12 L12 4 L13 5 L5 13 Z"
              fill={isActive ? '#93C5FD' : '#804000'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M12 4 L14 2 L15 3 L13 5 Z"
              fill="#FF0000"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M2 14 L4 12 L5 13 Z"
              fill="#C0C0C0"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'spray':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <rect
              x="5.5"
              y="6.5"
              width="5"
              height="7"
              fill={isActive ? '#93C5FD' : '#808080'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M6 3 L10 3 L9 6 L7 6 Z"
              fill="#C0C0C0"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <circle cx="8" cy="2" r="1.5" fill="#FF0000" />
            <circle cx="2" cy="4" r="0.5" fill={strokeColor} />
            <circle cx="3" cy="2" r="0.8" fill={strokeColor} />
            <circle cx="3" cy="6" r="0.6" fill={strokeColor} />
          </svg>
        );
      case 'text':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M3 13 L6 3 L10 3 L13 13 M4 10 L12 10"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          </svg>
        );
      case 'line':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <line
              x1="2"
              y1="14"
              x2="14"
              y2="2"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          </svg>
        );
      case 'rectangle':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <rect
              x="2"
              y="3.5"
              width="12"
              height="9"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </svg>
        );
      case 'ellipse':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <ellipse
              cx="8"
              cy="8"
              rx="6"
              ry="5"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </svg>
        );
      case 'bezier':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <path
              d="M2 12 C 4 2, 12 2, 14 12"
              stroke={strokeColor}
              strokeWidth="2"
            />
            <rect x="1.5" y="11.5" width="2" height="2" fill={strokeColor} />
            <rect x="12.5" y="11.5" width="2" height="2" fill={strokeColor} />
          </svg>
        );
      case 'polygon':
        return (
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            <polygon
              points="8,2.5 13.5,6.5 11.5,13 4.5,13 2.5,6.5"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </svg>
        );
      default:
        return <span className="text-[10px] font-bold">?</span>;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isActive) return;
    gsap.to(e.currentTarget, {
      scale: 1.04,
      x: 4,
      duration: 0.15,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      x: 0,
      duration: 0.15,
      ease: 'power2.out',
    });
  };

  return (
    <button
      type="button"
      onClick={() => setActiveTool(tool)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-full flex items-center gap-3 px-3 h-[36px] min-h-[36px] select-none border transition-all cursor-default text-left rounded-md ${
        isActive
          ? 'bg-[var(--bg-card)] border-[var(--accent-color)] text-[var(--accent-color)] shadow-sm font-bold'
          : 'bg-transparent border-transparent hover:bg-[var(--bg-card)]/50 text-[var(--text-main)]'
      }`}
      title={`${label} (${shortcut})`}
      aria-label={`${label} (${shortcut})`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {renderPixelIcon()}
      </div>
      <span className="text-[9px] font-bold tracking-widest font-sans uppercase">
        {label === 'Curva Bezier'
          ? 'CURVA'
          : label === 'Bote de Pintura'
            ? 'RELLENO'
            : label}
      </span>
    </button>
  );
}
