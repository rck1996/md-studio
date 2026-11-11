# Arquitectura

## Objetivo

MD.studio es una SPA para escribir, organizar y exportar Markdown con almacenamiento en el navegador.
El objetivo de la arquitectura es mantener tres cosas bajo control:

- flujo de edicion rapido;
- preview seguro y consistente;
- modularizacion incremental sin reescribir la app.

## Resumen

La aplicacion corre completamente en el navegador.
Vite solo resuelve el build y el entorno de desarrollo.
La persistencia se apoya en `localStorage`.
No existe API remota ni servidor de aplicacion.

La estructura actual se divide en capas claras:

- `index.html`: shell semantico del workspace.
- `src/main.js`: entrypoint minimo.
- `src/app/`: runtime, wiring, coordinacion y adaptadores del tema editorial.
- `src/app/command-palette.js`: busqueda local de documentos y ejecucion de comandos existentes.
- `src/domain/`: reglas de negocio y transformaciones del documento.
- `src/domain/starter-workspace.js`: documentos y metadatos del espacio de muestra.
- `src/editor/`: integracion con CodeMirror.
- `src/ui/`: render de paneles y piezas visuales complejas.
- `src/styles/`: sistema CSS por capas.

## Capas del sistema

### Shell

`index.html` define regiones estables para:

- cabecera con Documentos, Nuevo, Más y exportación en escritorio;
- título, estado de guardado y controles de Editar, Vista previa y Dividido;
- editor Markdown, lector y paneles de biblioteca, formato e índice;
- diálogos de búsqueda, plantillas, historial y preferencias.

La logica no deberia vivir aqui.

### App runtime

`src/app/app-runtime.js` sigue siendo el orquestador principal.
Coordina:

- documento activo;
- preferencias;
- sincronizacion editor/preview;
- assets;
- historial;
- overlays;
- estados visuales del workspace.

`studio-v2.js` coordina las rutas y controles de escritura en PC y móvil. `studio-flow.js` conecta la búsqueda y exportación de escritorio con el runtime. Los dos adaptadores comparten el mismo documento activo. `workspace-backup.js` genera y restaura el ZIP del espacio local y `nexus-handoff.js` prepara el Markdown para compartir o descargar.

### Domain

`src/domain/` encapsula logica reusable y menos dependiente del DOM:

- `documents.js`: documentos, snapshots e historial.
- `folders.js`: carpetas, orden, filtro y colapso.
- `markdown.js`: expansion de tokens, sanitizacion y export HTML.
- `starter-workspace.js`: contenido inicial; la portada editorial se activa por documento con `cover: "editorial"`.
- `assets.js`: assets embebidos y referencias.
- `outline.js`: headings, fold range y movimiento de secciones.

Esta capa es la frontera correcta para seguir reduciendo complejidad del runtime.

### Editor

`src/editor/codemirror.js` concentra la configuracion de CodeMirror:

- extensiones;
- keymaps;
- folding;
- widgets;
- integracion con slash menu y estado del documento.

La idea es que el resto de la app trate al editor como una dependencia bien definida, no como una serie de detalles repartidos.

### UI

`src/ui/` contiene renderizadores de paneles y componentes dinamicos:

- `explorer-panel.js`
- `outline-panel.js`
- `assets-panel.js`
- `history-panel.js`
- `notes-panel.js`
- `slash-menu.js`

Esto evita seguir mezclando markup imperativo grande dentro del runtime.

### Persistencia

`src/app/storage.js` concentra claves y helpers de `localStorage`.
La regla es simple: el resto del sistema no deberia acceder a `localStorage` directamente cuando ya existe un helper.

## CSS

El sistema de estilos ahora entra por `src/styles/index.css` y usa capas ordenadas.

Orden actual:

- `tokens.css`: colores, tipografia, radios, sombras y medidas compartidas.
- `base.css`: reset y controles reutilizables.
- `app-shell.css`: workspace, topbar, layout y estados de vista.
- `panels.css`: navegacion, explorador, insertar, indice e inspector.
- `editor-preview.css`: CodeMirror, preview y modos de lectura.
- `overlays.css`: menus, overlays y dialogs.
- `responsive.css`: tablet, mobile y reduced motion.
- `studio-theme.css`: identidad editorial de RCK1996, colores nocturno/marfil y tipografia.
- `studio-refinement.css`: cabecera sin colisiones, menus, legibilidad, papel y breakpoints.

El orden de los `@import` es deliberado: la capa editorial se agrega al final sin sustituir las reglas funcionales de la aplicacion. El estilo anterior se conserva en las hojas base para no introducir regresiones de comportamiento en paneles y estados. Evitar nuevos overrides dispersos: consolidar mejoras donde corresponda.

[Especificacion del sistema editorial](EDITORIAL-IDENTITY.md).

## Flujo principal

1. `main.js` carga estilos y arranca el runtime.
2. El runtime lee documentos, carpetas y preferencias desde `storage.js` y `domain/`.
3. `editor/codemirror.js` monta el editor.
4. `preview-renderer.js` transforma Markdown a HTML seguro y actualiza preview, outline, notas, assets y validacion.
5. `bindings.js` conecta shortcuts, overlays y acciones globales.
6. `ui/` renderiza paneles especializados.
7. `studio-flow.js` delega los accesos de cabecera a los handlers existentes; observa el estado real de guardado y el tema sin acceder al almacenamiento.

En escritorio el estado de lectura y guardado se muestra en la barra inferior; en movil ocupa una fila independiente de la cabecera para no colisionar con las acciones.

### Portada y papel del preview

`app-runtime.js` consulta `cover` en el documento activo. Solo los documentos con el valor `editorial` reciben una copia de la ilustracion en la vista previa; no se infiere por el nombre ni se hereda desde la carpeta. En el workspace inicial, esa marca solo esta en `01_Sol.md`.

El papel se mantiene legible en tema claro y oscuro, con base `#F1E4CF` y textura SVG repetible (`public/assets/paper-grain.svg`). La ilustracion `public/assets/editorial-cover.png` usa mezcla `darken` sobre ese papel para integrar el fondo crema con la superficie y reducir el borde de imagen pegada. La cabecera editorial y el contenido de lectura usan el mismo tono y textura.

## Verificacion automatizada

La rama editorial agrega `tests/studio-flow.test.cjs`, ejecutado con `npm run test` usando el runner nativo de Node.js. Comprueba delegacion de acciones, menu Exportar, cierre con Escape/clic exterior, reflejo del estado y estructura HTML. El CI ejecuta primero los tests y despues `npm run build`.

**Limite:** son pruebas de comportamiento aislado y compilacion, no tests E2E ni capturas reales. La regresion visual y los flujos de datos antiguos requieren la [matriz manual](MOBILE-UI-VERIFICATION.md).

## Estado actual

La arquitectura ya no esta en el punto inicial de `bootstrap.js` monolitico.
Hoy existe separacion real entre runtime, dominio, editor, UI y estilos.

Lo que aun queda por seguir reduciendo:

- extraer mas casos de uso desde `app-runtime.js`;
- separar render y eventos del explorador cuando aparezca una nueva responsabilidad real;
- mantener la regla de una sola fuente por responsabilidad.

## Direccion recomendada

La mejor evolucion para este proyecto sigue siendo modular vanilla JavaScript.
No hace falta cambiar de framework para resolver el mantenimiento.
El trabajo correcto es seguir sacando responsabilidad del runtime y del CSS base hacia modulos pequenos, probables y faciles de ubicar.
