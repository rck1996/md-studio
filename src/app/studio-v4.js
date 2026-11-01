/**
 * MarkEDdown Studio 2.2 — consistent desktop navigation and contextual reading.
 * Reuses the original document, preview, history and export implementations.
 */
const root = document.querySelector(".workspace.studio-v2");
const byId = (id) => document.getElementById(id);
if (root) {
  const context = root.querySelector(".studio-v2-context");
  const actions = context?.querySelector(".studio-v2-context-actions");
  const preview = byId("markdown-preview");
  const mobile = window.matchMedia("(max-width: 900px)");
  if (context && actions && preview) {
    context.classList.add("studio-v4-context");
    // Reparent original buttons: preserve their existing handlers.
    const destinations = document.createElement("nav");
    destinations.className = "studio-v4-destinations";
    destinations.setAttribute("aria-label", "Espacios del estudio");
    const appendRoute = (name, space, id, onClick) => {
      const button = id ? byId(id) : document.createElement("button");
      if (!button) return;
      button.type = "button";
      button.textContent = name;
      button.dataset.studioDestination = space;
      button.title = name;
      if (!id) { button.id = "studio-v4-" + space; button.addEventListener("click", onClick); }
      destinations.append(button);
    };
    appendRoute("Inicio", "home", null, () => byId("side-tab-home")?.click());
    appendRoute("Biblioteca", "library", "studio-v2-library");
    appendRoute("Escribir", "editor", "studio-v2-editor");
    appendRoute("Visual", "compose", "studio-v2-compose");
    appendRoute("Conexiones", "graph", "studio-v2-graph");
    appendRoute("Lectura", "preview", null, () =>
      root.querySelector('.workspace-controls [data-view="preview"]')?.click());
    context.querySelector(".studio-v2-location")?.after(destinations);

    const inspectorButton = document.createElement("button");
    inspectorButton.id = "studio-v4-inspector-toggle";
    inspectorButton.type = "button";
    inspectorButton.textContent = "Estructura";
    inspectorButton.setAttribute("aria-controls", "studio-v4-inspector");
    inspectorButton.setAttribute("aria-expanded", "false");
    actions.prepend(inspectorButton);
    const historyButton = document.createElement("button");
    historyButton.id = "studio-v4-history";
    historyButton.type = "button";
    historyButton.textContent = "Versiones";
    historyButton.addEventListener("click", () => byId("nav-history")?.click());
    actions.insertBefore(historyButton, byId("studio-v2-backup"));

    const reader = document.createElement("div");
    reader.className = "studio-v4-reader-toolbar";
    reader.innerHTML = [
      '<div class="studio-v4-reader-heading"><span class="studio-v2-kicker">DOCUMENTO / LECTURA EDITORIAL</span>',
      '<strong id="studio-v4-reader-title">Lectura editorial</strong>',
      '<small id="studio-v4-reader-meta">Markdown local</small></div>',
      '<div class="studio-v4-reader-actions">',
      '<button type="button" data-reader-action="editor">Código</button>',
      '<button type="button" data-reader-action="compose">Editar visual</button>',
      '<button type="button" data-reader-action="present">Presentar</button>',
      '<button type="button" data-reader-action="export">Exportar ↗</button></div>',
      '<div class="studio-v4-reader-progress-track"><span id="studio-v4-reader-progress"></span></div>',
    ].join("");
    preview.before(reader);
    reader.addEventListener("click", (event) => {
      const action = event.target.closest("[data-reader-action]")?.dataset.readerAction;
      if (action === "editor") byId("studio-v2-editor")?.click();
      if (action === "compose") byId("studio-v2-compose")?.click();
      if (action === "present") byId("toggle-presentation")?.click();
      if (action === "export") {
        // The original export menu closes on an outside document click.
        // Stop the reader click bubbling after delegating to the real control.
        event.stopPropagation();
        byId("studio-export")?.click();
      }
    });

    const inspector = document.createElement("aside");
    inspector.id = "studio-v4-inspector";
    inspector.className = "studio-v4-inspector";
    inspector.setAttribute("aria-label", "Estructura y métricas del documento");
    inspector.hidden = true;
    inspector.innerHTML = [
      '<div class="studio-v4-inspector-head"><div><span class="studio-v2-kicker">INSPECTOR / DOCUMENTO</span>',
      '<h2>Tu documento</h2></div>',
      '<button type="button" id="studio-v4-inspector-close" aria-label="Cerrar inspector">×</button></div>',
      '<section class="studio-v4-inspector-metrics" aria-label="Estadísticas">',
      '<div><strong id="studio-v4-words">0</strong><small>Palabras</small></div>',
      '<div><strong id="studio-v4-headings">0</strong><small>Títulos</small></div>',
      '<div><strong id="studio-v4-tasks">0</strong><small>Tareas</small></div></section>',
      '<div class="studio-v4-inspector-section-title"><span>ESTRUCTURA</span>',
      '<small id="studio-v4-outline-count"></small></div>',
      '<nav id="studio-v4-outline-list" class="studio-v4-outline-list" aria-label="Encabezados del documento"></nav>',
      '<div class="studio-v4-inspector-footer">',
      '<button type="button" id="studio-v4-inspector-history">Ver versiones anteriores ↗</button>',
      '<small>Archivos Markdown · almacenamiento local.</small></div>',
    ].join("");
    root.append(inspector);

    let open = false;
    let previousFocus = null;
    let bridge = null;
    let headings = [];
    let scheduled = false;
    document.dispatchEvent(new CustomEvent("markeddown:composer-request", {
      detail: { accept: (adapter) => { bridge = adapter; } },
    }));
    const markdown = () => bridge?.readMarkdown?.() ?? byId("markdown-input")?.value ?? "";
    const collectHeadings = (content) => {
      const output = [];
      const lines = content.split("\n");
      let offset = 0;
      let fenceMarker = "";
      for (const line of lines) {
        const fence = line.match(/^ {0,3}(\x60{3,}|~{3,})/);
        if (fence) {
          const marker = fence[1][0];
          if (!fenceMarker) fenceMarker = marker;
          else if (marker === fenceMarker) fenceMarker = "";
        } else if (!fenceMarker) {
          const match = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/);
          if (match) output.push({
            depth: match[1].length,
            label: match[2].replace(/!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\([^)]*\)|[*_~]/g, "$1$2").trim(),
            offset,
          });
        }
        offset += line.length + 1;
      }
      return output;
    };
    const renderInspector = () => {
      const content = markdown();
      headings = collectHeadings(content);
      const words = content.trim() ? content.trim().split(/\s+/u).length : 0;
      const tasks = (content.match(/^[ \t]*[-*+]\s+\[[ xX]\]/gm) || []).length;
      byId("studio-v4-words").textContent = words.toLocaleString("es-CL");
      byId("studio-v4-headings").textContent = String(headings.length);
      byId("studio-v4-tasks").textContent = String(tasks);
      byId("studio-v4-outline-count").textContent = headings.length + " secciones";
      const list = byId("studio-v4-outline-list");
      list.replaceChildren();
      if (!headings.length) {
        const empty = document.createElement("p");
        empty.className = "studio-v4-empty";
        empty.textContent = "Agrega un encabezado con # para construir el índice.";
        list.append(empty);
      }
      headings.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "studio-v4-outline-item";
        button.dataset.level = String(item.depth);
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        const name = document.createElement("span");
        name.textContent = item.label;
        button.append(number, name);
        button.addEventListener("click", () => {
          if (root.dataset.studioSpace === "preview") {
            const target = preview.querySelectorAll("h1,h2,h3,h4,h5,h6")[index];
            if (target) preview.scrollTop += target.getBoundingClientRect().top -
              preview.getBoundingClientRect().top - 22;
          } else {
            byId("studio-v2-editor")?.click();
            bridge?.focusRange?.(item.offset, item.offset);
          }
          setInspectorOpen(false);
        });
        list.append(button);
      });
      byId("studio-v4-reader-title").textContent =
        byId("studio-active-file")?.textContent?.trim() || "Documento";
      byId("studio-v4-reader-meta").textContent = [
        words.toLocaleString("es-CL") + " palabras",
        Math.max(1, Math.ceil(words / 210)) + " min de lectura",
        headings.length + " secciones",
      ].join(" · ");
    };
    const scheduleUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; renderInspector(); });
    };
    function setInspectorOpen(value) {
      open = Boolean(value) && !mobile.matches;
      inspector.hidden = !open;
      inspectorButton.setAttribute("aria-expanded", String(open));
      root.dataset.studioOutlineOpen = String(open);
      if (open) {
        previousFocus = document.activeElement;
        renderInspector();
        byId("studio-v4-inspector-close")?.focus();
      } else {
        previousFocus?.focus?.();
        previousFocus = null;
      }
    }
    inspectorButton.addEventListener("click", () => setInspectorOpen(!open));
    byId("studio-v4-inspector-close")?.addEventListener("click", () => setInspectorOpen(false));
    byId("studio-v4-inspector-history")?.addEventListener("click", () => {
      setInspectorOpen(false);
      byId("nav-history")?.click();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setInspectorOpen(false);
      }
    });
    mobile.addEventListener("change", () => setInspectorOpen(false));
    const syncNavigation = () => {
      const space = root.dataset.studioSpace || "editor";
      destinations.querySelectorAll("[data-studio-destination]").forEach((button) => {
        const selected = button.dataset.studioDestination === space;
        button.classList.toggle("is-selected", selected);
        if (selected) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      reader.hidden = space !== "preview";
      context.dataset.activeSpace = space;
      scheduleUpdate();
    };
    new MutationObserver(syncNavigation).observe(root, {
      attributes: true, attributeFilter: ["data-studio-space"],
    });
    const file = byId("studio-active-file");
    if (file) new MutationObserver(scheduleUpdate).observe(file, { childList: true, subtree: true });
    const cmContent = root.querySelector(".cm-content");
    if (cmContent) new MutationObserver(scheduleUpdate).observe(cmContent, {
      childList: true, characterData: true, subtree: true,
    });
    window.addEventListener("markeddown:document-opened", scheduleUpdate);

    // Optional ratio-based linked scrolling in split view.
    let syncEnabled = true;
    try { syncEnabled = localStorage.getItem("mded.splitScrollSync") !== "false"; } catch {}
    const syncButton = document.createElement("button");
    syncButton.id = "studio-v4-scroll-sync";
    syncButton.type = "button";
    syncButton.setAttribute("aria-label", "Sincronizar desplazamiento entre código y vista previa");
    syncButton.title = "Desplazamiento sincronizado";
    syncButton.setAttribute("aria-pressed", String(syncEnabled));
    syncButton.textContent = "⇆ Scroll vinculado";
    root.querySelector(".workspace-controls")?.append(syncButton);
    syncButton.addEventListener("click", () => {
      syncEnabled = !syncEnabled;
      syncButton.setAttribute("aria-pressed", String(syncEnabled));
      try { localStorage.setItem("mded.splitScrollSync", String(syncEnabled)); } catch {}
    });
    const codeScroller = root.querySelector(".cm-scroller");
    let activeSource = null;
    let scrollFrame = 0;
    const canSync = () => !mobile.matches && syncEnabled &&
      root.dataset.studioSpace === "editor" && root.dataset.view === "split" &&
      root.dataset.focus !== "true" && root.dataset.presentation !== "true";
    const linkScroll = (from, to) => {
      if (!canSync() || activeSource) return;
      activeSource = from;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const fromSpan = Math.max(0, from.scrollHeight - from.clientHeight);
        const toSpan = Math.max(0, to.scrollHeight - to.clientHeight);
        const fraction = fromSpan ? from.scrollTop / fromSpan : 0;
        to.scrollTop = Math.min(toSpan, Math.max(0, fraction * toSpan));
        requestAnimationFrame(() => { activeSource = null; });
      });
    };
    codeScroller?.addEventListener("scroll", () => linkScroll(codeScroller, preview), { passive: true });
    preview.addEventListener("scroll", () => {
      const span = Math.max(1, preview.scrollHeight - preview.clientHeight);
      const fraction = Math.min(1, preview.scrollTop / span);
      byId("studio-v4-reader-progress").style.width = Math.round(fraction * 100) + "%";
      if (codeScroller) linkScroll(preview, codeScroller);
    }, { passive: true });
    renderInspector();
    syncNavigation();
  }
}
