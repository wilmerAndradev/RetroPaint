# SRS — WebPaint Studio
## Especificación de Requisitos de Software
**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Estado:** Borrador inicial  

---

## 1. Introducción

### 1.1 Propósito
Este documento define los requisitos funcionales, no funcionales y de arquitectura para **WebPaint Studio**, una aplicación web de dibujo y edición de imágenes tipo Paint, construida con las tecnologías frontend y backend más modernas disponibles en 2026.

### 1.2 Alcance
WebPaint Studio es una aplicación SPA (Single Page Application) que permite a los usuarios crear, editar y exportar ilustraciones digitales directamente desde el navegador, sin instalación, con soporte offline y colaboración en tiempo real opcional.

### 1.3 Definiciones y Acrónimos
| Término | Definición |
|---|---|
| SPA | Single Page Application |
| PWA | Progressive Web App |
| Canvas API | API nativa del navegador para renderizado 2D |
| WebGPU | API de bajo nivel para renderizado acelerado por GPU en el navegador |
| CRDT | Conflict-free Replicated Data Type (para colaboración) |
| WASM | WebAssembly |
| HMR | Hot Module Replacement |

### 1.4 Referencias
- W3C Canvas API Specification
- WebGPU W3C Working Draft 2025
- Figma Engineering Blog (arquitectura de referencia)
- Excalidraw Open Source (inspiración colaborativa)

---

## 2. Descripción General del Sistema

### 2.1 Perspectiva del Producto
WebPaint Studio es un producto independiente basado en web. Se diferencia de alternativas como MS Paint o aplicaciones nativas por su accesibilidad universal (cualquier dispositivo con navegador moderno), soporte de colaboración en tiempo real y arquitectura PWA con soporte offline.

### 2.2 Funciones Principales
- Lienzo de dibujo con herramientas vectoriales y rasterizadas
- Capas con modos de fusión (blending modes)
- Colaboración en tiempo real multiusuario
- Exportación a múltiples formatos (PNG, SVG, WEBP, PDF)
- Historial de deshacer/rehacer ilimitado (con estructura de árbol)
- Soporte de entrada: ratón, trackpad, stylus y táctil (multi-touch)
- Modo offline completo (PWA + IndexedDB)

### 2.3 Usuarios Objetivo
| Rol | Descripción |
|---|---|
| Usuario casual | Bocetos rápidos, anotaciones, memes |
| Diseñador / Ilustrador | Trabajo de producción, capas, exportación profesional |
| Educador | Pizarra digital en clase (colaboración) |
| Desarrollador (API) | Integración del lienzo en otras aplicaciones vía SDK |

### 2.4 Restricciones Generales
- El sistema debe funcionar en Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
- Rendimiento mínimo: 60 FPS en lienzos de hasta 4096×4096 px
- Tiempo de carga inicial ≤ 2s en conexión de 4G
- Accesible según WCAG 2.2 nivel AA

---

## 3. Stack Tecnológico

### 3.1 Frontend

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework UI | **React 19** (con Server Components donde aplique) | Ecosistema maduro, Concurrent Mode, compilador RC |
| Lenguaje | **TypeScript 5.5+** | Tipado estricto, escalabilidad |
| Build tool | **Vite 6** | HMR instantáneo, ESBuild + Rollup, soporte nativo WASM |
| Renderizado | **Canvas API 2D** + **WebGPU** (efectos avanzados) | Rendimiento nativo en GPU para filtros y efectos |
| Estado global | **Zustand 5** + **Immer** | Estado inmutable, sin boilerplate, DevTools |
| Historial (Undo/Redo) | **CRDT con Yjs** | Historial como árbol, base para colaboración |
| Animaciones UI | **Motion (Framer Motion 12)** | Animaciones declarativas fluidas |
| Estilos | **Tailwind CSS v4** + CSS custom properties | Utility-first, diseño tokenizado |
| Colaboración RT | **PartyKit / Liveblocks** sobre WebSockets | Presencia, cursores compartidos, sincronización |
| Procesamiento imagen | **WASM (Sharp o libvips compilado)** | Filtros y compresión de alta performance en cliente |
| Testing | **Vitest + Playwright** | Unit + E2E, integrado con Vite |
| Linting/Format | **Biome** | Reemplaza ESLint + Prettier, 10–100× más rápido |

### 3.2 Backend (opcional / colaborativo)

| Capa | Tecnología |
|---|---|
| Runtime | **Bun 2** o Node.js 22 LTS |
| Framework API | **Hono** (ultraligero, edge-ready) |
| Base de datos | **Turso (libSQL / SQLite distribuido)** para metadatos |
| Almacenamiento de archivos | **Cloudflare R2** o **S3-compatible** |
| Tiempo real | **PartyKit** (WebSockets en edge) |
| Auth | **Auth.js v5** (NextAuth) o **Clerk** |
| Deploy | **Cloudflare Workers** / **Vercel Edge** |

### 3.3 Infraestructura y DevOps

| Área | Herramienta |
|---|---|
| Monorepo | **Turborepo** |
| CI/CD | **GitHub Actions** |
| Containerización | **Docker** (entorno dev) |
| Monitoring | **Sentry** (errores) + **PostHog** (analytics) |
| Feature Flags | **Unleash** o **PostHog Flags** |

---

## 4. Requisitos Funcionales

### RF-01: Lienzo Principal
- **RF-01.1** El usuario puede crear un lienzo con dimensiones personalizadas (mínimo 100×100 px, máximo 8192×8192 px).
- **RF-01.2** El lienzo soporta zoom de 10% a 3200%, con desplazamiento mediante scroll y arrastre.
- **RF-01.3** El lienzo muestra una cuadrícula opcional configurable (tamaño de celda, color, opacidad).
- **RF-01.4** El sistema renderiza el lienzo a 60 FPS mínimo bajo condiciones normales.
- **RF-01.5** El lienzo soporta modo oscuro y claro automáticamente según preferencia del sistema.

### RF-02: Herramientas de Dibujo
| ID | Herramienta | Descripción |
|---|---|---|
| RF-02.1 | Lápiz / Pincel | Trazo libre con presión simulada (stylus real o simulada por velocidad) |
| RF-02.2 | Borrador | Elimina píxeles o restaura transparencia en capas |
| RF-02.3 | Línea | Trazo recto con snap a ángulos (15°, 45°, 90°) con Shift |
| RF-02.4 | Figuras | Rectángulo, elipse, triángulo, polígono, estrella; relleno y borde independientes |
| RF-02.5 | Texto | Inserción de texto con fuentes web (Google Fonts integrado), tamaño, color, alineación |
| RF-02.6 | Relleno (Balde) | Flood fill con tolerancia de color configurable (0–100%) |
| RF-02.7 | Cuentagotas | Selecciona color de cualquier punto del lienzo |
| RF-02.8 | Selección | Selección rectangular, elíptica, lazo libre, varita mágica |
| RF-02.9 | Mover / Transformar | Mover, escalar, rotar y sesgar selecciones o capas |
| RF-02.10 | Degradado | Lineal, radial, cónico; editor de paradas de color |
| RF-02.11 | Aerógrafo | Pincel difuso con densidad y flujo configurables |
| RF-02.12 | Clonación | Clona una zona del lienzo a otra (estilo Photoshop Clone Stamp) |

### RF-03: Sistema de Capas
- **RF-03.1** El usuario puede crear, eliminar, duplicar, reordenar y renombrar capas.
- **RF-03.2** Cada capa tiene: opacidad (0–100%), modo de fusión (Normal, Multiplicar, Pantalla, Superposición, etc. — mínimo 15 modos).
- **RF-03.3** Las capas pueden ser agrupadas en carpetas.
- **RF-03.4** Existe un panel de capas lateral con previsualización en miniatura en tiempo real.
- **RF-03.5** Las capas soportan máscara de capa (no destructiva).

### RF-04: Color y Paleta
- **RF-04.1** Selector de color con modos HSL, RGB, HEX y OKLCH.
- **RF-04.2** El usuario puede guardar colores en una paleta personalizada (máx. 64 colores por proyecto).
- **RF-04.3** Soporte de color con transparencia (canal alpha).
- **RF-04.4** Paletas predefinidas: Material Design, Tailwind CSS, Pastel, Monocromático.

### RF-05: Historial
- **RF-05.1** El sistema mantiene un historial de acciones ilimitado durante la sesión activa.
- **RF-05.2** Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`) con representación visual del árbol de historial.
- **RF-05.3** El historial persiste en IndexedDB durante la sesión del navegador.
- **RF-05.4** El usuario puede navegar al historial de cualquier punto previo (no lineal).

### RF-06: Exportación e Importación
- **RF-06.1** Exportar como: PNG (con/sin transparencia), JPEG, WEBP, SVG (capas vectoriales), PDF, GIF animado.
- **RF-06.2** Importar imágenes: PNG, JPEG, WEBP, SVG, GIF; se insertan como nueva capa.
- **RF-06.3** Formato de proyecto propio `.wpaint` (JSON + recursos en ZIP) para guardar y reabrir proyectos con capas.
- **RF-06.4** Exportación con opciones de resolución (1×, 2×, 4× del tamaño original).

### RF-07: Colaboración en Tiempo Real *(módulo avanzado)*
- **RF-07.1** El usuario puede compartir un enlace de sesión colaborativa.
- **RF-07.2** Los cursores de otros colaboradores se muestran en tiempo real con nombre y color distintivo.
- **RF-07.3** Los cambios se sincronizan mediante CRDT (Yjs) garantizando consistencia eventual.
- **RF-07.4** Soporte de hasta 20 colaboradores simultáneos por sesión.
- **RF-07.5** Chat de texto básico dentro de la sesión colaborativa.

### RF-08: Accesibilidad y PWA
- **RF-08.1** La aplicación es instalable como PWA en escritorio y móvil.
- **RF-08.2** Funciona completamente offline (Service Worker + Cache API) para proyectos locales.
- **RF-08.3** Todos los controles de la barra de herramientas son accesibles por teclado y tienen `aria-label`.
- **RF-08.4** Soporte completo de atajos de teclado personalizables.

---

## 5. Requisitos No Funcionales

### RNF-01: Rendimiento
| Métrica | Objetivo |
|---|---|
| Tiempo de carga inicial (LCP) | ≤ 1.8s en 4G |
| Tiempo interactivo (TTI) | ≤ 2.5s |
| FPS en dibujo | ≥ 60 FPS constante |
| Tamaño bundle inicial | ≤ 200 KB gzip |
| FPS con 10 capas y filtros | ≥ 30 FPS |

### RNF-02: Seguridad
- Autenticación con OAuth 2.0 (Google, GitHub) y email/password.
- Sesiones colaborativas protegidas por token único.
- Sanitización de SVG importado para prevenir XSS.
- HTTPS obligatorio, headers de seguridad (CSP, HSTS).

### RNF-03: Escalabilidad
- La arquitectura serverless/edge permite escalar horizontalmente sin configuración manual.
- Los archivos de proyecto no superan los 50 MB por limitación de almacenamiento gratuito.

### RNF-04: Mantenibilidad
- Cobertura de tests ≥ 80% en lógica de negocio (herramientas, capas, exportación).
- Documentación de componentes con **Storybook 8**.
- Código documentado en inglés, commits en Conventional Commits.

---

## 6. Arquitectura del Sistema

### 6.1 Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────┐
│                  CLIENTE (Navegador)                │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐   │
│  │  React UI    │   │   Canvas Renderer Engine  │   │
│  │  (Zustand)   │◄──►│  (Canvas 2D + WebGPU)    │   │
│  └──────────────┘   └──────────────────────────┘   │
│         │                      │                    │
│  ┌──────▼──────────────────────▼──────────────┐    │
│  │         WASM Image Processor (Sharp)        │    │
│  └─────────────────────────────────────────────┘    │
│         │                                           │
│  ┌──────▼──────────────────────────────────┐       │
│  │    Yjs CRDT Store + IndexedDB (offline) │       │
│  └──────────────────┬────────────────────┘        │
└─────────────────────┼──────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────┐
│              BACKEND EDGE (Cloudflare Workers)      │
│                                                     │
│   ┌──────────────┐   ┌──────────────────────┐      │
│   │  Hono API    │   │   PartyKit (WS/CRDT)  │      │
│   │  (REST/JSON) │   │   Colaboración RT     │      │
│   └──────┬───────┘   └──────────────────────┘      │
│          │                                          │
│   ┌──────▼───────┐   ┌──────────────────────┐      │
│   │  Turso DB    │   │   Cloudflare R2       │      │
│   │  (Metadatos) │   │   (Archivos .wpaint)  │      │
│   └──────────────┘   └──────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 6.2 Estructura del Repositorio (Monorepo)

```
webpaint-studio/
├── apps/
│   ├── web/                  # App principal React + Vite
│   └── docs/                 # Storybook + documentación
├── packages/
│   ├── canvas-engine/        # Lógica de renderizado (agnóstico de framework)
│   ├── crdt-sync/            # Módulo Yjs + adaptadores
│   ├── image-processor/      # WASM + Sharp bindings
│   ├── ui/                   # Componentes compartidos (Design System)
│   └── types/                # TypeScript types compartidos
├── services/
│   └── collab-server/        # PartyKit + Hono backend
├── turbo.json
└── package.json
```

---

## 7. Modelo de Datos

### 7.1 Proyecto (.wpaint)
```typescript
interface WPaintProject {
  id: string;               // UUID v4
  name: string;
  version: string;          // Semver del formato
  createdAt: string;        // ISO 8601
  updatedAt: string;
  canvas: {
    width: number;
    height: number;
    dpi: number;            // 72 | 150 | 300
    background: string;     // Color CSS o "transparent"
  };
  layers: Layer[];
  palette: Color[];
  history: HistoryEntry[];  // Solo en memoria/sesión
}

interface Layer {
  id: string;
  name: string;
  type: "raster" | "vector" | "text" | "group";
  visible: boolean;
  locked: boolean;
  opacity: number;          // 0–1
  blendMode: BlendMode;
  data: string;             // Base64 PNG (raster) | SVG string (vector)
  mask?: string;            // Base64 PNG máscara
  children?: Layer[];       // Solo para type="group"
}
```

---

## 8. Criterios de Aceptación por Módulo

| Módulo | Criterio |
|---|---|
| Lienzo | Dibujo fluido a 60 FPS en lienzo 2048×2048 con 5 capas activas |
| Herramientas | Todas las herramientas del RF-02 operativas sin errores en Chrome/Firefox/Safari |
| Capas | Crear 50 capas, reordenarlas y fusionarlas sin degradación de rendimiento |
| Exportación | PNG exportado pixel-perfect comparado con el lienzo visible |
| Colaboración | 5 usuarios simultáneos dibujan sin conflictos visibles en < 200ms RTT |
| PWA/Offline | App instalada funciona completamente sin conexión con proyectos locales |
| Accesibilidad | Auditoria Axe DevTools con 0 errores críticos |

---

## 9. Roadmap de Desarrollo

### Fase 1 — MVP (8 semanas)
- [ ] Setup monorepo (Turborepo + Vite + React 19 + TypeScript)
- [ ] Canvas engine básico (lápiz, borrador, figuras, texto)
- [ ] Sistema de capas (crear, eliminar, opacidad, reordenar)
- [ ] Selector de color (HSL, HEX, alpha)
- [ ] Historial undo/redo básico
- [ ] Exportación PNG y JPEG
- [ ] UI completa con Tailwind v4

### Fase 2 — Producción (6 semanas)
- [ ] Importación de imágenes como capa
- [ ] Formato .wpaint (guardar/cargar proyectos)
- [ ] PWA + soporte offline (IndexedDB)
- [ ] Modo oscuro/claro
- [ ] Atajos de teclado completos
- [ ] Tests Vitest + Playwright (≥80% cobertura)
- [ ] Exportación WEBP, SVG, PDF

### Fase 3 — Avanzado (8 semanas)
- [ ] Colaboración en tiempo real (Yjs + PartyKit)
- [ ] Procesamiento WASM (filtros: blur, contraste, saturación)
- [ ] WebGPU para efectos de capas (blur, sombras)
- [ ] Storybook con Design System completo
- [ ] API pública / SDK embebible

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| WebGPU no disponible en todos los navegadores | Media | Medio | Fallback automático a Canvas 2D para efectos |
| Rendimiento en dispositivos de gama baja | Alta | Alto | Reducir resolución de lienzo en tiempo real, deshabilitar filtros costosos |
| Conflictos CRDT en colaboración intensa | Baja | Alto | Tests de stress con 20+ usuarios, revisión del modelo Yjs |
| Formato .wpaint incompatible entre versiones | Media | Medio | Versionado semántico del formato + migrador automático |
| Tamaño del bundle supera 200KB | Media | Medio | Code splitting agresivo, lazy loading por herramienta/módulo |

---

## 11. Glosario

| Término | Definición |
|---|---|
| WebGPU | API web para acceso de bajo nivel a la GPU, sucesor de WebGL |
| CRDT | Estructura de datos que permite fusión automática de ediciones concurrentes sin conflictos |
| WASM | WebAssembly: formato binario que permite ejecutar código C/C++/Rust en el navegador a velocidad nativa |
| Flood Fill | Algoritmo de relleno por conexión (el "balde" de Paint) |
| Blend Mode | Modo matemático de fusión de dos capas de píxeles |
| PWA | Aplicación web progresiva instalable con capacidades offline |
| OKLCH | Espacio de color perceptualmente uniforme, soporte nativo en CSS 4 |

---

*Documento generado para WebPaint Studio v1.0 — Todos los derechos reservados.*
