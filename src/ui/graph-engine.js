/**
 * Studio 2 graph: searchable, zoomable and focusable, keyboard-operable.
 * No silent 24-document cutoff: all documents are searchable and listed.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_NODES = 100;
const state = { query: "", connectedOnly: false, zoom: 1 };
const svgEl = (tag, attrs = {}) => {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, String(value)));
  return element;
};
const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().replace(/\.md$/i, "").toLocaleLowerCase();
const extractLinks = (markdown) =>
  [...String(markdown || "").matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) => normalize(match[1]));
const layout = (docs, activeId) => {
  const width = 1100, height = 760;
  const center = { x: 550, y: 380 };
  const positioned = new Map();
  const active = docs.find((doc) => doc.id === activeId) || docs[0];
  if (active) positioned.set(active.id, center);
  const others = docs.filter((doc) => doc !== active);
  let index = 0, ring = 1;
  while (index < others.length) {
    const radiusX = Math.min(460, 124 + ring * 105);
    const radiusY = Math.min(320, 80 + ring * 70);
    const slots = Math.min(others.length - index, 7 + ring * 9);
    for (let slot = 0; slot < slots; slot += 1) {
      const angle = -Math.PI / 2 + (slot / slots) * 2 * Math.PI + (ring % 2 ? .14 : 0);
      positioned.set(others[index + slot].id, {
        x: center.x + Math.cos(angle) * radiusX,
        y: center.y + Math.sin(angle) * radiusY,
      });
    }
    index += slots;
    ring += 1;
  }
  return { width, height, center, positioned };
};

export const renderEnhancedGraphPanel = ({ container, documents, activeDocumentId, onOpenDocument }) => {
  const canvas = container.querySelector("#graph-canvas");
  const list = container.querySelector("#graph-document-list");
  const count = container.querySelector("#graph-count");
  if (!canvas || !list || !count) return;

  let controls = container.querySelector(".studio-graph-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "studio-graph-controls";
    controls.innerHTML = [
      '<label><span>Buscar conexión</span><input id="studio-graph-search" type="search" placeholder="Documento o concepto…" autocomplete="off" /></label>',
      '<button type="button" id="studio-graph-focus" aria-pressed="false">Solo relacionadas</button>',
      '<div class="studio-graph-zoom" role="group" aria-label="Zoom del grafo">',
      '<button type="button" id="studio-graph-zoom-out" aria-label="Alejar">−</button>',
      '<button type="button" id="studio-graph-zoom-reset" aria-label="Restablecer zoom">100%</button>',
      '<button type="button" id="studio-graph-zoom-in" aria-label="Acercar">+</button></div>',
    ].join("");
    container.insertBefore(controls, canvas);
    controls.querySelector("#studio-graph-search").value = state.query;
    controls.querySelector("#studio-graph-search").addEventListener("input", (event) => {
      state.query = event.target.value;
      renderEnhancedGraphPanel({ container, documents, activeDocumentId, onOpenDocument });
    });
    controls.querySelector("#studio-graph-focus").addEventListener("click", () => {
      state.connectedOnly = !state.connectedOnly;
      renderEnhancedGraphPanel({ container, documents, activeDocumentId, onOpenDocument });
    });
    controls.querySelector("#studio-graph-zoom-in").addEventListener("click", () => {
      state.zoom = Math.min(2.5, +(state.zoom + .25).toFixed(2));
      renderEnhancedGraphPanel({ container, documents, activeDocumentId, onOpenDocument });
    });
    controls.querySelector("#studio-graph-zoom-out").addEventListener("click", () => {
      state.zoom = Math.max(0.75, +(state.zoom - .25).toFixed(2));
      renderEnhancedGraphPanel({ container, documents, activeDocumentId, onOpenDocument });
    });
    controls.querySelector("#studio-graph-zoom-reset").addEventListener("click", () => {
      state.zoom = 1;
      renderEnhancedGraphPanel({ container, documents, activeDocumentId, onOpenDocument });
    });
  }

  const byTitle = new Map(documents.map((doc) => [normalize(doc.title), doc]));
  const links = new Map(documents.map((doc) => [doc.id, new Set(
    extractLinks(doc.markdown).map((target) => byTitle.get(target)?.id).filter(Boolean),
  )]));
  const matched = state.query.trim()
    ? documents.filter((doc) => normalize(doc.title).includes(normalize(state.query)) ||
        normalize(doc.markdown).includes(normalize(state.query)))
    : documents;

  const related = new Set([activeDocumentId]);
  if (state.connectedOnly) {
    (links.get(activeDocumentId) || new Set()).forEach((id) => related.add(id));
    links.forEach((targets, sourceId) => { if (targets.has(activeDocumentId)) related.add(sourceId); });
  }
  const filtered = state.connectedOnly ? matched.filter((doc) => related.has(doc.id)) : matched;
  const prioritized = [...filtered].sort((a, b) =>
    (a.id === activeDocumentId ? -1 : b.id === activeDocumentId ? 1 : 0));
  const docs = prioritized.slice(0, MAX_NODES);
  const selectedIds = new Set(docs.map((doc) => doc.id));
  const edges = [];
  docs.forEach((doc) => (links.get(doc.id) || new Set()).forEach((target) => {
    if (selectedIds.has(target) && target !== doc.id) edges.push([doc.id, target]);
  }));

  canvas.replaceChildren();
  list.replaceChildren();
  const { width, height, center, positioned } = layout(docs, activeDocumentId);
  const z = state.zoom;
  const viewWidth = width / z, viewHeight = height / z;
  const svg = svgEl("svg", {
    viewBox: [center.x - viewWidth / 2, center.y - viewHeight / 2, viewWidth, viewHeight].join(" "),
    role:"group",
    "aria-label":"Grafo con " + docs.length + " documentos y " + edges.length + " conexiones",
  });
  const edgeLayer = svgEl("g", { class:"graph-edges" });
  edges.forEach(([from, to]) => {
    const a = positioned.get(from), b = positioned.get(to);
    edgeLayer.append(svgEl("line", { x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:"graph-edge" }));
  });
  svg.append(edgeLayer);
  docs.forEach((doc) => {
    const point = positioned.get(doc.id);
    const group = svgEl("g", { class:doc.id === activeDocumentId ? "graph-node is-active" : "graph-node",
      role:"button",tabindex:"0","aria-label":"Abrir "+doc.title });
    group.append(svgEl("rect", { x:point.x - 57,y:point.y - 18,width:114,height:36,rx:6 }));
    const label = svgEl("text", { x:point.x,y:point.y + 4,"text-anchor":"middle" });
    label.textContent = doc.title.length > 15 ? doc.title.slice(0,14)+"…" : doc.title;
    group.append(label);
    group.addEventListener("click", () => onOpenDocument(doc));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); onOpenDocument(doc);
      }
    });
    svg.append(group);
  });
  canvas.append(svg);
  count.textContent = docs.length + " de " + filtered.length + " documentos · " + edges.length + " enlaces";
  if (filtered.length > MAX_NODES) {
    const warning = document.createElement("p");
    warning.className = "studio-graph-limited";
    warning.textContent = "El mapa muestra 100 notas a la vez. Usa la búsqueda o Solo relacionadas para localizar las demás.";
    canvas.append(warning);
  } else if (!edges.length) {
    const hint = document.createElement("p");
    hint.className = "graph-hint";
    hint.textContent = "Relaciona documentos usando [[Nombre del documento]].";
    canvas.append(hint);
  }
  filtered.forEach((doc) => {
    const connections = (links.get(doc.id)?.size || 0) +
      [...links.values()].filter((targets) => targets.has(doc.id)).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = doc.id === activeDocumentId ? "graph-list-item is-active" : "graph-list-item";
    const heading = document.createElement("strong");
    heading.textContent = doc.title;
    const meta = document.createElement("small");
    meta.textContent = connections + (connections === 1 ? " relación" : " relaciones");
    button.append(heading, meta);
    button.addEventListener("click", () => onOpenDocument(doc));
    list.append(button);
  });
  controls.querySelector("#studio-graph-focus").setAttribute("aria-pressed", String(state.connectedOnly));
  controls.querySelector("#studio-graph-zoom-reset").textContent = Math.round(state.zoom * 100) + "%";
};
