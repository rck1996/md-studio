import { renderEnhancedGraphPanel } from "./graph-engine.js";
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

export const renderGraphPanel = renderEnhancedGraphPanel;
