# MarkEDdown Studio 2.2 — Diseño y flujos de escritorio

**Rama:** feat/studio-2-desktop-pocket
**PR:** https://github.com/rck1996/mded/pull/4
**Estado:** desarrollo / revisión. No se ha desplegado a producción.

## Visión

MarkEDdown es un estudio editorial Markdown, no una colección de paneles
independientes. CodeMirror y los documentos locales siguen siendo la fuente
de verdad. El escritorio presenta una navegación única, un área amplia de
escritura, composición visual progresiva, grafo y lectura editorial.
Pocket conserva una experiencia táctil específica.

## Seis espacios web

1. Inicio: documentos recientes, plantillas, carpetas y acceso rápido.
2. Biblioteca: documentos, favoritos, búsqueda, papelera y organización.
3. Escribir: CodeMirror, vista dividida, autoguardado e inserción.
4. Visual: párrafos y títulos editables, tareas y herramientas contextuales.
5. Conexiones: búsqueda, zoom, filtro de enlaces y navegación por grafo.
6. Lectura: documento editorial centrado, metadatos, progreso, presentación
   y exportación.

La barra contextual solo presenta destinos y acciones globales. Se elimina
la navegación duplicada de esa franja sin tocar los controles originales.

## Inspector de estructura

- Muestra encabezados, palabras y tareas del documento activo.
- Reconstruye el índice a partir de Markdown sin incluir líneas de código
  de bloques delimitados.
- Navega a encabezados: desplaza lectura o selecciona posición en CodeMirror.
- Permite revisar el historial desde el propio inspector.
- Cierra mediante Escape y restaura el foco del usuario.

## Lectura y vista dividida

- Cabecera de lectura con archivo, palabras, duración estimada y secciones.
- Controles: Código, Edición visual, Presentación y Exportación.
- Progreso según scroll del documento renderizado.
- Los documentos largos se desplazan dentro del contenedor visible.
- Sincronización proporcional de scroll editor/preview en ambos sentidos,
  con opción de desactivarla y preferencia persistente.
- El modo presentación no muestra la navegación del estudio.

Límite: la sincronización es proporcional; todavía no es semántica por
bloques Markdown ni por líneas concretas.

## Composición visual progresiva

- Editar títulos y párrafos sencillos directamente.
- Seleccionar texto para negrita, cursiva o enlace con URL validada.
- Marcar/desmarcar tareas conservando la sintaxis Markdown.
- Abrir un menú para editar fuente, subir/bajar un bloque o insertar detrás.
- Insertar encabezados, párrafos, tareas, listas, citas, tablas y código.
- Validación de rangos esperados antes de cada transacción CodeMirror.
- Ninguna conversión completa a HTML editable.

Límite: mover un encabezado no arrastra todas sus subsecciones; tablas
complejas, inline anidado y bloques especiales todavía se editan en fuente.

## QA automatizado

El workflow .github/workflows/studio-v2-visual.yml ejecuta:

- npm test y npm run build.
- Suites previas de 23 flujos principales, 16 CRUD, 13 de composición/ZIP,
  5 de grafo y 6 de Share Target.
- scripts/studio-v4-flows.mjs: navegación, lectura, inspector, sincronización,
  presentación, exportación y responsive.
- scripts/studio-v4-blocks.mjs: mover, insertar, conservar sintaxis, Escape.
- scripts/studio-v2-screenshots.mjs: capturas de los espacios web y Pocket.
- scripts/studio-v3-pwa.mjs: compilación offline y persistencia.

Validar la SHA exacta antes de afirmar éxito.

## Pendientes para producción

- QA real en Samsung Android con teclado, gestos y orientación.
- Accesibilidad integral con teclado y lector de pantalla.
- Documentos muy grandes, Markdown anidado, imágenes, tablas y enlaces wiki.
- Edición visual avanzada sin pérdida de sintaxis.
- IndexedDB solo después de una migración con backup y rollback verificados.
- No fusionar a main ni desplegar sin aprobación del propietario.
