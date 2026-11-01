# Auditoría de flujos — MarkEDdown Studio 2.0 + Pocket

Fecha: 2026-11-01
Rama: feat/studio-2-desktop-pocket
PR: https://github.com/rck1996/mded/pull/4
Estado: borrador, sin merge ni despliegue a producción.

## Alcance

Revisión de navegación, edición, persistencia, creación de documentos, plantillas, índice, grafo, historial, favoritos, archivo, papelera, exportaciones y estados móviles. Pruebas con Chromium real desde Vite: escritorio 1440x900, Pocket táctil 390x844, ancho mínimo 320px, impresión simulada. Los datos de pruebas se aíslan en contextos nuevos; no se usan documentos del usuario.

Las suites reproducibles están en scripts/studio-v2-flows.mjs (23 pruebas), scripts/studio-v2-crud-audit.mjs (15 pruebas) y scripts/studio-v2-screenshots.mjs (capturas de navegador). El workflow .github/workflows/studio-v2-visual.yml las ejecuta después de los tests unitarios y la compilación.

## Fallos detectados y correcciones

| ID | Severidad | Hallazgo | Corrección |
| --- | --- | --- | --- |
| F-01 | Alta | Abrir un documento desde Inicio, Grafo, duplicación, archivados o búsqueda podía dejar al usuario en otra pantalla | Evento único markeddown:document-opened en document-workflow y ruta centralizada a Editor |
| F-02 | Media | Pocket no volvía al Editor después de insertar un bloque | Inserción con comandos originales y retorno a Editor |
| F-03 | Alta | Exportar desde Pocket activaba un menú de escritorio oculto | Nueva hoja móvil real para .md, HTML, impresión, ZIP y copia |
| F-04 | Media | Búsqueda global y acciones de la paleta no estaban integradas de forma coherente | Entrada de búsqueda Pocket, vistas, filtros y crear carpeta sincronizados |
| F-05 | Media | Foco desde Inicio podía ocultar navegación sin mostrar Editor | Se selecciona Editor antes de activar Foco |
| F-06 | Crítica | localStorage podía fallar mientras el indicador decía Guardado | storageSet devuelve éxito/fallo, saveDocument muestra Sin guardar y ofrece descarga Markdown de emergencia |
| F-07 | Media | Impresión móvil dependía de la vista activa | Reglas @media print que fuerzan el documento renderizado |
| F-08 | Media | Accesibilidad limitada del menú de herramientas | Escape, retorno de foco, Tab, Volver y aria-expanded |

## Matriz de verificación

- Escritorio: inicio a reciente, biblioteca a documento, grafo a documento, creación de proyecto, temas claro y oscuro.
- Pocket: inicio, biblioteca, lectura y edición, formato real, inserción de bloques, búsqueda, historial, preferencias, Foco, impresión.
- Paleta: abrir documento, cambiar de vista, activar filtros y crear carpeta.
- Biblioteca: duplicar, renombrar, añadir/quitar favoritos, mover documento, archivar, abrir archivado, restaurar archivado, eliminar y restaurar papelera.
- Historial: modificar Markdown y restaurar un snapshot anterior, verificando la eliminación de cambios posteriores.
- Exportaciones: descargas .md, .html y .zip.
- Datos: guardado tras recarga y recuperación por exportación cuando se simula QuotaExceededError.
- Responsive: verificación de 320px sin scroll horizontal y visualizaciones a 390px y 1440px.

## Pendientes de producto y riesgos no resueltos en esta ronda

1. Backup integral de todo el espacio, antes de IndexedDB.
2. Migración transaccional a IndexedDB y recuperación de respaldo.
3. PWA offline e instalación verificadas en Android.
4. Editor visual WYSIWYG de ida y vuelta sin alterar Markdown, tokens o tablas.
5. Grafo actual limitado a 24 documentos.
6. Render de Mermaid y otras construcciones HTML avanzadas pendiente.
7. QA manual con teclado Samsung/Gboard, selección de texto, rotación y teclado virtual.
8. Auditoría completa de accesibilidad, performance con cientos de notas y archivos extensos.

## Criterios de aceptación

- 23 verificaciones principales + 15 verificaciones CRUD exitosas.
- npm test y npm run build sin errores.
- Capturas reales revisadas antes de desplegar.
- No tocar main ni publicar producción sin aprobación.
- Completar QA en S25+ antes de fusionar el PR.

## Reproducción local

Instalar dependencias: npm ci
Tests: npm test
Compilación: npm run build
Playwright: npm install --no-save playwright
Navegador: npx playwright install chromium
Servidor: npm run dev -- --host 127.0.0.1

Con el servidor ejecutándose, correr:
node scripts/studio-v2-flows.mjs
node scripts/studio-v2-crud-audit.mjs
node scripts/studio-v2-screenshots.mjs

Los screenshots se generan en artifacts/studio-v2 y se adjuntan al workflow como markeddown-studio-2-screenshots. La copia de Google Drive está en mded/resources.
