import type { ToolType } from '../types/tools';

export interface ToolDefinition {
  type: ToolType;
  label: string;
  description: string;
  shortcut: string;
  icon: string; // Emoji de respaldo
}

export const TOOLS_LIST: ToolDefinition[] = [
  {
    type: 'select',
    label: 'Selección',
    description: 'Selecciona un área rectangular para mover',
    shortcut: 'S',
    icon: '⬚',
  },
  {
    type: 'eraser',
    label: 'Borrador',
    description: 'Borra partes del dibujo usando el color secundario',
    shortcut: 'E',
    icon: '▰',
  },
  {
    type: 'bucket',
    label: 'Relleno',
    description: 'Rellena un área del mismo color con el color primario',
    shortcut: 'F',
    icon: '🪣',
  },
  {
    type: 'eyedropper',
    label: 'Cuentagotas',
    description: 'Selecciona un color del lienzo',
    shortcut: 'I',
    icon: '🧪',
  },
  {
    type: 'pencil',
    label: 'Lápiz',
    description: 'Dibuja trazos libres de un píxel de grosor',
    shortcut: 'P',
    icon: '✏️',
  },
  {
    type: 'brush',
    label: 'Pincel',
    description: 'Dibuja trazos con diferentes grosores y estilos',
    shortcut: 'B',
    icon: '🖌️',
  },
  {
    type: 'spray',
    label: 'Aerógrafo',
    description: 'Dibuja con un spray de pintura retro pixelado',
    shortcut: 'A',
    icon: '💨',
  },
  {
    type: 'text',
    label: 'Texto',
    description: 'Inserta texto en el lienzo con fuente Press Start 2P',
    shortcut: 'T',
    icon: 'A',
  },
  {
    type: 'line',
    label: 'Línea',
    description: 'Dibuja una línea recta. Presiona Shift para forzar ángulos',
    shortcut: 'L',
    icon: '╱',
  },
  {
    type: 'rectangle',
    label: 'Rectángulo',
    description: 'Dibuja un rectángulo con o sin relleno',
    shortcut: 'R',
    icon: '▭',
  },
  {
    type: 'ellipse',
    label: 'Elipse',
    description: 'Dibuja una elipse o círculo con o sin relleno',
    shortcut: 'O',
    icon: '◯',
  },
  {
    type: 'bezier',
    label: 'Curva',
    description: 'Dibuja una curva de Bézier interactiva',
    shortcut: 'C',
    icon: '〰',
  },
  {
    type: 'polygon',
    label: 'Polígono',
    description: 'Dibuja un polígono cerrado haciendo clic en los vértices',
    shortcut: 'G',
    icon: '⬡',
  },
];
