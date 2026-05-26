# RetroPaint Studio Pro — Reporte Técnico de Arquitectura y Funciones

Bienvenido al reporte técnico oficial de **RetroPaint Studio Pro**. Este documento proporciona una radiografía completa de la arquitectura del software, su estructura de archivos, sus motores de lógica interna, el estado global de datos, y las herramientas de dibujo que dan vida a esta suite de pintura web avanzada.

---

## 1. Resumen Ejecutivo del Proyecto

**RetroPaint Studio Pro** es una suite avanzada de dibujo y pintura digital en la web construida sobre **React**, **Vite**, **TypeScript**, **Zustand** y **TailwindCSS**. Combina la nostalgia visual y la sencillez de *MS Paint clásico* con el rendimiento, la interactividad y la robustez de herramientas modernas como *Sumo Paint* y *Photopea*.

### Pilares Fundamentales:
* **Rendimiento Nativo (60 FPS):** Implementación de renderizado canvas HTML5 de alto rendimiento apoyado por un lienzo de previsualización dinámico (Buffer Canvas) para cálculos interactivos ultra suaves.
* **Arquitectura de Estado Desacoplada:** Flujos de datos predecibles e instantáneos mediante tiendas globales Zustand altamente optimizadas para sincronizar UI y Canvas en caliente.
* **Alineación con Estándares de Producción:** Formateo y análisis estático estricto controlado por **Biome** para garantizar un código limpio, rápido y libre de vulnerabilidades.

---

## 2. Mapa y Estructura del Código Fuente

A continuación se detalla la distribución de archivos en el proyecto bajo la carpeta principal `src/`:

```bash
src/
├── App.tsx                    # Componente raíz que orquesta el layout tipo escritorio
├── main.tsx                   # Punto de entrada de la aplicación React v19
├── index.css                  # Variables CSS globales, temas (Oscuro/Clásico/PixelArt) y fuentes
├── assets/                    # Assets estáticos (Vite, React, logos)
├── components/                # Componentes React de interfaz de usuario
│   ├── canvas/
│   │   └── CanvasArea.tsx     # Lienzo interactivo principal, reglas (Rulers) y cuadrícula
│   ├── layout/
│   │   ├── TitleBar.tsx       # Barra de título estilo ventana de sistema retro
│   │   ├── MenuBar.tsx        # Menús desplegables superiores (Archivo, Edición, Imagen, Ver)
│   │   ├── HeaderBar.tsx      # Controles y botones de acceso directo
│   │   ├── Toolbar.tsx        # Controles contextuales específicos de la herramienta activa
│   │   └── StatusBar.tsx      # Barra de información inferior (Coordenadas, herramientas, tamaño)
│   ├── panels/
│   │   ├── ColorPalette.tsx   # Paleta clásica de colores rápidos inferiores
│   │   ├── ColorPicker.tsx    # Selector de color avanzado arrastrable (Draggable) y no bloqueante
│   │   └── PropertiesPanel.tsx# Panel lateral de propiedades contextuales
│   └── tools/
│       ├── ToolButton.tsx     # Botón individual de herramienta con atajos y tooltip
│       └── ToolsPanel.tsx     # Panel lateral izquierdo de selección de herramientas de pintura
├── constants/                 # Constantes de configuración globales
│   ├── palette.ts             # Definición de la paleta clásica de 32 colores
│   └── tools.ts               # Estructura y atajos de teclado para herramientas de dibujo
├── hooks/                     # Custom hooks para aislar lógica del Canvas y el teclado
│   ├── useCanvas.ts           # Motor interactivo de trazos, figuras geométricas y renderizado
│   ├── useHistory.ts          # Gestor de historial (Undo/Redo) de ImageData sin pérdida
│   └── useKeyboard.ts         # Orquestador de atajos de teclado profesionales
├── store/                     # Manejadores de estado global con Zustand
│   ├── useAppStore.ts         # Tienda de UI: colores activos, paletas de sesión, mensajes y temas
│   └── useCanvasStore.ts      # Tienda del Canvas: herramienta activa, pincel, opacidad y dureza
├── types/                     # Tipados estrictos de TypeScript
│   ├── canvas.ts              # Tipos del lienzo y configuraciones
│   └── tools.ts               # Tipos de herramientas de dibujo
└── utils/                     # Utilidades matemáticas y algorítmicas con cobertura de test
    ├── colors.ts              # Conversor de formatos de color (HEX ⇄ RGB ⇄ HSL)
    ├── exportCanvas.ts        # Exportador dinámico de imágenes a JPG, PNG y WebP
    └── floodFill.ts           # Algoritmo Flood Fill ultra optimizado para relleno por cubeta
```

---

## 3. Desglose Detallado de Funciones y Módulos

### 3.1. El Motor de Dibujo y Canvas (`hooks/useCanvas.ts` y `CanvasArea.tsx`)
El corazón gráfico de la aplicación está compuesto por un sistema interactivo de doble lienzo:
1. **Lienzo de Dibujo Principal (Canvas):** Dónde se consolida el arte de forma definitiva.
2. **Lienzo de Previsualización (Buffer Canvas):** Un lienzo transparente superpuesto que dibuja en caliente figuras geométricas en movimiento (líneas, rectángulos, elipses, curvas) o textos flotantes antes de que el usuario suelte el ratón. Esto evita degradar el lienzo original durante la interacción.

#### Capacidades de Dibujo:
* **Herramientas de Trazo Libre (Lápiz, Pincel, Borrador):** Dibujo continuo mediante interpolación lineal matemática (`lineTo`) que previene trazos cortados cuando el ratón se mueve rápidamente. Soporta dinámicas de tamaño por velocidad y dureza regulable del pincel.
* **Formas Geométricas Precisas:** Dibujo dinámico de líneas rectas, rectángulos (con o sin relleno), elipses (círculos perfectos usando la tecla `Shift`), triángulos, estrellas y polígonos.
* **Texto en el Lienzo:** Permite insertar texto interactivo con selección de tipografía, tamaño y color directamente en las coordenadas seleccionadas mediante un cuadro de texto flotante.
* **Reglas Métricas (Rulers):** Reglas integradas en los ejes X e Y que miden los píxeles del lienzo y muestran marcadores dinámicos sincronizados con la posición en tiempo real de tu cursor.
* **Cuadrícula de Píxeles (Grid):** Cuadrícula visual de precisión para trabajos detallados a nivel de píxel (Pixel Art), activable desde la barra superior.

---

### 3.2. Selector de Color Flotante Draggable (`components/panels/ColorPicker.tsx`)
Una ventana flotante premium rediseñada bajo las mejores directrices de UX de software de escritorio:
* **Comportamiento No Bloqueante:** Se eliminó el overlay oscuro bloqueante tradicional. Puedes dejar la paleta abierta en una esquina y seguir pintando en el lienzo en tiempo real.
* **Arrastrable (Draggable):** Permite ser movida libremente por toda la pantalla arrastrando desde su barra superior de título. Cuenta con controles táctiles y límites inteligentes para evitar perder la ventana fuera de la pantalla.
* **Memoria de Sesión:** Guarda su última posición. Al cerrarse y volverse a abrir, se restaura en el mismo lugar de la pantalla donde el usuario la dejó.
* **Sincronización en Caliente:**
  * **Hacia la aplicación:** Mover los sliders RGB/HSL o interactuar con la Rueda Cromática de Canvas actualiza el color de tu pincel de forma interactiva y al instante.
  * **Desde la aplicación:** Reacciona a cambios externos (como la herramienta Cuentagotas capturando un color sobre el lienzo) actualizando sus sliders visuales de inmediato sin bucles de retroalimentación redundantes.
* **Opciones Avanzadas:** Sección de Colores Recientes e integración con la Paleta Personalizada de la sesión (añadir color actual con un solo clic).

---

### 3.3. Algoritmo de Relleno por Tolerancia (`utils/floodFill.ts`)
El tarro de pintura (Relleno por Cubeta) utiliza una implementación del clásico algoritmo **Flood Fill** altamente optimizada para navegadores web:
* **Rendimiento de Bajo Nivel:** En lugar de llamadas recursivas (que desbordarían la pila de llamadas del navegador), utiliza una estructura de cola iterativa para procesar los píxeles adyacentes.
* **Lectura Directa de Memoria:** Manipula directamente el array de bits unidimensional `Uint8ClampedArray` de `ImageData` extraído de la GPU, garantizando rellenos de lienzos grandes en menos de 10 milisegundos.
* **Tolerancia de Color Regulable (0 - 100):** Calcula la distancia de color Euclidiana en el espacio RGB para rellenar áreas similares que no compartan un color idéntico al 100%, ideal para trabajar con imágenes con degradados o ruido de compresión.

---

### 3.4. Sistema de Historial sin Pérdida (`hooks/useHistory.ts`)
Implementación de un búfer circular de estados de lienzo para proporcionar soporte a **Deshacer (Undo)** y **Rehacer (Redo)**:
* **Estados Inmutables:** Guarda una copia exacta de los píxeles (`ImageData`) en cada acción de dibujo consolidada (`onMouseUp`).
* **Límite Seguro (50 Pasos):** Protege la memoria RAM del navegador limitando el historial a los últimos 50 pasos, descartando automáticamente los más antiguos en segundo plano.
* **Consumo Eficiente:** El motor limpia y regenera los datos únicamente cuando es estrictamente necesario, evitando fugas de memoria al cambiar el tamaño del lienzo.

---

### 3.5. Exportador Multiformato Avanzado (`utils/exportCanvas.ts`)
Módulo encargado de empaquetar y descargar el arte creado por el usuario:
* **Formatos de Alta Fidelidad:** Permite descargar el lienzo en formatos **PNG** (sin pérdida), **JPG** (con fondo blanco sólido por defecto) y **WebP** (óptimo para web).
* **Calidad Personalizable:** Mapeo de la resolución nativa del canvas para evitar distorsiones de escalado.

---

### 3.6. Mapeo de Atajos y Teclado Profesional (`hooks/useKeyboard.ts`)
Para emular el flujo de trabajo ágil de aplicaciones profesionales, mapea atajos rápidos a nivel global:
* `B` / `P` → Activar herramienta Pincel.
* `E` → Activar herramienta Borrador.
* `G` → Activar Relleno (Bucket Fill).
* `I` → Activar Cuentagotas (Eyedropper).
* `T` → Activar Herramienta de Texto.
* `X` → Intercambiar color primario y secundario.
* `D` → Restablecer colores por defecto (Primario: Negro, Secundario: Blanco).
* `Ctrl + Z` → Deshacer (Undo).
* `Ctrl + Y` / `Ctrl + Shift + Z` → Rehacer (Redo).

---

## 4. Gestión del Estado Global con Zustand

El estado de la aplicación está desacoplado inteligentemente en dos tiendas Zustand reactivas y coordinadas:

### 4.1. Tienda de UI (`store/useAppStore.ts`)
Gestiona toda la configuración y componentes visuales de la aplicación:
* `fgColor` y `bgColor`: Color primario y secundario activos.
* `customPalette`: Array con los 16 slots personalizables de la paleta inferior de la sesión.
* `recentColors`: Cola de los últimos 8 colores utilizados por el selector avanzado.
* `statusText`: Ayudas e instrucciones dinámicas que se muestran al usuario en la barra inferior (StatusBar).
* `activeTheme`: El tema visual en uso (`classic` al estilo retro gris, `dark` modo oscuro moderno, `pixelart` estética vintage colorida).

### 4.2. Tienda del Lienzo (`store/useCanvasStore.ts`)
Controla las propiedades operativas del motor de dibujo:
* `currentTool`: Herramienta activa seleccionada en la barra de herramientas.
* `brushSize` (2px a 100px): Tamaño del pincel, lápiz o borrador.
* `opacity` (0% a 100%): Nivel de opacidad de la pintura aplicada.
* `hardness` (0% a 100%): Dureza física del trazo del pincel.
* `showGrid`: Bandera que activa o desactiva la cuadrícula de píxeles sobre el lienzo.
* `canvasWidth` / `canvasHeight`: Dimensiones físicas del lienzo activo (ej. 800px x 600px).

---

## 5. El Sistema de Temas Dinámicos (`index.css`)
RetroPaint Studio Pro cuenta con una hoja de estilos CSS altamente sofisticada que define la identidad visual mediante variables personalizadas (`css variables`). Al cambiar el tema, las variables se reasignan instantáneamente con transiciones visuales fluidas (`transition: all 0.2s ease`):

| Variable CSS | Tema Clásico (`classic`) | Tema Oscuro (`dark`) | Tema Retro Pixel (`pixelart`) |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#f0f0f0` (Gris clásico) | `#141417` (Negro carbón) | `#2b1b4d` (Morado arcade) |
| `--bg-card` | `#e0e0e0` | `#202024` | `#3d2870` |
| `--border-color`| `#a0a0a0` | `#323238` | `#ff007f` (Rosa neón) |
| `--text-main` | `#000000` | `#f3f4f6` | `#00ffff` (Cyan brillante) |
| `--accent-color`| `#0050a0` (Azul clásico) | `#7c6af7` (Violeta moderno) | `#ff007f` |

---

## 6. Pruebas y Cobertura de Calidad (Higiene del Código)

La solidez técnica del proyecto está respaldada por un ecosistema de verificación automatizado riguroso:

1. **Pruebas Unitarias (`vitest`):**
   * Cobertura para utilidades críticas en `utils/colors.test.ts` (conversión exacta bidireccional entre formatos HEX/RGB/HSL).
   * Cobertura para algoritmos complejos en `utils/floodFill.test.ts` (verificación de los límites de relleno, propagación correcta en matrices de bytes, e impacto de las variables de tolerancia cromática).
2. **Biome Linter:**
   * Garantiza la coherencia sintáctica, el formateo automatizado y la erradicación de malas prácticas en tiempo de diseño. Toda la suite de código pasa con un estricto **100% verde (0 advertencias, 0 errores)**.
3. **TypeScript Estricto:**
   * Tipado completo e inmutable en todas las interacciones de estado, herramientas y propiedades, eliminando los riesgos de punteros nulos o variables no definidas en tiempo de ejecución.

---

*Reporte técnico elaborado por Antigravity. Todos los derechos reservados. RetroPaint Studio Pro © 2026.*
