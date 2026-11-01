# Verificación visual y funcional · markEDdown

**Objetivo:** comprobar el rediseño editorial sin perder edición, documentos locales, exportación ni accesibilidad. Esta es una **lista de pruebas por ejecutar**, no un reporte de pruebas ya aprobadas.

## Preparación

1. Trabajar desde la rama [design/editorial-markeddown-studio](https://github.com/rck1996/mded/pull/3).
2. Ejecutar `npm ci`, `npm run test`, `npm run build` y `npm run dev`.
3. Abrir la dirección local de Vite y DevTools → Device Toolbar.
4. Probar **ambos temas**, con navegador recargado y con datos de prueba.
5. **No eliminar datos de un navegador personal**. Usar un perfil temporal si se quiere comprobar un workspace vacío.

## Matriz de tamaños y cabeceras

| Tamaño | Distribución esperada |
| :--- | :--- |
| `1920 × 1080` y `1440 × 900` | Marca, selector y acciones en una fila; estadísticas abajo |
| `1366 × 768` y `1024 × 768` | Marca y acciones arriba, selector en segunda fila; barra inferior |
| `900 × 800` y `768 × 1024` | Marca/acciones, selector y estado en tres filas; navegación inferior |
| `600 × 900` y `390 × 844` | Marca, acciones, selector y estado en cuatro filas independientes |
| `360 × 800` y `320 × 720` | Controles compactos, sin corte horizontal y con inspector accesible |

**El breakpoint funcional es 900px:** JavaScript y CSS deben coincidir. En móvil no se muestra `Dividido`, sino `Editor` o `Vista previa`.

### Cabecera: regresión observada

El problema original consistía en solapamiento de `palabras · caracteres · lectura`, `Guardado`, alertas y botones `Nuevo / Buscar / Foco / Tema / Exportar / Más`. Ya no deben compartir una celda de anchura forzada.

- [ ] Estadísticas y guardado permanecen **fuera del grupo de acciones**.
- [ ] Ninguna etiqueta se monta encima de un botón ni se corta una acción crítica.
- [ ] El botón Inspector está disponible con alertas y sin alertas, también a 320px.
- [ ] El botón Exportar cabe y su popover no sale del viewport.
- [ ] El selector mantiene alineación en escritorio y tablet; no hay scroll horizontal del documento entero.
- [ ] Todos los botones táctiles mantienen al menos unos 40–44px de altura y foco visible.
- [ ] La fuente del editor se puede leer cómodamente y no se reduce de forma agresiva.

## Flujo de regresión mínimo

| Paso | Acción | Resultado esperado |
| :--- | :--- | :--- |
| 1 | Crear documento desde Explorador | Documento aparece y queda activo |
| 2 | Crear desde `+ Nuevo` en escritorio | Reutiliza el mismo flujo de creación |
| 3 | Escribir títulos, lista y tabla | CodeMirror conserva contenido; preview actualiza |
| 4 | Ejecutar `Buscar` o `Ctrl/Cmd+F` | Se abre el buscador de CodeMirror |
| 5 | Pulsar `Exportar` | Solo aparecen opciones de descarga/copia, nunca «Limpiar contenido» |
| 6 | Seleccionar `.md` y `HTML` | Se generan descargas reales; archivos contienen el documento |
| 7 | Exportar `ZIP` con una imagen | Se descarga un archivo con los recursos disponibles |
| 8 | Copiar Markdown y HTML | La operación informa resultado y pega contenido correcto |
| 9 | Abrir Exportar y pulsar Escape | Se cierra y el foco vuelve al botón Exportar |
| 10 | Abrir Exportar y pulsar fuera / Más | Se cierra el popover; Más conserva las opciones originales |
| 11 | Abrir Inspector desde cabecera y cerrar | Se ven validaciones y assets, sin quedarse atrapado |
| 12 | Cambiar tema y recargar | Se conserva la preferencia; la vista previa mantiene papel marfil |
| 13 | Guardar versión, editar y restaurar | Se restaura el contenido esperado |
| 14 | Cambiar de vista con panel lateral abierto en móvil | Se cierra el panel sin ocultar editor/vista previa |
| 15 | Alternar Foco y Presentación | Se puede volver al workspace sin perder contenido |

## Paneles móviles y teclado

- [ ] `.side-tabs` permanece en la parte inferior con altura definida, sin cubrir toda la pantalla.
- [ ] Los paneles de **Explorador**, **Insertar** e **Índice** se abren como sheets sobre la navegación inferior.
- [ ] El campo de búsqueda y los comandos de Insertar son accesibles por teclado/tacto.
- [ ] La navegación inferior no cubre el cursor cuando aparece el teclado móvil.
- [ ] Un cambio `Editor ↔ Vista previa` cierra cualquier sheet, sin alteración de preferencia del panel en escritorio.
- [ ] `Escape` cierra menús, help y exportación en el contexto correspondiente.
- [ ] Se puede tabular entre controles y volver al editor con indicador visible de foco.
- [ ] El editor no presenta una falsa apariencia de «guardado remoto».
- [ ] Los mensajes de copia/exportación aparecen sin tapar las acciones móviles.

## Vista previa y estilos

- [ ] Sin el círculo naranja sobre el título del documento.
- [ ] El documento conserva contraste en claro y oscuro y usa fondo marfil en ambos.
- [ ] Tablas anchas, bloques de código, imágenes y URL largas no producen scroll horizontal global.
- [ ] Los títulos H1–H3, listas, citas y tablas mantienen jerarquía tipográfica.
- [ ] Las preferencias de ancho, densidad y tipografía afectan la vista sin destruir su composición.
- [ ] El editor y la vista previa manejan documentos largos con scroll independiente.
- [ ] No aparecen ilustraciones debajo del texto editable.
- [ ] `prefers-reduced-motion` reduce animaciones; `prefers-contrast: more` refuerza límites.

## Datos y seguridad del cambio

- [ ] Los documentos, carpetas, preferencias, historial y assets previamente guardados se cargan.
- [ ] Ninguna clave de `src/app/storage.js` cambió por un ajuste visual.
- [ ] El HTML de exportación conserva la sanitización actual.
- [ ] No se guarda contenido en servicios externos por activar el nuevo diseño.
- [ ] No se promete sincronización cloud ni respaldo integral como funciones existentes.

## Evidencia antes de fusionar

Para marcar una casilla como verificada, registrar: resolución, navegador, tema, operación, resultado y captura o pasos para reproducir. Anotar fallos con selector/componentes afectados.

| Vista | Claro | Oscuro | Observaciones |
| :--- | :---: | :---: | :--- |
| 1920/1440 | ☐ | ☐ | |
| 1366/1024 | ☐ | ☐ | |
| 900/768 | ☐ | ☐ | |
| 600/390 | ☐ | ☐ | |
| 360/320 | ☐ | ☐ | |

Una ejecución exitosa de `npm run build` y `npm run test` es evidencia de compilación y comportamiento aislado del módulo, **no de QA visual completo**.

[Diseño editorial](EDITORIAL-IDENTITY.md) · [README](../README.md)
