/**
 * markEDdown Studio 2 / Pocket navigation.
 * Presentation adapter only: delegates every mutation to the existing runtime.
 * No duplicate document store, Markdown parser, or export implementation.
 */
const root = document.querySelector(".workspace");
const byId = (id) => document.getElementById(id);
const mobileQuery = window.matchMedia("(max-width: 900px)");

if (root) {
  root.classList.add("studio-v2");
  const trigger = (id) => {
    const el = byId(id);
    if (el && !el.disabled) el.click();
  };
  const selectView = (view) => {
    const el = root.querySelector('.workspace-controls [data-view="' + view + '"]');
    if (el && !el.disabled) el.click();
  };

  // A lightweight top-level wayfinding strip. The editor and its existing tabs
  // are left in place, so a second copy of the editor is never created.
  const context = document.createElement("div");
  context.className = "studio-v2-context";
  context.setAttribute("aria-label", "Navegación del estudio");
  context.innerHTML =
    '<div class="studio-v2-location"><span class="studio-v2-kicker">RCK1996 / WRITING STUDIO</span>' +
    '<strong id="studio-v2-location-title">Espacio de escritura</strong><small id="studio-v2-location-hint">Escribe · organiza · conecta · publica</small></div>' +
    '<div class="studio-v2-context-actions">' +
    '<button type="button" id="studio-v2-library" title="Abrir biblioteca">Biblioteca</button>' +
    '<button type="button" id="studio-v2-graph" title="Ver conexiones">Conexiones</button>' +
    '<button type="button" id="studio-v2-new" class="studio-v2-primary">+ Nuevo documento</button></div>';
  root.querySelector(".topbar")?.after(context);

  const home = byId("home-panel");
  if (home && !home.querySelector(".studio-v2-home-hero")) {
    const hero = document.createElement("section");
    hero.className = "studio-v2-home-hero";
    hero.innerHTML =
      '<div class="studio-v2-hero-copy"><span class="studio-v2-kicker">TU ESPACIO DE IDEAS / 001</span>' +
      '<h2>Todo empieza<br>con una <em>idea.</em></h2>' +
      '<p>Un estudio para escribir, conectar pensamientos y construir documentos que perduren. Sin cuentas, sin ruido, con tus archivos bajo tu control.</p>' +
      '<button type="button" id="studio-v2-hero-create">Empezar a escribir <span aria-hidden="true">↗</span></button></div>' +
      '<div class="studio-v2-hero-art" aria-hidden="true"><span class="studio-v2-art-orbit"></span><b>m.</b><small>MARK<br>ED<br>DOWN</small></div>';
    home.querySelector(".workspace-panel-heading")?.after(hero);
  }

  const nav = document.createElement("nav");
  nav.className = "studio-v2-mobile-nav";
  nav.setAttribute("aria-label", "Navegación principal móvil");
  nav.innerHTML =
    '<button type="button" data-studio-go="home" aria-label="Inicio"><span aria-hidden="true">⌂</span><small>Inicio</small></button>' +
    '<button type="button" data-studio-go="library" aria-label="Documentos"><span aria-hidden="true">▤</span><small>Documentos</small></button>' +
    '<button type="button" data-studio-go="editor" aria-label="Editor"><span aria-hidden="true">✎</span><small>Escribir</small></button>' +
    '<button type="button" data-studio-go="tools" aria-label="Herramientas"><span aria-hidden="true">☷</span><small>Más</small></button>';
  root.append(nav);

  const keyboardBar = document.createElement("div");
  keyboardBar.className = "studio-v2-keyboard-bar";
  keyboardBar.setAttribute("role", "toolbar");
  keyboardBar.setAttribute("aria-label", "Formato rápido de Markdown");
  keyboardBar.innerHTML =
    '<button type="button" data-pocket-format="bold" aria-label="Negrita"><strong>B</strong></button>' +
    '<button type="button" data-pocket-format="italic" aria-label="Cursiva"><em>I</em></button>' +
    '<button type="button" data-pocket-format="link" aria-label="Enlace">↗</button>' +
    '<button type="button" data-pocket-format="image" aria-label="Imagen">▧</button>' +
    '<button type="button" data-pocket-format="table" aria-label="Tabla">▦</button>' +
    '<button type="button" data-pocket-format="codeBlock" aria-label="Bloque de código">⌘</button>' +
    '<button type="button" id="studio-v2-insert" class="studio-v2-toolbar-plus" aria-label="Más bloques">＋</button>';
  root.append(keyboardBar);

  const mobileTitle = document.createElement("div");
  mobileTitle.className = "studio-v2-pocket-header";
  mobileTitle.innerHTML =
    '<div><span class="studio-v2-kicker">MARKEDDOWN / POCKET</span><strong id="studio-v2-pocket-title">Cuaderno</strong></div>' +
    '<div class="studio-v2-pocket-actions"><button type="button" id="studio-v2-pocket-preview" aria-label="Alternar lectura y escritura">Lectura</button>' +
    '<button type="button" id="studio-v2-pocket-new" aria-label="Nuevo documento">＋</button></div>';
  context.after(mobileTitle);

  const veil = document.createElement("div");
  veil.className = "studio-v2-tools-veil";
  veil.hidden = true;
  veil.innerHTML =
    '<section class="studio-v2-tools-sheet" role="dialog" aria-modal="true" aria-label="Herramientas y ajustes">' +
    '<div class="studio-v2-sheet-head"><div><span class="studio-v2-kicker">MARKEDDOWN / TOOLS</span><h2>Herramientas</h2></div><button id="studio-v2-tools-close" type="button" aria-label="Cerrar">×</button></div>' +
    '<div class="studio-v2-tools-grid">' +
    '<button type="button" data-studio-tool="insert"><b>＋</b><strong>Insertar</strong><small>Bloques de escritura</small></button>' +
    '<button type="button" data-studio-tool="outline"><b>☰</b><strong>Índice</strong><small>Secciones y notas</small></button>' +
    '<button type="button" data-studio-tool="graph"><b>◇</b><strong>Conexiones</strong><small>Grafo de documentos</small></button>' +
    '<button type="button" data-studio-tool="history"><b>↶</b><strong>Historial</strong><small>Versiones anteriores</small></button>' +
    '<button type="button" data-studio-tool="templates"><b>▦</b><strong>Plantillas</strong><small>Documentos listos</small></button>' +
    '<button type="button" data-studio-tool="export"><b>↗</b><strong>Exportar</strong><small>MD, HTML y recursos</small></button>' +
    '<button type="button" data-studio-tool="preferences"><b>⚙</b><strong>Preferencias</strong><small>Lectura y apariencia</small></button>' +
    '<button type="button" data-studio-tool="focus"><b>□</b><strong>Foco</strong><small>Sin distracciones</small></button>' +
    '</div></section>';
  root.append(veil);

  let currentSpace = mobileQuery.matches ? "home" : "editor";
  let returnFocus = null;
  const labels = {
    home: ["Inicio", "Tus documentos, ideas y proyectos"],
    library: ["Biblioteca", "Explora y organiza tu espacio local"],
    editor: ["Editor de Markdown", "Escritura y vista previa en vivo"],
    preview: ["Lectura", "El documento en papel editorial"],
    insert: ["Insertar bloques", "Formatos Markdown listos para usar"],
    outline: ["Índice", "Estructura y notas del documento"],
    graph: ["Conexiones", "Explora tus documentos enlazados"],
  };
  const title = byId("studio-v2-location-title");
  const hint = byId("studio-v2-location-hint");
  const pocketTitle = byId("studio-v2-pocket-title");
  const pocketPreview = byId("studio-v2-pocket-preview");

  const refresh = () => {
    root.dataset.studioSpace = currentSpace;
    root.dataset.studioPocket = String(mobileQuery.matches);
    const label = labels[currentSpace] || labels.editor;
    if (title) title.textContent = label[0];
    if (hint) hint.textContent = label[1];
    if (pocketTitle) pocketTitle.textContent = currentSpace === "editor" || currentSpace === "preview"
      ? (byId("studio-active-file")?.textContent?.trim() || "Documento")
      : label[0];
    if (pocketPreview) pocketPreview.textContent = currentSpace === "preview" ? "Código" : "Lectura";
    nav.querySelectorAll("[data-studio-go]").forEach((button) => {
      const target = button.dataset.studioGo;
      const selected = target === currentSpace || (target === "editor" && currentSpace === "preview");
      button.classList.toggle("is-active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  };
  const setSpace = (space, { delegate = true } = {}) => {
    if (space === "tools") {
      return openTools();
    }
    if (delegate) {
      if (space === "home") trigger("side-tab-home");
      if (space === "library") trigger("side-tab-documents");
      if (space === "graph") trigger("side-tab-graph");
      if (space === "insert") trigger("side-tab-insert");
      if (space === "outline") trigger("side-tab-outline");
      if (space === "editor") selectView(mobileQuery.matches ? "editor" : "split");
      if (space === "preview") selectView("preview");
    }
    currentSpace = space;
    refresh();
    closeTools();
  };
  function openTools() {
    returnFocus = document.activeElement;
    veil.hidden = false;
    root.dataset.studioToolsOpen = "true";
    byId("studio-v2-tools-close")?.focus();
  }
  function closeTools() {
    if (veil.hidden) return;
    veil.hidden = true;
    root.dataset.studioToolsOpen = "false";
    returnFocus?.focus?.();
    returnFocus = null;
  }

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-studio-go]");
    if (button) setSpace(button.dataset.studioGo);
  });
  byId("studio-v2-library")?.addEventListener("click", () => setSpace("library"));
  byId("studio-v2-graph")?.addEventListener("click", () => setSpace("graph"));
  [byId("studio-v2-new"), byId("studio-v2-pocket-new"), byId("studio-v2-hero-create")].forEach((button) =>
    button?.addEventListener("click", () => { trigger("new-document"); setSpace("editor"); })
  );
  byId("studio-v2-pocket-preview")?.addEventListener("click", () => setSpace(currentSpace === "preview" ? "editor" : "preview"));
  byId("studio-v2-insert")?.addEventListener("click", () => setSpace("insert"));
  keyboardBar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) event.preventDefault(); // preserve CodeMirror selection
  });
  keyboardBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pocket-format]");
    if (button) root.querySelector('[data-format="' + button.dataset.pocketFormat + '"]')?.click();
  });
  byId("studio-v2-tools-close")?.addEventListener("click", closeTools);
  veil.addEventListener("pointerdown", (event) => { if (event.target === veil) closeTools(); });
  veil.addEventListener("click", (event) => {
    const button = event.target.closest("[data-studio-tool]");
    if (!button) return;
    const action = button.dataset.studioTool;
    if (["insert", "outline", "graph"].includes(action)) setSpace(action);
    else {
      closeTools();
      const actions = { history: "nav-history", templates: "open-templates", export: "studio-export", preferences: "open-preferences", focus: "focus-mode" };
      trigger(actions[action]);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !veil.hidden) { event.preventDefault(); closeTools(); }
  });

  const navIds = {
    "side-tab-home": "home", "side-tab-documents": "library",
    "side-tab-graph": "graph", "side-tab-insert": "insert", "side-tab-outline": "outline"
  };
  Object.entries(navIds).forEach(([id, space]) => {
    byId(id)?.addEventListener("click", () => {
      // Allow the existing runtime to change the underlying panel first.
      currentSpace = space;
      refresh();
    });
  });
  byId("document-list")?.addEventListener("click", (event) => {
    if (event.target.closest(".document-item")) {
      currentSpace = "editor";
      refresh();
    }
  });
  root.querySelectorAll(".workspace-controls [data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      if (currentSpace === "editor" || currentSpace === "preview") {
        currentSpace = button.dataset.view === "preview" ? "preview" : "editor";
        refresh();
      }
    })
  );
  const titleNode = byId("studio-active-file");
  if (titleNode && typeof MutationObserver !== "undefined") new MutationObserver(refresh).observe(titleNode, { childList: true, subtree: true });

  const updateKeyboard = () => {
    if (!mobileQuery.matches) {
      root.dataset.studioKeyboard = "false";
      root.style.removeProperty("--studio-keyboard-gap");
      return;
    }
    const focused = document.activeElement;
    const inEditor = Boolean(focused?.closest?.(".cm-editor"));
    const viewport = window.visualViewport;
    const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    root.style.setProperty("--studio-keyboard-gap", Math.round(offset) + "px");
    root.dataset.studioKeyboard = String(inEditor && offset > 110);
  };
  document.addEventListener("focusin", updateKeyboard);
  document.addEventListener("focusout", () => window.requestAnimationFrame(updateKeyboard));
  window.visualViewport?.addEventListener("resize", updateKeyboard);
  window.visualViewport?.addEventListener("scroll", updateKeyboard);
  mobileQuery.addEventListener("change", () => {
    if (mobileQuery.matches) setSpace("home");
    else setSpace("editor");
    updateKeyboard();
  });

  // Do not override stored documents or preferences. The new chrome is opt-in
  // by the presence of this module only.
  setSpace(currentSpace);
  updateKeyboard();
}
