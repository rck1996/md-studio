/**
 * markEDdown Studio 2 / Pocket navigation.
 * Presentation adapter only: delegates every mutation to the existing runtime.
 * No duplicate document store, Markdown parser, or export implementation.
 */
import { createVisualComposer } from "./visual-composer.js";
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
    '<button type="button" id="studio-v2-editor" title="Abrir editor">Editor</button>' +
    '<button type="button" id="studio-v2-compose" title="Editar visualmente">Edición visual</button>' +
    '<button type="button" id="studio-v2-library" title="Abrir biblioteca">Biblioteca</button>' +
    '<button type="button" id="studio-v2-backup" title="Respaldo del espacio">Respaldo</button>' +
    '<button type="button" data-studio-install hidden title="Instalar MarkEDdown">Instalar</button>' +
    '<button type="button" id="studio-v2-graph" title="Ver conexiones">Conexiones</button>' +
    '<button type="button" id="studio-v2-new" class="studio-v2-primary">+ Nuevo documento</button></div>';
  root.querySelector(".topbar")?.after(context);

  const storageAlert = document.createElement("div");
  storageAlert.className = "studio-v2-storage-alert";
  storageAlert.setAttribute("role", "alert");
  storageAlert.hidden = true;
  storageAlert.innerHTML =
    '<span><strong>Cambios sin guardar.</strong> El navegador no pudo almacenar todos los datos. No cierres la pestaña sin exportar una copia del documento.</span>' +
    '<button type="button" id="studio-v2-emergency-export">Descargar .md</button>';
  context.before(storageAlert);
  const showStorageAlert = () => {
    storageAlert.hidden = false;
    root.dataset.studioStorageError = "true";
    const status = byId("save-status");
    if (status) {
      status.textContent = "Sin guardar";
      status.dataset.state = "error";
    }
  };
  window.addEventListener("markeddown:storage-error", showStorageAlert);
  byId("studio-v2-emergency-export")?.addEventListener("click", () => trigger("download-markdown"));
  if (byId("save-status")?.dataset.state === "error") showStorageAlert();

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
    '<button type="button" data-pocket-format="h2" aria-label="Encabezado" title="Encabezado">#</button>' +
    '<button type="button" data-pocket-format="bold" aria-label="Negrita"><strong>B</strong></button>' +
    '<button type="button" data-pocket-format="italic" aria-label="Cursiva"><em>I</em></button>' +
    '<button type="button" data-pocket-format="ul" aria-label="Lista con viñetas" title="Lista con viñetas">☷</button>' +
    '<button type="button" data-pocket-format="link" aria-label="Enlace">↗</button>' +
    '<button type="button" data-pocket-image="gallery" aria-label="Elegir imagen del dispositivo" title="Elegir imagen">▧</button>' +
    '<button type="button" data-pocket-image="clipboard" aria-label="Pegar imagen del portapapeles" title="Pegar imagen">⧉</button>' +
    '<button type="button" id="studio-v2-insert" class="studio-v2-toolbar-plus" aria-label="Más formatos" title="Más formatos">＋</button>';
  root.append(keyboardBar);

  // Android keyboards do not always expose images to the DOM paste event.
  // Keep an explicit gallery picker alongside native clipboard paste support.
  const imagePicker = document.createElement("input");
  imagePicker.id = "studio-v2-image-picker";
  imagePicker.type = "file";
  imagePicker.accept = "image/*";
  imagePicker.hidden = true;
  root.append(imagePicker);
  imagePicker.addEventListener("change", () => {
    const file = imagePicker.files?.[0];
    if (file) document.dispatchEvent(new CustomEvent("markeddown:insert-image-file", { detail: { file } }));
    imagePicker.value = ""; // selecting the same photo twice must work
  });
  const pasteClipboardImage = async () => {
    if (!navigator.clipboard?.read) {
      window.alert("Este navegador no permite leer imágenes del portapapeles. Usa el botón de galería.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const file = new File([blob], "imagen-portapapeles." + (imageType.split("/")[1] || "png"), { type: imageType });
        document.dispatchEvent(new CustomEvent("markeddown:insert-image-file", { detail: { file } }));
        return;
      }
      window.alert("No hay ninguna imagen en el portapapeles. Puedes elegir una foto de la galería.");
    } catch {
      window.alert("No se pudo acceder al portapapeles. Permite el acceso o usa la galería.");
    }
  };

  const mobileTitle = document.createElement("div");
  mobileTitle.className = "studio-v2-pocket-header";
  mobileTitle.innerHTML =
    '<div><span class="studio-v2-kicker">MARKEDDOWN / POCKET</span><strong id="studio-v2-pocket-title">Cuaderno</strong></div>' +
    '<div class="studio-v2-pocket-actions"><button type="button" id="studio-v2-pocket-compose" aria-label="Cambiar a edición visual" title="Modo visual" aria-pressed="false">Aa</button>' +
    '<button type="button" id="studio-v2-pocket-search" aria-label="Buscar documentos y comandos" title="Buscar">⌕</button>' +
    '<button type="button" id="studio-v2-pocket-preview" aria-label="Alternar lectura y escritura">Lectura</button>' +
    '<button type="button" id="studio-v2-pocket-new" aria-label="Nuevo documento">＋</button></div>';
  context.after(mobileTitle);

  const veil = document.createElement("div");
  veil.className = "studio-v2-tools-veil";
  veil.hidden = true;
  veil.innerHTML =
    '<section class="studio-v2-tools-sheet" role="dialog" aria-modal="true" aria-label="Herramientas y ajustes">' +
    '<div class="studio-v2-sheet-head"><button type="button" id="studio-v2-tools-back" aria-label="Volver a herramientas" hidden>←</button><div><span class="studio-v2-kicker">MARKEDDOWN / TOOLS</span><h2 id="studio-v2-sheet-title">Herramientas</h2></div><button id="studio-v2-tools-close" type="button" aria-label="Cerrar">×</button></div>' +
    '<div class="studio-v2-tools-grid">' +
    '<button type="button" data-studio-tool="insert"><b>＋</b><strong>Insertar</strong><small>Bloques de escritura</small></button>' +
    '<button type="button" data-studio-tool="gallery-image"><b>▧</b><strong>Foto / Imagen</strong><small>Elegir del dispositivo</small></button>' +
    '<button type="button" data-studio-tool="clipboard-image"><b>⧉</b><strong>Pegar imagen</strong><small>Desde el portapapeles</small></button>' +
    '<button type="button" data-studio-tool="outline"><b>☰</b><strong>Índice</strong><small>Secciones y notas</small></button>' +
    '<button type="button" data-studio-tool="graph"><b>◇</b><strong>Conexiones</strong><small>Grafo de documentos</small></button>' +
    '<button type="button" data-studio-tool="history"><b>↶</b><strong>Historial</strong><small>Versiones anteriores</small></button>' +
    '<button type="button" data-studio-tool="templates"><b>▦</b><strong>Plantillas</strong><small>Documentos listos</small></button>' +
    '<button type="button" data-studio-tool="export"><b>↗</b><strong>Exportar</strong><small>MD, HTML y recursos</small></button>' +
    '<button type="button" data-studio-tool="backup"><b>⇩</b><strong>Respaldo</strong><small>Guardar y restaurar el espacio</small></button>' +
    '<button type="button" data-studio-install hidden><b>□</b><strong>Instalar</strong><small>Aplicación y acceso offline</small></button>' +
    '<button type="button" data-studio-tool="preferences"><b>⚙</b><strong>Preferencias</strong><small>Lectura y apariencia</small></button>' +
    '<button type="button" data-studio-tool="focus"><b>□</b><strong>Foco</strong><small>Sin distracciones</small></button>' +
    '</div><div class="studio-v2-export-options" hidden>' +
    '<button type="button" data-studio-pocket-export="share-nexusos"><span>↗</span><strong>Enviar a NexusOS</strong><small>Compartir Markdown como nota</small></button>' +
    '<button type="button" data-studio-pocket-export="download-markdown"><span>↓</span><strong>Descargar Markdown</strong><small>Archivo .md</small></button>' +
    '<button type="button" data-studio-pocket-export="export-html"><span>⌘</span><strong>Exportar HTML</strong><small>Documento web</small></button>' +
    '<button type="button" data-studio-pocket-export="print-pdf"><span>▤</span><strong>Imprimir / PDF</strong><small>Diálogo del navegador</small></button>' +
    '<button type="button" data-studio-pocket-export="export-assets"><span>▧</span><strong>Recursos ZIP</strong><small>Imágenes del documento</small></button>' +
    '<button type="button" data-studio-pocket-export="copy-markdown"><span>⧉</span><strong>Copiar Markdown</strong><small>Portapapeles</small></button>' +
    '<button type="button" data-studio-pocket-export="copy-html"><span>⧉</span><strong>Copiar HTML</strong><small>Portapapeles</small></button>' +
    '</div></section>';
  root.append(veil);
  const toolsGrid = veil.querySelector(".studio-v2-tools-grid");
  const exportOptions = veil.querySelector(".studio-v2-export-options");
  const toolsBack = byId("studio-v2-tools-back");
  const sheetTitle = byId("studio-v2-sheet-title");
  const resetToolsView = () => {
    toolsGrid.hidden = false;
    exportOptions.hidden = true;
    toolsBack.hidden = true;
    sheetTitle.textContent = "Herramientas";
  };
  const showExportOptions = () => {
    toolsGrid.hidden = true;
    exportOptions.hidden = false;
    toolsBack.hidden = false;
    sheetTitle.textContent = "Exportar documento";
    toolsBack.focus();
  };

  let currentSpace = "editor";
  let desktopEditView = "editor";
  let composer = null;
  let returnFocus = null;
  const labels = {
    home: ["Inicio", "Tus documentos, ideas y proyectos"],
    library: ["Biblioteca", "Explora y organiza tu espacio local"],
    editor: ["Editor de Markdown", "Edición del código fuente"],
    compose: ["Escritura visual", "Edita bloques sin abandonar Markdown"],
    preview: ["Lectura", "El documento en papel editorial"],
    insert: ["Insertar bloques", "Formatos Markdown listos para usar"],
    outline: ["Índice", "Estructura y notas del documento"],
    graph: ["Conexiones", "Explora tus documentos enlazados"],
  };
  const title = byId("studio-v2-location-title");
  const hint = byId("studio-v2-location-hint");
  const pocketTitle = byId("studio-v2-pocket-title");
  const pocketPreview = byId("studio-v2-pocket-preview");
  const writingLibrary = byId("writing-library");
  const writingTitle = byId("writing-title");
  const writingDocument = byId("writing-document");
  const writingViews = root.querySelectorAll("[data-writing-view]");

  const refresh = () => {
    root.dataset.studioSpace = currentSpace;
    root.dataset.studioPocket = String(mobileQuery.matches);
    const label = labels[currentSpace] || labels.editor;
    const inDocument = ["editor", "preview"].includes(currentSpace);
    writingDocument.hidden = !inDocument;
    const libraryOpen = !inDocument;
    writingLibrary.textContent = libraryOpen ? "Volver al editor" : "Documentos";
    writingTitle.textContent = byId("studio-active-file")?.textContent?.trim() || "Documento";
    writingViews.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.writingView === root.dataset.view));
    });
    if (title) title.textContent = label[0];
    if (hint) hint.textContent = label[1];
    if (pocketTitle) pocketTitle.textContent = ["editor", "preview", "compose"].includes(currentSpace)
      ? (byId("studio-active-file")?.textContent?.trim() || "Documento")
      : label[0];
    if (pocketPreview) {
      pocketPreview.textContent = currentSpace === "preview" ? "Código" : "Lectura";
      pocketPreview.hidden = !["editor", "preview", "compose"].includes(currentSpace);
    }
    const composeButton = byId("studio-v2-pocket-compose");
    if (composeButton) {
      composeButton.setAttribute("aria-pressed", String(currentSpace === "compose"));
      composeButton.classList.toggle("is-selected", currentSpace === "compose");
    }
    if (currentSpace === "compose") composer?.render();
    nav.querySelectorAll("[data-studio-go]").forEach((button) => {
      const target = button.dataset.studioGo;
      const selected = target === currentSpace || (target === "editor" && ["preview", "compose"].includes(currentSpace));
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
      if (space === "editor") {
        // The original graph panel is a persistent overlay. Exit it before
        // opening the editor, otherwise its CSS keeps the editor obscured.
        if (root.dataset.sidePanel === "graph") trigger("side-tab-documents");
        selectView(mobileQuery.matches ? "editor" : desktopEditView);
      }
      if (space === "preview") {
        if (root.dataset.sidePanel === "graph") trigger("side-tab-documents");
        selectView("preview");
      }
    }
    currentSpace = space;
    refresh();
    closeTools();
  };
  function openTools() {
    returnFocus = document.activeElement;
    resetToolsView();
    veil.hidden = false;
    nav.querySelector('[data-studio-go="tools"]')?.setAttribute("aria-expanded", "true");
    root.dataset.studioToolsOpen = "true";
    byId("studio-v2-tools-close")?.focus();
  }
  function closeTools() {
    if (veil.hidden) return;
    veil.hidden = true;
    resetToolsView();
    root.dataset.studioToolsOpen = "false";
    nav.querySelector('[data-studio-go="tools"]')?.setAttribute("aria-expanded", "false");
    returnFocus?.focus?.();
    returnFocus = null;
  }

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-studio-go]");
    if (button) setSpace(button.dataset.studioGo);
  });
  writingLibrary.addEventListener("click", () => {
    setSpace(["editor", "preview"].includes(currentSpace) ? "library" : "editor");
  });
  writingViews.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.writingView === "preview") root.querySelector(".cm-content")?.blur();
    selectView(button.dataset.writingView);
  }));
  const actionsMenu = root.querySelector(".actions-menu");
  const actionsSummary = actionsMenu.querySelector("summary");
  actionsMenu.addEventListener("click", (event) => {
    const button = event.target.closest(".actions-menu-content button");
    if (!button) return;
    const restoreFocus = document.activeElement === button;
    actionsMenu.open = false;
    if (restoreFocus) actionsSummary.focus({ preventScroll: true });
    const action = button.dataset.writingAction;
    if (action === "share-nexusos") document.dispatchEvent(new Event("markeddown:send-to-nexus"));
    else if (action) trigger(action);
  });
  byId("studio-v2-editor")?.addEventListener("click", () => setSpace("editor"));
  byId("studio-v2-compose")?.addEventListener("click", () => setSpace("compose"));
  byId("studio-v2-pocket-compose")?.addEventListener("click", () =>
    setSpace(currentSpace === "compose" ? "editor" : "compose")
  );
  byId("studio-v2-library")?.addEventListener("click", () => setSpace("library"));
  byId("studio-v2-backup")?.addEventListener("click", () =>
    window.dispatchEvent(new Event("markeddown:open-backup"))
  );
  byId("studio-v2-graph")?.addEventListener("click", () => setSpace("graph"));
  [byId("studio-v2-new"), byId("studio-v2-pocket-new"), byId("studio-v2-hero-create")].forEach((button) =>
    button?.addEventListener("click", () => { trigger("new-document"); setSpace("editor"); })
  );
  byId("studio-v2-pocket-preview")?.addEventListener("click", () => setSpace(currentSpace === "preview" ? "editor" : "preview"));
  byId("studio-v2-pocket-search")?.addEventListener("click", () =>
    document.dispatchEvent(new Event("markeddown:open-command-palette"))
  );
  byId("studio-v2-insert")?.addEventListener("click", () => setSpace("insert"));
  keyboardBar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) event.preventDefault(); // preserve CodeMirror selection
  });
  keyboardBar.addEventListener("click", (event) => {
    const imageButton = event.target.closest("[data-pocket-image]");
    if (imageButton?.dataset.pocketImage === "gallery") return imagePicker.click();
    if (imageButton?.dataset.pocketImage === "clipboard") return void pasteClipboardImage();
    const button = event.target.closest("[data-pocket-format]");
    if (button) root.querySelector('[data-format="' + button.dataset.pocketFormat + '"]')?.click();
  });
  byId("studio-v2-tools-close")?.addEventListener("click", closeTools);
  toolsBack.addEventListener("click", () => {
    resetToolsView();
    veil.querySelector('[data-studio-tool="export"]')?.focus();
  });
  veil.addEventListener("pointerdown", (event) => { if (event.target === veil) closeTools(); });
  veil.addEventListener("click", (event) => {
    const button = event.target.closest("[data-studio-tool]");
    if (!button) return;
    const action = button.dataset.studioTool;
    if (["insert", "outline", "graph"].includes(action)) setSpace(action);
    else if (action === "gallery-image" || action === "clipboard-image") {
      closeTools();
      setSpace("editor");
      if (action === "gallery-image") imagePicker.click();
      else void pasteClipboardImage();
    }
    else if (action === "export") showExportOptions();
    else if (action === "backup") {
      closeTools();
      window.dispatchEvent(new Event("markeddown:open-backup"));
    }
    else {
      closeTools();
      if (action === "focus") setSpace("editor");
      const actions = { history: "nav-history", templates: "open-templates", preferences: "open-preferences", focus: "focus-mode" };
      trigger(actions[action]);
    }
  });
  exportOptions.addEventListener("click", (event) => {
    const item = event.target.closest("[data-studio-pocket-export]");
    if (!item) return;
    const action = item.dataset.studioPocketExport;
    closeTools();
    if (action === "share-nexusos") document.dispatchEvent(new Event("markeddown:send-to-nexus"));
    else trigger(action);
  });
  document.addEventListener("keydown", (event) => {
    if (veil.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeTools();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...veil.querySelectorAll("button:not([hidden])")].filter(
      (button) => button.getClientRects().length && !button.disabled
    );
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
  window.addEventListener("markeddown:document-opened", () => setSpace("editor"));
  byId("insert-panel")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-format]")) return;
    setSpace("editor");
    root.querySelector(".cm-content")?.focus();
  });
  byId("home-show-documents")?.addEventListener("click", () => setSpace("library"));
  byId("home-new-project")?.addEventListener("click", () => setSpace("library"));
  byId("close-graph")?.addEventListener("click", () => setSpace("library"));
  root.querySelectorAll('[data-studio-action="favorites"], [data-studio-action="recent"], [data-studio-action="trash"]').forEach((button) => {
    button.addEventListener("click", () => setSpace("library"));
  });
  root.querySelectorAll(".workspace-controls [data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      currentSpace = button.dataset.view === "preview" ? "preview" : "editor";
      if (currentSpace === "editor" && !mobileQuery.matches) desktopEditView = root.dataset.view;
      refresh();
    })
  );
  byId("new-folder")?.addEventListener("click", () => setSpace("library"));
  byId("open-search")?.addEventListener("click", () => setSpace("editor"), { capture: true });
  byId("focus-mode")?.addEventListener("click", () => {
    if (root.dataset.focus === "true" && currentSpace !== "editor") setSpace("editor");
  });
  const titleNode = byId("studio-active-file");
  if (titleNode && typeof MutationObserver !== "undefined") new MutationObserver(refresh).observe(titleNode, { childList: true, subtree: true });

  let keyboardBaselineHeight = window.visualViewport?.height || window.innerHeight;
  let pendingCaretFrame = 0;
  const keepCaretVisible = () => {
    if (!mobileQuery.matches || root.dataset.studioKeyboard !== "true") return;
    const viewport = window.visualViewport;
    const visibleBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
    const focused = document.activeElement;
    const isSource = currentSpace === "editor" && focused?.closest?.(".cm-editor");
    const bottomLimit = Math.min(visibleBottom,
      isSource && keyboardBar.getClientRects().length ? keyboardBar.getBoundingClientRect().top : visibleBottom) - 14;
    if (isSource) {
      const scroller = root.querySelector(".cm-scroller");
      const cursor = root.querySelector(".cm-cursor-primary");
      if (!scroller || !cursor) return;
      const caret = cursor.getBoundingClientRect();
      const topLimit = scroller.getBoundingClientRect().top + 12;
      if (caret.bottom > bottomLimit) scroller.scrollTop += caret.bottom - bottomLimit + 12;
      else if (caret.top < topLimit) scroller.scrollTop -= topLimit - caret.top;
    } else if (focused?.matches?.(".studio-compose-inline")) {
      const scroll = focused.closest(".studio-compose-scroll");
      const rect = focused.getBoundingClientRect();
      if (scroll && rect.bottom > bottomLimit) scroll.scrollTop += rect.bottom - bottomLimit + 12;
    }
  };
  const scheduleCaretVisibility = () => {
    if (pendingCaretFrame) cancelAnimationFrame(pendingCaretFrame);
    pendingCaretFrame = requestAnimationFrame(() => {
      pendingCaretFrame = 0;
      keepCaretVisible();
    });
  };
  const updateKeyboard = () => {
    if (!mobileQuery.matches) {
      root.dataset.studioKeyboard = "false";
      root.style.removeProperty("--studio-keyboard-gap");
      root.style.removeProperty("--studio-visible-height");
      return;
    }
    const focused = document.activeElement;
    const inEditor = Boolean(focused?.closest?.(".cm-editor, .studio-compose-inline"));
    const viewport = window.visualViewport;
    const visibleBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
    const offset = viewport ? Math.max(0, window.innerHeight - visibleBottom) : 0;
    if (!inEditor && offset < 110) keyboardBaselineHeight = visibleBottom;
    const resizedLayout = keyboardBaselineHeight - visibleBottom > 110;
    root.style.setProperty("--studio-visible-height", Math.round(visibleBottom) + "px");
    root.style.setProperty("--studio-keyboard-gap", Math.round(offset) + "px");
    root.dataset.studioKeyboard = String(inEditor && (offset > 110 || resizedLayout));
    scheduleCaretVisibility();
  };
  document.addEventListener("focusin", updateKeyboard);
  document.addEventListener("focusout", () => window.requestAnimationFrame(updateKeyboard));
  root.addEventListener("input", (event) => {
    if (event.target.closest?.(".cm-editor, .studio-compose-inline")) scheduleCaretVisibility();
  });
  document.addEventListener("selectionchange", () => {
    if (document.activeElement?.closest?.(".cm-editor, .studio-compose-inline")) scheduleCaretVisibility();
  });
  window.visualViewport?.addEventListener("resize", updateKeyboard);
  window.visualViewport?.addEventListener("scroll", updateKeyboard);
  mobileQuery.addEventListener("change", () => {
    if (currentSpace === "editor" || currentSpace === "preview") setSpace(currentSpace);
    updateKeyboard();
  });

  document.dispatchEvent(new CustomEvent("markeddown:composer-request", {
    detail: { accept: (bridge) => {
      composer = createVisualComposer({
        root, bridge,
        onOpenSource: () => setSpace("editor"),
        onOpenPreview: () => setSpace("preview"),
      });
    } },
  }));

  // Do not override stored documents or preferences. The new chrome is opt-in
  // by the presence of this module only.
  setSpace(currentSpace);
  updateKeyboard();
}
