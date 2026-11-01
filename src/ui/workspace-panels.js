const SVG_NS = "http://www.w3.org/2000/svg";

const createSvg = (name, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
};

export const renderHomePanel = ({ container, documents, folders, onOpenDocument }) => {
  const list = container.querySelector("#home-recent");
  const sorted = [...documents].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);
  list.replaceChildren();
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "workspace-empty-copy";
    empty.textContent = "Crea un documento y aparecerá aquí.";
    list.appendChild(empty);
  }
  sorted.forEach((doc) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-recent-item";
    const title = document.createElement("strong");
    title.textContent = doc.title;
    const meta = document.createElement("small");
    meta.textContent = folders.find((folder) => folder.id === doc.folderId)?.name || "General";
    button.append(title, meta);
    button.addEventListener("click", () => onOpenDocument(doc));
    list.appendChild(button);
  });
};

export const renderGraphPanel = ({ container, documents, activeDocumentId, onOpenDocument }) => {
  const canvas = container.querySelector("#graph-canvas");
  const list = container.querySelector("#graph-document-list");
  const count = container.querySelector("#graph-count");
  canvas.replaceChildren();
  list.replaceChildren();

  const docs = documents.slice(0, 24);
  const byTitle = new Map(docs.flatMap((doc) => [[doc.title.toLowerCase(), doc], [doc.title.replace(/\.md$/i, "").toLowerCase(), doc]]));
  const edges = [];
  docs.forEach((doc) => {
    const matcher = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    for (const match of doc.markdown.matchAll(matcher)) {
      const target = byTitle.get(match[1].trim().toLowerCase()) || byTitle.get(match[1].trim().replace(/\.md$/i, "").toLowerCase());
      if (target && target.id !== doc.id) edges.push([doc.id, target.id]);
    }
  });

  const width = 720;
  const height = 380;
  const activeIndex = Math.max(0, docs.findIndex((doc) => doc.id === activeDocumentId));
  const center = { x: width / 2, y: height / 2 };
  const positions = new Map();
  docs.forEach((doc, index) => {
    if (index === activeIndex) {
      positions.set(doc.id, center);
      return;
    }
    const slot = index < activeIndex ? index : index - 1;
    const countOnRing = Math.max(1, docs.length - 1);
    const angle = -Math.PI / 2 + (slot / countOnRing) * Math.PI * 2;
    const radiusX = Math.min(260, 155 + docs.length * 4);
    const radiusY = Math.min(128, 94 + docs.length * 2);
    positions.set(doc.id, { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY });
  });

  const svg = createSvg("svg", { viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": `Grafo con ${docs.length} documentos y ${edges.length} conexiones` });
  const edgeLayer = createSvg("g", { class: "graph-edges" });
  edges.forEach(([sourceId, targetId]) => {
    const a = positions.get(sourceId);
    const b = positions.get(targetId);
    edgeLayer.appendChild(createSvg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "graph-edge" }));
  });
  svg.appendChild(edgeLayer);

  docs.forEach((doc) => {
    const point = positions.get(doc.id);
    const group = createSvg("g", { class: doc.id === activeDocumentId ? "graph-node is-active" : "graph-node", role: "button", tabindex: "0", "aria-label": `Abrir ${doc.title}` });
    group.appendChild(createSvg("rect", { x: point.x - 68, y: point.y - 21, width: 136, height: 42, rx: 7 }));
    const label = createSvg("text", { x: point.x, y: point.y + 4, "text-anchor": "middle" });
    const text = doc.title.length > 19 ? `${doc.title.slice(0, 17)}…` : doc.title;
    label.textContent = text;
    group.appendChild(label);
    const open = () => onOpenDocument(doc);
    group.addEventListener("click", open);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
    svg.appendChild(group);
  });
  canvas.appendChild(svg);
  count.textContent = `${docs.length} documentos · ${edges.length} enlaces`;

  if (!edges.length) {
    const hint = document.createElement("p");
    hint.className = "graph-hint";
    hint.textContent = "Conecta notas con [[Nombre del documento]] para dibujar relaciones.";
    canvas.appendChild(hint);
  }

  docs.forEach((doc) => {
    const connections = edges.filter(([from, to]) => from === doc.id || to === doc.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = doc.id === activeDocumentId ? "graph-list-item is-active" : "graph-list-item";
    const title = document.createElement("strong");
    title.textContent = doc.title;
    const meta = document.createElement("small");
    meta.textContent = `${connections} ${connections === 1 ? "conexión" : "conexiones"}`;
    button.append(title, meta);
    button.addEventListener("click", () => onOpenDocument(doc));
    list.appendChild(button);
  });
};
