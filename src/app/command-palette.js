const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const commands = [
  ["side-tab-documents", "Abrir Documentos", "Espacio", "Explora proyectos y carpetas"],
  ["nav-history", "Abrir historial", "Versiones", "Recupera una versión anterior"],
  ["nav-favorites", "Ver favoritos", "Documentos", "Filtra tus documentos favoritos"],
  ["nav-recent", "Ver recientes", "Documentos", "Filtra documentos recientes"],
  ["nav-trash", "Abrir papelera", "Documentos", "Restaura documentos eliminados"],
  ["print-pdf", "Imprimir o guardar PDF", "Exportar", "Prepara una versión editorial imprimible"],
  ["writing-new", "Crear documento", "Capturar", "Abre un documento en blanco"],
  ["open-templates", "Crear desde plantilla", "Capturar", "Elige una estructura para empezar"],
  ["new-folder", "Crear carpeta", "Organizar", "Añade una carpeta a la biblioteca"],
  ["open-search", "Buscar en el documento", "Escritura", "Abre buscar y reemplazar en el editor"],
  ["view-editor", "Cambiar a Editor", "Vista", "Muestra el editor Markdown"],
  ["view-split", "Cambiar a Dividido", "Vista", "Muestra editor y vista previa"],
  ["view-preview", "Cambiar a Vista previa", "Vista", "Muestra el documento renderizado"],
  ["focus-mode", "Alternar modo foco", "Vista", "Escritura inmersiva"],
  ["theme-toggle", "Cambiar tema", "Vista", "Alterna entre tema claro y oscuro"],
  ["open-preferences", "Abrir preferencias", "Vista", "Ajusta tipografía, ancho y tema"],
  ["open-guide", "Abrir atajos y ayuda", "Ayuda", "Consulta los atajos de teclado"],
  ["download-markdown", "Exportar Markdown", "Exportar", "Descarga el documento como .md"],
  ["export-html", "Exportar HTML", "Exportar", "Descarga una página HTML independiente"],
  ["export-assets", "Exportar recursos", "Exportar", "Descarga imágenes como archivo ZIP"],
  ["copy-markdown", "Copiar Markdown", "Exportar", "Copia el contenido fuente"],
  ["copy-html", "Copiar HTML", "Exportar", "Copia el contenido renderizado"],
];

export const filterPaletteItems = (items, query) => {
  const needle = normalize(query).trim();
  if (!needle) return items;
  return items.filter((item) => normalize([item.title, item.category, item.hint, item.searchText].join(" ")).includes(needle));
};

export const createCommandPalette = ({ overlay, input, results, getDocuments, getTemplates, onOpenDocument, onCreateTemplate }) => {
  const closeButton = overlay.querySelector("#command-palette-close");
  let items = [];
  let activeIndex = 0;
  let returnFocus = null;

  const buildItems = () => [
    ...commands.map(([id, title, category, hint]) => ({
      id: `command-${id}`,
      title,
      category,
      hint,
      searchText: id.replaceAll("-", " "),
      action: () => {
        if (id.startsWith("view-")) document.querySelector(`[data-writing-view="${id.slice(5)}"]`)?.click();
        else document.getElementById(id)?.click();
      },
    })),
    ...getTemplates().map((template) => ({
      id: `template-${template.id}`,
      title: template.label,
      category: "Plantillas",
      hint: `Crear ${template.title}`,
      searchText: `${template.title} ${template.markdown.slice(0, 100)}`,
      action: () => onCreateTemplate(template.id),
    })),
    ...getDocuments().map((doc) => ({
      id: `document-${doc.id}`,
      title: doc.title,
      category: "Documentos",
      hint: doc.markdown.replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 100),
      searchText: doc.markdown,
      action: () => onOpenDocument(doc),
    })),
  ];

  const select = (index) => {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      const selected = optionIndex === activeIndex;
      option.setAttribute("aria-selected", String(selected));
      option.classList.toggle("is-active", selected);
    });
    options[activeIndex].scrollIntoView?.({ block: "nearest" });
    input.setAttribute("aria-activedescendant", options[activeIndex].id);
  };

  const render = () => {
    const filtered = filterPaletteItems(items, input.value);
    results.replaceChildren();
    activeIndex = 0;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "command-palette-empty";
      empty.textContent = "No hay documentos ni comandos que coincidan.";
      results.append(empty);
      input.removeAttribute("aria-activedescendant");
      return;
    }
    filtered.forEach((item, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `palette-option-${index}`;
      option.className = "command-palette-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      const copy = document.createElement("span");
      copy.className = "command-palette-copy";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const hint = document.createElement("small");
      hint.textContent = item.hint || "";
      copy.append(title, hint);
      const category = document.createElement("span");
      category.className = "command-palette-category";
      category.textContent = item.category;
      option.append(copy, category);
      option.addEventListener("mouseenter", () => select(index));
      option.addEventListener("click", () => {
        close();
        item.action();
      });
      results.append(option);
    });
    select(0);
  };

  const open = () => {
    if (!overlay.hidden) {
      close();
      return;
    }
    returnFocus = document.activeElement;
    items = buildItems();
    input.value = "";
    render();
    overlay.hidden = false;
    input.focus({ preventScroll: true });
  };

  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    input.removeAttribute("aria-activedescendant");
    returnFocus?.focus?.();
    returnFocus = null;
  };

  input.addEventListener("input", render);
  closeButton.addEventListener("click", close);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      select(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      select(activeIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      results.querySelectorAll('[role="option"]')[activeIndex]?.click();
    }
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      event.preventDefault();
      const next = document.activeElement === closeButton ? input : closeButton;
      next.focus({ preventScroll: true });
    }
  });
  document.addEventListener("markeddown:open-command-palette", open);

  return { open, close, isOpen: () => !overlay.hidden };
};
