# Estructura Del Proyecto

## Vista rapida

```text
mded/
  index.html
  package.json
  package-lock.json
  vite.config.js
  wrangler.toml
  README.md
  docs/
    screenshots/
  public/
  src/
  tests/
```

## Raiz

### `index.html`

Shell base de la aplicacion.
Define las regiones del workspace y los overlays.

### `package.json`

Dependencias y scripts principales.

### `vite.config.js`

Configuracion del bundler y servidor local.

### `wrangler.toml`

Configuracion de despliegue para Cloudflare Pages.

### `docs/`

Documentacion del proyecto.

- `ARCHITECTURE.md`: limites tecnicos y capas.
- `EDITORIAL-IDENTITY.md`: identidad visual, tokens y controles de revision.
- `PROJECT-STRUCTURE.md`: esta guia.
- `ROADMAP.md`: fases siguientes.
- `SCREENSHOTS.md`: galería de capturas reales de la interfaz.
- `screenshots/`: imágenes usadas por la galería y el README.
- `MOBILE-UI-VERIFICATION.md`: matriz de pruebas visuales y funcionales.
- `markeddown-banner.svg`: portada del README.

### `public/`

Assets estaticos servidos tal cual.

- `assets/logo/`: icono, favicon y variantes SVG.
- `assets/editorial-cover.png`: ilustracion usada por documentos con portada editorial.
- `assets/paper-grain.svg`: textura repetible de fibras y grano para el papel del preview.

## `src/`

```text
src/
  main.js
  app/
  domain/
  editor/
  styles/
  ui/
```

### `src/main.js`

Entry point minimo.
Conecta estilos, runtime y adaptador de controles editoriales.

### `src/app/`

Orquestacion y wiring de la app.

- `app-runtime.js`: coordinacion principal.
- `command-palette.js`: busqueda de documentos y activacion de comandos existentes.
- `bindings.js`: eventos globales y shortcuts.
- `config.js`: constantes compartidas.
- `document-workflow.js`: casos de uso de documentos y carpetas.
- `dom.js`: referencias centralizadas al DOM.
- `editor-commands.js`: comandos editoriales y notas.
- `file-actions.js`: copiar, descargar y exportar.
- `preview-renderer.js`: render de preview, outline, notas, assets y validacion.
- `storage.js`: claves y helpers de persistencia.
- `templates.js`: plantillas base.
- `studio-flow.js`: acciones de cabecera, popover Exportar y estado real; sin lógica documental nueva.

### `src/domain/`

Reglas de negocio y transformaciones puras o semi-puras.

- `documents.js`
- `folders.js`
- `markdown.js`
- `starter-workspace.js`: documentos de muestra y metadatos como `cover: "editorial"`.
- `assets.js`
- `outline.js`

### `src/editor/`

Integracion dedicada con CodeMirror.

- `codemirror.js`

### `src/ui/`

Renderizadores de paneles y piezas complejas de interfaz.

- `assets-panel.js`
- `explorer-panel.js`
- `history-panel.js`
- `notes-panel.js`
- `outline-panel.js`
- `slash-menu.js`

### `src/styles/`

Sistema CSS por capas.

- `index.css`: entrypoint unico.
- `tokens.css`: tokens y variables compartidas.
- `base.css`: reset y controles compartidos.
- `app-shell.css`: layout principal y estados de vista.
- `panels.css`: navegacion y paneles laterales.
- `editor-preview.css`: editor, preview y modos de lectura.
- `overlays.css`: overlays y dialogs.
- `responsive.css`: tablet, mobile y reduced motion.
- `studio-theme.css`: identidad editorial RCK1996, tipografía y paleta.
- `studio-refinement.css`: correcciones de cabecera, tamaño de texto, popover y breakpoints.

## `tests/`

- `studio-flow.test.cjs`: pruebas con el runner de Node.js para delegación de acciones, exportación, foco, estado e IDs. Se ejecutan con `npm run test` y antes del build en CI. **No sustituyen QA visual de navegador**.

## Como leer el proyecto

1. La raiz contiene configuracion y entrada.
2. `src/app/` coordina la aplicacion.
3. `src/domain/` define reglas reutilizables.
4. `src/editor/` encapsula CodeMirror.
5. `src/ui/` renderiza paneles.
6. `src/styles/` organiza la cascada visual.

## Estado actual

La estructura ya no esta concentrada en un unico bootstrap.
`app-runtime.js` sigue siendo el orquestador mas amplio, pero dominio, editor, persistencia, paneles y estilos ya tienen limites reconocibles.

La regla para seguir avanzando es simple: cuando aparezca una nueva pieza importante, debe entrar en la carpeta que ya representa su responsabilidad, no volver al runtime o al CSS base por defecto.
