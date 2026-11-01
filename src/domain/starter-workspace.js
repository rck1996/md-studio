export const starterFolders = [
  { id: "project-icaro", name: "Ícaro Después del Sol", order: 0 },
  { id: "ideas", name: "Ideas", order: 1 },
  { id: "research", name: "Investigación", order: 2 },
  { id: "references", name: "Referencias", order: 3 },
];

const stamp = Date.now();

const starterDocumentSources = [
  {
    id: "starter-readme",
    title: "README.md",
    folderId: "project-icaro",
    favorite: true,
    tags: ["proyecto", "markEDdown"],
    markdown: `# markEDdown

Un editor Markdown local, editorial y hecho para trabajar con ideas conectadas.

## Características

- Editor con vista previa en tiempo real.
- Organización por proyectos, carpetas y etiquetas.
- Historial de versiones local.
- Exportación a Markdown, HTML y PDF.

## Filosofía

> Escribir, organizar y crear sin distracciones.

## Proyecto de muestra

Explora [[01_Sol.md]], [[02_El_dia_despues.md]] y [[03_Luna.md]] para ver cómo se enlazan los documentos.
`,
  },
  {
    id: "starter-sol",
    title: "01_Sol.md",
    folderId: "project-icaro",
    favorite: false,
    cover: "editorial",
    tags: ["letras", "producción", "referencia"],
    markdown: `# Sol

La primera canción del proyecto.
El encuentro, el deseo y el deslumbramiento.

## Idea lírica

- El Sol como figura de atracción.
- La belleza que ilumina y también quema.
- El inicio del ascenso.

## Notas

- [x] Definir concepto central
- [ ] Boceto de letra
- [ ] Referencias musicales
- [ ] Maqueta inicial

## Conecta

Continúa la historia en [[02_El_dia_despues.md]] y [[03_Luna.md]].
`,
  },
  {
    id: "starter-after",
    title: "02_El_dia_despues.md",
    folderId: "project-icaro",
    tags: ["letras", "producción"],
    markdown: `# El día después

El silencio que queda cuando se apaga la luz.

## Dirección

- Contrastar la intensidad de [[01_Sol.md]] con una mañana quieta.
- Dejar una imagen abierta al final.
- Recuperar los motivos de [[03_Luna.md]].

## Pendientes

- [ ] Escribir primer verso
- [ ] Probar un pulso lento
`,
  },
  {
    id: "starter-moon",
    title: "03_Luna.md",
    folderId: "project-icaro",
    tags: ["letras", "referencia"],
    markdown: `# Luna

Una respuesta distante a la claridad de [[01_Sol.md]].

## Imágenes

- Reflejo sobre el agua
- Una ciudad después de medianoche
- El color azul entre dos canciones

## Conecta

La búsqueda continúa en [[04_Insomnio.md]].
`,
  },
  {
    id: "starter-insomnia",
    title: "04_Insomnio.md",
    folderId: "project-icaro",
    tags: ["letras", "idea"],
    markdown: `# Insomnio

Una nota breve sobre los pensamientos que no dejan dormir.

## Línea central

> A veces la noche no es oscuridad: es todo lo que sigue encendido.

## Pendientes

- [ ] Conectar con [[03_Luna.md]]
- [ ] Probar una versión instrumental
`,
  },
  {
    id: "starter-dawn",
    title: "05_Amanecer.md",
    folderId: "project-icaro",
    tags: ["letras", "producción"],
    markdown: `# Amanecer

El primer momento en que la noche deja de ser absoluta.

## Motivos

- La luz llega sin resolverlo todo.
- Una última nota larga antes del silencio.
- El eco de [[04_Insomnio.md]].
`,
  },
  {
    id: "starter-search",
    title: "06_Busqueda.md",
    folderId: "project-icaro",
    tags: ["letras", "idea"],
    markdown: `# Búsqueda

El cierre de un recorrido que empezó con [[01_Sol.md]].

## Pendientes

- [ ] Recuperar imágenes de [[05_Amanecer.md]]
- [ ] Revisar el arco completo del proyecto
`,
  },
  {
    id: "starter-ideas",
    title: "Ideas.md",
    folderId: "ideas",
    tags: ["idea"],
    markdown: `# Ideas

Ideas rápidas para volver a ellas después.

## Imágenes

- Una libreta abierta junto a la ventana
- Un mapa que cambia al releerlo
- Un documento que responde a otro

Relacionada: [[01_Sol.md]].
`,
  },
  {
    id: "starter-roadmap",
    title: "roadmap.md",
    folderId: "project-icaro",
    tags: ["proyecto", "planificación"],
    markdown: `# Ruta del proyecto

## Próximo

- [x] Definir identidad visual
- [x] Organizar letras por proyecto
- [ ] Terminar bocetos de [[01_Sol.md]] y [[03_Luna.md]]
- [ ] Preparar maqueta completa

## Más adelante

- [ ] Revisar versiones
- [ ] Exportar el proyecto
`,
  },
];

export const starterDocuments = starterDocumentSources.map((doc, index) => ({
  ...doc,
  createdAt: stamp - (starterDocumentSources.length - index) * 60_000,
  updatedAt: stamp - index * 8_000,
  order: index,
  deletedAt: null,
  archivedAt: null,
  titleManual: true,
  history: [],
  lastSnapshotAt: stamp,
}));
