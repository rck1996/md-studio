# Studio 2.0 + Pocket — rama de rediseño

**Rama:** feat/studio-2-desktop-pocket
**Estado:** implementación inicial funcional, pendiente de aceptación y QA en dispositivos reales.
**Producción:** intacta; esta rama no actualiza main ni publica en Cloudflare Pages.

## Implementación

- Cabecera editorial compartida con búsqueda global y acciones del runtime original.
- Franja contextual con Editor, Biblioteca, Conexiones y Nuevo documento.
- Inicio a pantalla completa con portada editorial, captura rápida, plantillas y recientes.
- Biblioteca expandida en escritorio, reutilizando carpetas, filtros, favoritos y papelera.
- Grafo a pantalla completa sin duplicar el renderizador de enlaces.
- CodeMirror 6, vista dividida, preview y exportaciones con los handlers existentes.
- Pocket bajo 900px: navegación inferior, inicio, documentos, editor y herramientas.
- Biblioteca, índice, grafo e insertar como pantallas propias en teléfonos.
- Formato móvil delegado a los comandos actuales, con barra junto al teclado.
- Acceso a historial, plantillas, exportación, preferencias y foco desde Pocket.
- Compatibilidad con los temas claro/oscuro existentes.
- Screenshots automatizados en Chromium y prueba de persistencia local.

## Integración segura

La interfaz invoca los controles preexistentes de creación, navegación lateral,
vista, formato, búsqueda, historial, exportación y ajustes. No añade otro almacén
documental ni modifica claves de localStorage; conserva snapshots e imágenes.

## Lo que todavía no implementa

- El editor Pocket sigue usando CodeMirror Markdown. No hay WYSIWYG de ida y vuelta.
  Eso requiere un motor con garantías de fidelidad para tablas, enlaces wiki,
  tokens de imágenes, HTML y bloques de código.
- No se añadieron IndexedDB, backup integral, sincronización ni PWA instalada.
- La inserción Mermaid sigue sin renderización gráfica propia.
- El grafo mantiene las limitaciones del módulo existente.

## QA automatizado

Workflow: .github/workflows/studio-v2-visual.yml

1. Instala dependencias, ejecuta npm test y npm run build.
2. Abre Chromium de escritorio 1440x900 y captura Editor, Inicio, Biblioteca,
   Grafo y Editor oscuro.
3. Abre Chromium móvil 390x844 táctil y captura Inicio, Biblioteca, Editor,
   edición real, Preview, Herramientas e Índice.
4. Escribe un documento en CodeMirror, verifica que la vista previa lo muestra
   y que persiste al recargar.
5. Adjunta las capturas como artifact de Actions.

Para reproducir:

    npm ci
    npm test
    npm run build
    npm install --no-save playwright
    npx playwright install chromium
    npm run dev

En otra terminal:

    node scripts/studio-v2-screenshots.mjs

Las capturas quedan en artifacts/studio-v2/.

## QA pendiente antes de fusionar

- Android y tablet reales: teclado Gboard/Samsung, gestos y rotación.
- Resoluciones 320, 360, 390, 768, 1024, 1366 y 1440 px, ambos temas.
- Menús, Escape, foco, scroll y accesibilidad.
- Imágenes, documentos extensos, historial y datos locales preexistentes.
- Estrategia de backup e IndexedDB antes de cualquier migración.
- Validez de la edición visual directa.
- Revisión y aprobación explícita antes de publicar producción.

No fusionar automáticamente.
