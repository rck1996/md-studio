# Verificación en PC y móvil · MD.studio

Esta guía sirve para repetir la comprobación con un perfil temporal y notas de ejemplo. La [galería de la app publicada](SCREENSHOTS.md) muestra el escritorio a **1440 × 900** y el móvil emulado a **427 × 900**.

## Preparación

1. Abre [MD.studio](https://md.rck1996.dev/) o ejecuta `npm ci` y `npm run dev`.
2. Usa un perfil temporal para aislar los datos. Prueba los temas **Claro** y **Oscuro** desde **Más → Preferencias**.
3. Comprueba al menos **1440 × 900**, **900 × 800**, **427 × 900** y **320 × 640**. A 900 px o menos se muestran **Editar** y **Vista previa**. En tamaños mayores también aparece **Dividido**.

## Flujos para comprobar

| Flujo | Comprobación |
| :--- | :--- |
| Crear y guardar | Pulsa **Nuevo**, escribe un H1 y espera **Guardado**. Recarga y confirma que aparecen el título y el contenido. |
| Editar y leer | Escribe una lista, una tabla y un bloque de código. Cambia a **Vista previa** y desplázate hasta el final de la nota. |
| Pantalla estrecha | Usa un título largo, comprueba que se lea completo y abre **Más**. El menú debe poder desplazarse sin mover la página en horizontal. |
| Teclado móvil | Escribe cerca del final de una nota larga. El cursor y la barra de formato deben quedar visibles por encima del teclado. |
| Buscar y volver | Abre **Más → Buscar documentos y comandos**. Comprueba los resultados con el teclado activo y vuelve con **Cerrar**. |
| Plantillas | Abre **Más → Crear desde plantilla** mientras editas. El teclado debe ocultarse y la cuadrícula permitir llegar a la última plantilla. |
| Biblioteca | Abre **Documentos**, filtra por título y vuelve a una nota existente. |
| Imágenes y exportación | Inserta una imagen desde el portapapeles o el dispositivo. Comprueba la vista previa y descarga Markdown y el ZIP de recursos. |
| Historial | Edita una nota de prueba y restaura una versión desde **Más → Historial de versiones**. |
| Respaldo | Descarga un ZIP desde **Más → Respaldo del espacio** y restáuralo en otro perfil temporal. Comprueba notas, carpetas, imágenes y versiones. |

## Android y NEXUS OS

En un Android con NEXUS OS instalado y compatible con la recepción de Markdown, abre una nota de prueba y toca **Más → Enviar a NexusOS**. Verifica que el selector nativo muestre el destino y que **Importar nota** conserve título y texto. Prueba **Cancelar** y **Guardar** con notas de ejemplo. Si el navegador no puede compartir, comprueba que se descargue el `.md`.

Las capturas móviles muestran la interfaz web emulada. La comprobación del selector nativo requiere Android con el receptor instalado.

## Evidencia

Registra la versión, el navegador o dispositivo, el tamaño de pantalla, el tema y el resultado. Incluye una captura o pasos para repetir cualquier fallo.

[Galería](SCREENSHOTS.md) · [README](../README.md)
