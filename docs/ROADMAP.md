# markEDdown Roadmap

## Rediseño editorial · integrado en `main`

El rediseño funcional de markEDdown inspirado en RCK1996 Studio ya está integrado en `main`. La [galería](SCREENSHOTS.md) muestra capturas reales de las vistas principales; la comprobación visual responsive, accesibilidad y persistencia con perfiles de prueba sigue pendiente antes de declarar QA completo.

| Prioridad | Trabajo | Estado |
| :--- | :--- | :--- |
| P0 | Evitar superposición de estadísticas, guardado, inspector y acciones | Implementado; captura real del workspace en [galería](SCREENSHOTS.md) |
| P0 | Menú Exportar propio, sin opciones destructivas y con handlers originales | Implementado; con tests de delegación y teclado |
| P0 | Preservar documentos, historial, assets y preferencias anteriores | Sin cambios de claves; pendiente QA con datos existentes |
| P1 | Tipografía CodeMirror legible y página de lectura sin adornos superpuestos | Implementado; pendiente verificación visual en todos los tamaños |
| P1 | Inspector y menú Exportar disponibles a 320–390px | Ajustes implementados; pendiente prueba táctil |
| P1 | Contrastes claro/oscuro, foco de teclado y scroll correcto | Ajustes implementados; pendiente revisión de accesibilidad |
| P2 | Capturas reales y recorrido visual para el README | Capturas de escritorio integradas en README y [galería](SCREENSHOTS.md); falta QA responsive por tamaños |
| P2 | Ilustraciones editoriales solo en estados vacíos o plantillas | Pendiente: recursos originales y control de legibilidad |
| P2 | Importar y restaurar un workspace completo | Pendiente: diseño de formato, límites de almacenamiento y recuperación |

### Criterios para el merge

1. `npm run test` y `npm run build` en verde, con el commit final.
2. Checklist manual de [verificación responsive](MOBILE-UI-VERIFICATION.md) cubierto en claro y oscuro.
3. Pruebas de creación, edición, búsqueda, descargas, restauración y persistencia, con datos de prueba y datos preexistentes.
4. Confirmar que el diseño no agrega sincronización, navegación engañosa ni botones ficticios.
5. Mantener capturas reales del README y la [galería](SCREENSHOTS.md) sincronizadas con cambios importantes de interfaz.

[Especificación visual](EDITORIAL-IDENTITY.md) · [PR de revisión](https://github.com/rck1996/mded/pull/3)

---


## Siguiente Semana

Objetivo: cerrar estabilidad operativa y dejar la experiencia consistente en desktop y mobile.

### Prioridades

1. Validar el deploy automatico en Cloudflare Pages con `main` y confirmar que build, estilos y assets cargan sin pasos manuales.
2. Terminar el pulido responsive de `Editor`, `Vista previa`, `Insertar`, `Explorador` y `Mas` para que no haya estados ocultos, overlays rotos ni cortes raros.
3. Revisar accesibilidad e interaccion base: foco visible, cierre repetido de paneles, scroll interno, navegacion por teclado y targets tactiles consistentes.
4. Limpiar la superficie del producto: documentacion final, nombres consistentes, CI estable y artefactos locales fuera del repo.

### Entregables de la semana

1. Dejar Cloudflare Pages completamente estable con deploy por push a `main`, sin desalineacion entre HTML fuente y `dist/`.
2. Cerrar la auditoria mobile/tablet con una matriz simple de vistas:
   - `Editor`
   - `Preview`
   - `Split`
   - `Insertar`
   - `Explorador`
   - `Indice`
   - `Mas`
3. Normalizar el comportamiento de paneles:
   - mismo boton abre y cierra
   - no abrir paneles automaticamente al cambiar de vista
   - mantener scroll y posicion de forma predecible
4. Ajustar desktop al colapsar paneles laterales para que `Editor` y `Vista previa` aprovechen todo el ancho disponible.
5. Revisar accesibilidad basica:
   - orden de foco
   - `Escape` consistente
   - contraste aceptable
   - controles usables en touch
6. Hacer una pasada de calidad sobre slash menu e insertar:
   - scroll correcto en mobile
   - preview clara de comandos
   - evitar activaciones accidentales al tocar
7. Consolidar documentacion tecnica:
   - roadmap actualizado
   - arquitectura alineada con el estado real
   - deploy y CI explicados sin pasos viejos
8. Cerrar la semana con una verificacion operativa:
   - `npm run build`
   - smoke check visual
   - deploy final estable en Pages

### Riesgos a vigilar

- Reglas de componentes que contradigan los tokens o `responsive.css`.
- Estados de `data-view`, `data-side-visible` y `data-side-panel` que se contradigan entre desktop y mobile.
- Cambios visuales correctos en local pero mal servidos por Cloudflare si la configuracion del proyecto no queda fija.
## Fase 4

Objetivo: reducir el costo de cambio del producto sin reescritura de framework.

### 4.1 Modularizacion base

Estado: en progreso

- Extraer persistencia y claves de `localStorage` a `src/app/storage.js`.
- Extraer configuracion y runtime principal a `src/app/app-runtime.js`.
- Extraer bindings del DOM a `src/app/dom.js` y templates a `src/app/templates.js`.
- Separar servicios de dominio en modulos dedicados:
  - `src/domain/documents.js`
  - `src/domain/folders.js`
  - `src/domain/assets.js`
  - `src/domain/markdown.js`
  - `src/domain/outline.js`
- Mantener `src/main.js` como entrypoint minimo mientras `app-runtime.js` se sigue descomponiendo.

### 4.2 Hardening local-first

Estado: pendiente

- Export e import de workspace completo.
- Backup JSON/ZIP de documentos, folders, assets y preferencias.
- Validaciones defensivas al restaurar estado corrupto o incompleto.
- Mejor manejo de limites y errores de `localStorage`.

### 4.3 Editor core

Estado: pendiente

- Mejorar slash menu y comandos frecuentes.
- Pulir fold/unfold por headings y outline interactions.
- Afinar sincronizacion editor/preview y accesos rapidos.
- Revisar ergonomia de notas internas y assets inline.

## Fase 5

Objetivo: subir calidad de uso real en desktop y mobile.

### 5.1 Mobile-first interaction pass

- Jerarquia mas clara entre editor, preview y panel lateral.
- Navegacion y acciones mas ligeras en telefonos.
- Estados de vista mas previsibles en mobile.

### 5.2 Public workspace polish

- Landing publica minima en el dominio.
- Mejor presentacion de branding, screenshots y propuesta de valor.
- Pulido visual del modo presentacion/publicacion.

## Fase 6

Objetivo: confianza operativa y extensibilidad.

- Importadores/exportadores mas robustos.
- Tests para servicios de dominio extraidos.
- Auditoria de dead code y consolidacion de estilos.
- Preparacion para futuras features sin crecer otro `app-runtime.js` gigante.

## Criterio de prioridad

Orden recomendado:

1. Modularizacion base.
2. Hardening local-first.
3. Editor core.
4. Mobile-first interaction pass.
5. Landing publica.
