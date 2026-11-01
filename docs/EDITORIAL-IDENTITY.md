# markEDdown · Sistema editorial de interfaz

> **Estado:** implementado en la rama de revisión [design/editorial-markeddown-studio](https://github.com/rck1996/mded/pull/3); no implica que esté publicada en el dominio.  
> **Referencia:** [Style Guide de RCK1996 Studio](https://github.com/rck1996/profile-portfolio/blob/main/style-guide.html).

## 01 / Idea central

**Un editor antes que una ilustración.** markEDdown lleva la estética de un atlas editorial —pluma grabada, cuadrículas técnicas, tipografía con carácter y contraste de tinta— a una herramienta real para escribir y organizar documentos.

El arte se concentra en el logotipo, detalles de navegación y materiales de presentación. CodeMirror queda limpio: no colocar imágenes bajo el texto ni animaciones de scroll que distraigan.

Principios: **lectura primero**, acciones verdaderas, controles accesibles, una familia visual con RCK1996 y separación entre preferencias y documentos existentes.

## 02 / Identidad

**Nombre:** `markEDdown` con `ED` destacado, sin japonés ni katakana. **Símbolo:** pluma grabada sobre una carta astronómica con sol naranja y marcas de registro.

| Recurso | Archivo | Uso |
| :--- | :--- | :--- |
| Icono | `public/assets/logo/markeddown-studio-icon.svg` | Cabecera y favicon |
| Logotipo horizontal | `public/assets/logo/markeddown-studio-wordmark.svg` | Presentación de marca |
| Portada documental | `docs/markeddown-banner.svg` | README |
| Ilustracion editorial | `public/assets/editorial-cover.png` | Portada opcional por documento |
| Textura de papel | `public/assets/paper-grain.svg` | Grano y fibras repetibles del preview |
| Tema editorial | `src/styles/studio-theme.css` | Tokens y composición |
| Refinamiento | `src/styles/studio-refinement.css` | Responsivo, controles y legibilidad |

No incorporar imágenes de terceros sin aclarar sus derechos.

## 03 / Color, tipografía y material

| Token | Oscuro | Claro |
| :--- | :--- | :--- |
| `--bg` | `#020B1B` azul nocturno | `#E9E4DA` marfil |
| `--surface` | `#041126` azul tinta | `#F5F1E7` papel |
| `--text-strong` | `#F1EDDF` | `#171919` |
| `--accent` | `#EF6330` | `#E34B12` |
| `--studio-secondary` | `#5E9EFF` | `#DE4A17` |
| Papel del preview | `#F1E4CF` | `#F1E4CF` |

Tipografía: **Cormorant Garamond** (títulos editoriales), **Barlow Condensed** (controles), **DM Sans** (UI) y **JetBrains Mono** (editor). Hay fuentes de reserva si las webfonts no cargan.

La vista previa es una página de **papel cálido** en ambos temas, no una zona de dibujo; se elimina el círculo naranja flotante que competía con los títulos. El naranja es un acento, no un fondo general. Una textura SVG de grano fino y fibras cortas queda bajo el contenido.

### Portada por documento

![Ilustración editorial integrada al papel del preview](../public/assets/editorial-cover.png)

La ilustración comparte la base `#F1E4CF` y se mezcla con `mix-blend-mode: darken` para fundir su fondo crema con la hoja. El grano de papel también se aplica bajo la imagen. La portada aparece solo si los metadatos del documento contienen `cover: "editorial"`; en el espacio inicial, únicamente `01_Sol.md` tiene esa marca. Las demás notas permanecen sin portada hasta que se active expresamente para ellas.

## 04 / Pantallas y puntos de corte

| Tamaño | Cabecera | Flujo |
| :--- | :--- | :--- |
| `≥ 1400px` | Marca · selector · acciones, una fila | Explorador + Editor + Vista previa |
| `901–1399px` | Marca/acciones + selector debajo | Tres columnas con anchuras flexibles; stats en barra inferior |
| `601–900px` | Marca/acciones, selector y estado separados | Editor o Vista previa, navegación inferior |
| `≤ 600px` | Marca, acciones, selector y estado en filas propias | Botones táctiles y paneles inferiores |
| `≤ 380px` | Espacios compactos, sin solapamientos | Exportación e inspector todavía accesibles |

En escritorio, la barra inferior muestra estadísticas y guardado **reales**, lejos de los botones de acción. El encabezado de Source refleja el nombre del documento activo, incluso cuando un filtro del explorador oculta su fila. En móvil el estado pasa a su propia fila bajo el selector. El inspector no desaparece por falta de espacio: se reduce a icono, con aviso visual si existen alertas.

Los documentos largos tienen scroll interno y el editor debe conservar fuente legible y padding adecuado. El modo dividido se ofrece solo cuando hay espacio.

## 05 / Contrato de interacción

| Control | Acción |
| :--- | :--- |
| **+ Nuevo** | Delegar en `#new-document` |
| **Buscar** | Delegar en `#open-search` / búsqueda CodeMirror |
| **Exportar** | Popover propio: `.md`, HTML, ZIP de recursos, copiar Markdown/HTML |
| **Más** | Preferencias, ayuda, plantillas, presentación y acciones sobre el documento |
| **Inspector** | Assets, notas y validaciones; conserva las alertas del runtime |
| **Editor / Vista previa / Dividido** | Usa `data-view` existente |
| **Tema** | Respeta `mded.theme`; oscuro solo por defecto en perfiles nuevos |

Exportar utiliza los botones y manejadores de descarga/copia originales; **no** incluye operaciones destructivas como «Limpiar contenido». Cierra con Escape, clic fuera o apertura de Más. Escape devuelve el foco al activador. Las acciones mantienen confirmaciones y feedback existentes.

El comportamiento de explorador, archivos, historial, imágenes y atajos no se sustituye por simulaciones visuales.

## 06 / Arquitectura del estilo

Orden de importación en `src/styles/index.css`:

1. `tokens.css` y `base.css`.
2. `app-shell.css`, `panels.css`, `editor-preview.css`, `overlays.css` y `responsive.css`.
3. `studio-theme.css`: identidad visual base.
4. `studio-refinement.css`: composición, controles, edición, papel y breakpoints.

`src/app/studio-flow.js` conecta accesos nuevos y refleja el estado de guardado y el color del navegador. `src/app/command-palette.js` busca documentos locales y ofrece acciones existentes. `src/domain/starter-workspace.js` define documentos de muestra y sus metadatos de portada. **No** se agrega servicio remoto para la imagen ni para la textura.

Evitar modificar las claves de `src/app/storage.js` sin una migración explícita. Los documentos antiguos deben seguir abriéndose.

## 07 / Calidad y definición de terminado

`npm run test` verifica los accesos rápidos, opciones de exportación, Escape, clic externo, estado, tema e identificadores HTML. `npm run build` comprueba compilación. Ambos pasan actualmente. Ninguno demuestra fidelidad visual por sí mismo.

- [x] Revisión visual de escritorio: Dividido, Editor, Vista previa, Foco y Presentación.
- [x] La ilustración se integra con el papel en Dividido y Vista previa.

Revisar [MOBILE-UI-VERIFICATION.md](MOBILE-UI-VERIFICATION.md) en **320, 360, 390, 768, 1024, 1366, 1440 y 1920px** en ambos temas.

- [ ] Sin estadísticas sobre botones ni desbordes horizontales.
- [ ] Inspector accesible en todas las resoluciones.
- [ ] Exportar abre, descarga, copia y se cierra correctamente.
- [ ] Documentos, carpetas, historial y assets previos siguen presentes.
- [ ] CodeMirror, paleta `/`, búsqueda, imágenes y vista previa funcionan.
- [ ] No se abren paneles inesperados al cambiar de vista.
- [ ] Tema, foco, preferencia de lectura y navegación persisten correctamente.
- [ ] Teclado, `Escape`, foco visible, interacción táctil y movimiento reducido funcionan.
- [ ] No hay errores de consola ni promesas de funcionalidades no implementadas.

**No fusionar solo porque CI esté en verde:** validar manualmente los flujos de escritura, exportación y recuperación.

[README](../README.md) · [Roadmap](ROADMAP.md)
