import {
  activeDocumentKey,
  documentsKey,
  storageGet,
  storageSet,
  storageKey,
} from "../app/storage.js";
import { defaultFolderId, maxDocumentHistory } from "../app/config.js";
import { compareByOrder, getActiveFolderId, getDocumentFolderId, setActiveFolderId, setFolders } from "./folders.js";
import { starterDocuments, starterFolders } from "./starter-workspace.js";

export const getDocumentTitle = (markdown) => markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Sin titulo";

export const sortDocuments = (documents) =>
  [...documents].sort((a, b) => {
    if (getDocumentFolderId(a) !== getDocumentFolderId(b)) return compareByOrder(a, b);
    return compareByOrder(a, b);
  });

export const createSnapshot = (doc, markdown = doc.markdown, reason = "auto") => ({
  id: crypto.randomUUID(),
  title: doc.title,
  markdown,
  createdAt: Date.now(),
  reason,
});

export const normalizeDocument = (doc, index, defaultMarkdown) => {
  const title = typeof doc.title === "string" && doc.title.trim() ? doc.title : getDocumentTitle(doc.markdown || defaultMarkdown);
  const markdown = typeof doc.markdown === "string" ? doc.markdown : defaultMarkdown;
  const history = Array.isArray(doc.history)
    ? doc.history
        .filter((snapshot) => snapshot?.id && typeof snapshot.markdown === "string")
        .map((snapshot) => ({
          id: snapshot.id,
          title: snapshot.title || title,
          markdown: snapshot.markdown,
          createdAt: snapshot.createdAt || Date.now(),
          reason: snapshot.reason || "auto",
        }))
        .slice(-maxDocumentHistory)
    : [];

  return {
    ...doc,
    id: doc.id,
    title,
    markdown,
    titleManual: Boolean(doc.titleManual),
    folderId: getDocumentFolderId(doc),
    createdAt: doc.createdAt ?? doc.updatedAt ?? Date.now(),
    updatedAt: doc.updatedAt ?? Date.now(),
    order: doc.order ?? index,
    deletedAt: doc.deletedAt ?? null,
    archivedAt: doc.archivedAt ?? null,
    favorite: Boolean(doc.favorite),
    history,
    lastSnapshotAt: doc.lastSnapshotAt ?? history.at(-1)?.createdAt ?? 0,
  };
};

export const getDocuments = (defaultMarkdown) => {
  const legacyStarterMarkdown = `# Documento de ejemplo

Escribe aqui tu contenido. Usa los botones de la izquierda si no recuerdas la sintaxis.

## Lista de tareas

- [x] Crear el documento
- [ ] Revisar el contenido
- [ ] Descargar como Markdown

## Tabla simple

| Elemento | Estado |
| --- | --- |
| Editor | Listo |
| Markdown | Disponible |

> La vista previa se actualiza automaticamente.`;

  const createInitial = () => {
    const migrated = storageGet(storageKey) || defaultMarkdown;
    const shouldSeedWorkspace = !storageGet(storageKey) || migrated.trim() === legacyStarterMarkdown.trim();

    if (shouldSeedWorkspace) {
      const initial = starterDocuments.map((doc, index) => {
        const normalized = normalizeDocument(doc, index, defaultMarkdown);
        normalized.history = [createSnapshot(normalized, normalized.markdown, "initial")];
        normalized.lastSnapshotAt = normalized.history[0].createdAt;
        return normalized;
      });
      setFolders(starterFolders);
      setActiveFolderId("project-icaro");
      setDocuments(initial);
      storageSet(activeDocumentKey, "starter-sol");
      return initial;
    }

    const now = Date.now();
    const initial = [
      {
        id: crypto.randomUUID(),
        title: "Documento de ejemplo",
        markdown: migrated,
        createdAt: now,
        folderId: defaultFolderId,
        updatedAt: now,
        order: 0,
        deletedAt: null,
        archivedAt: null,
        history: [],
        lastSnapshotAt: 0,
      },
    ];
    initial[0].history = [createSnapshot(initial[0], migrated, "initial")];
    initial[0].lastSnapshotAt = initial[0].history[0].createdAt;
    storageSet(documentsKey, JSON.stringify(initial));
    storageSet(activeDocumentKey, initial[0].id);
    return initial;
  };

  const stored = storageGet(documentsKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.length) return createInitial();
      if (parsed.length === 1 && parsed[0]?.title === "Documento de ejemplo" && parsed[0]?.markdown?.trim() === legacyStarterMarkdown.trim()) {
        return createInitial();
      }
      const isMarkeddownStarter = parsed.some((doc) => doc.id === "starter-readme") && parsed.every((doc) => String(doc.id).startsWith("starter-"));
      if (isMarkeddownStarter) {
        const existingIds = new Set(parsed.map((doc) => doc.id));
        const additions = starterDocuments.filter((doc) => !existingIds.has(doc.id)).map((doc, index) => {
          const normalized = normalizeDocument(doc, parsed.length + index, defaultMarkdown);
          normalized.history = [createSnapshot(normalized, normalized.markdown, "initial")];
          normalized.lastSnapshotAt = normalized.history[0].createdAt;
          return normalized;
        });
        if (additions.length) {
          const migratedStarter = [...parsed.map((doc, index) => normalizeDocument(doc, index, defaultMarkdown)), ...additions];
          setDocuments(migratedStarter);
          return sortDocuments(migratedStarter);
        }
      }
      const migrated = parsed.map((doc, index) => normalizeDocument(doc, index, defaultMarkdown));
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) setDocuments(migrated);
      return sortDocuments(migrated);
    } catch {
      return createInitial();
    }
  }

  return createInitial();
};

export const setDocuments = (documents) => {
  storageSet(documentsKey, JSON.stringify(sortDocuments(documents).map((doc, index) => ({ ...doc, order: doc.order ?? index }))));
};

export const createBlankDocument = (defaultMarkdown, folderId = getActiveFolderId()) => {
  const now = Date.now();
  const doc = {
    id: crypto.randomUUID(),
    title: "Nuevo documento",
    markdown: "# Nuevo documento\n\nEmpieza a escribir aqui.",
    titleManual: false,
    folderId,
    createdAt: now,
    updatedAt: now,
    order: getDocuments(defaultMarkdown).filter((item) => getDocumentFolderId(item) === folderId).length,
    deletedAt: null,
    archivedAt: null,
    favorite: false,
    history: [],
    lastSnapshotAt: 0,
  };
  doc.history = [createSnapshot(doc, doc.markdown, "initial")];
  doc.lastSnapshotAt = doc.history[0].createdAt;
  return doc;
};

export const createDocumentFromTemplate = (template, defaultMarkdown, folderId = getActiveFolderId()) => {
  const now = Date.now();
  const doc = {
    id: crypto.randomUUID(),
    title: template.title,
    markdown: template.markdown,
    titleManual: false,
    folderId,
    createdAt: now,
    updatedAt: now,
    order: getDocuments(defaultMarkdown).filter((item) => getDocumentFolderId(item) === folderId && !item.deletedAt && !item.archivedAt).length,
    deletedAt: null,
    archivedAt: null,
    favorite: false,
    history: [],
    lastSnapshotAt: 0,
  };
  doc.history = [createSnapshot(doc, doc.markdown, "initial")];
  doc.lastSnapshotAt = doc.history[0].createdAt;
  return doc;
};

export const getActiveDocument = (defaultMarkdown) => {
  const documents = getDocuments(defaultMarkdown).filter((doc) => !doc.deletedAt && !doc.archivedAt);
  const storedActive = storageGet(activeDocumentKey);
  return documents.find((doc) => doc.id === storedActive) || documents[0];
};

export const getVisibleDocuments = (defaultMarkdown) => getDocuments(defaultMarkdown).filter((doc) => !doc.deletedAt && !doc.archivedAt);

export const getDeletedDocuments = (defaultMarkdown) => getDocuments(defaultMarkdown).filter((doc) => doc.deletedAt);

export const getArchivedDocuments = (defaultMarkdown) => getDocuments(defaultMarkdown).filter((doc) => !doc.deletedAt && doc.archivedAt);

export const setDocumentField = (documentId, values, defaultMarkdown) => {
  setDocuments(getDocuments(defaultMarkdown).map((doc) => (doc.id === documentId ? { ...doc, ...values } : doc)));
};

export const captureSnapshot = (documentId, markdown, defaultMarkdown, reason = "auto") => {
  const documents = getDocuments(defaultMarkdown);
  const target = documents.find((doc) => doc.id === documentId);
  if (!target || target.deletedAt) return;
  const previous = target.history.at(-1);
  if (previous?.markdown === markdown) return;

  const snapshot = createSnapshot(target, markdown, reason);
  setDocuments(
    documents.map((doc) =>
      doc.id === documentId
        ? {
            ...doc,
            history: [...doc.history, snapshot].slice(-maxDocumentHistory),
            lastSnapshotAt: snapshot.createdAt,
          }
        : doc,
    ),
  );
};

export const maybeCaptureSnapshot = (documentId, markdown, defaultMarkdown, snapshotIntervalMs) => {
  const target = getDocuments(defaultMarkdown).find((doc) => doc.id === documentId);
  if (!target || target.deletedAt) return;
  if (!target.history.length) {
    captureSnapshot(documentId, markdown, defaultMarkdown, "initial");
    return;
  }
  if (target.history.at(-1)?.markdown === markdown) return;
  if (Date.now() - (target.lastSnapshotAt || 0) < snapshotIntervalMs) return;
  captureSnapshot(documentId, markdown, defaultMarkdown, "auto");
};
