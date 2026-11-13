export const createSlashMenuController = ({
  menu,
  list,
  example,
  getEditor,
  getCommands,
  renderExampleHtml,
  onActionCommand,
  onInsertCommand,
}) => {
  let state = {
    active: false,
    start: 0,
    end: 0,
    selected: 0,
    query: "",
    items: [],
  };

  const getState = () => state;
  const isActive = () => state.active;

  const getSlashMatch = () => {
    const editor = getEditor();
    const cursor = editor.state.selection.main.head;
    const line = editor.state.doc.lineAt(cursor);
    const before = editor.state.doc.sliceString(line.from, cursor);
    const match = before.match(/^\/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]*)$/);
    if (!match) return null;
    return { start: line.from, end: cursor, query: match[1].trim().toLowerCase() };
  };

  const getCommandMatches = (query) => {
    const commands = getCommands();
    return query
      ? commands.filter((command) => `${command.title} ${command.hint} ${command.keywords}`.toLowerCase().includes(query))
      : commands;
  };

  const renderFooter = () => {
    const footer = list.querySelector(".slash-footer");
    if (!footer) return;
    const selected = state.items[state.selected];
    const enterLabel = !selected
      ? "Sin comandos disponibles"
      : selected.mode === "action"
        ? selected.category === "Plantillas" ? "Enter para crear documento" : "Enter para ejecutar acción"
        : "Enter para insertar";
    footer.replaceChildren();
    [enterLabel, "↑ ↓ para navegar", "Esc para cerrar"].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      footer.appendChild(item);
    });
  };

  const renderExample = () => {
    const command = state.items[state.selected];
    example.replaceChildren();

    const header = document.createElement("div");
    header.className = "slash-example-header";
    const label = document.createElement("strong");
    label.className = "slash-example-label";
    label.textContent = command ? "Vista previa" : "Sin coincidencias";
    const effect = document.createElement("span");
    effect.className = "slash-example-effect";
    effect.textContent = !command
      ? "Prueba con otro término."
      : command.mode === "insert"
        ? "Se insertará en el documento"
        : command.category === "Plantillas"
          ? "Creará un documento nuevo"
          : "Al elegir, ejecutará esta acción";
    header.append(label, effect);

    const rendered = document.createElement("div");
    rendered.className = "slash-example-rendered";
    if (command) renderExampleHtml(rendered, command.preview);

    const source = document.createElement("details");
    source.className = "slash-example-source";
    const sourceLabel = document.createElement("summary");
    sourceLabel.textContent = "Ver Markdown";
    const snippet = document.createElement("pre");
    snippet.textContent = command?.preview || "";
    source.append(sourceLabel, snippet);
    example.append(header, rendered, source);
  };

  const updateSelection = (index) => {
    state.selected = index;
    [...list.children].forEach((item, itemIndex) => {
      item.classList.toggle("is-selected", itemIndex === state.selected);
      if (itemIndex === state.selected && typeof item.scrollIntoView === "function") {
        item.scrollIntoView({ block: "nearest" });
      }
    });
    renderFooter();
    renderExample();
  };

  const executeCommand = (selectedCommand) => {
    const command = selectedCommand || state.items[state.selected];
    if (!command) return;
    if (command.mode === "action") {
      onActionCommand({ command, start: state.start, end: state.end });
      close();
      return;
    }
    onInsertCommand({ command, start: state.start, end: state.end });
    close();
  };

  const renderMenu = () => {
    list.replaceChildren();

    state.items.forEach((command, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === state.selected ? "slash-item is-selected" : "slash-item";
      const header = document.createElement("span");
      header.className = "slash-item-header";
      const title = document.createElement("span");
      title.className = "slash-item-title";
      title.textContent = command.title;
      const category = document.createElement("em");
      category.className = "slash-item-category";
      category.textContent = command.category;
      const shortcut = document.createElement("kbd");
      shortcut.textContent = command.shortcut;
      shortcut.className = "slash-item-shortcut";
      header.append(title, category, shortcut);
      const hint = document.createElement("small");
      hint.textContent = command.hint;
      button.append(header, hint);
      button.addEventListener("mouseenter", () => updateSelection(index));
      button.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") {
          event.preventDefault();
        }
        updateSelection(index);
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        updateSelection(index);
        executeCommand(command);
      });
      list.appendChild(button);
    });

    const footer = document.createElement("div");
    footer.className = "slash-footer";
    list.appendChild(footer);
    renderFooter();
    renderExample();
  };

  const position = () => {
    const editor = getEditor();
    const cursor = editor.state.selection.main.head;
    const coords = editor.coordsAtPos(cursor);
    const panel = document.querySelector(".editor-panel").getBoundingClientRect();
    if (!coords) return;
    menu.style.maxHeight = `${Math.min(440, Math.max(220, panel.height - 64))}px`;
    const menuHeight = menu.getBoundingClientRect().height;
    const maxTop = Math.max(52, panel.height - menuHeight - 12);
    menu.style.left = `${Math.max(14, Math.min(coords.left - panel.left, panel.width - 420))}px`;
    menu.style.top = `${Math.max(52, Math.min(coords.bottom - panel.top + 8, maxTop))}px`;
  };

  const open = (match) => {
    state = {
      active: true,
      start: match.start,
      end: match.end,
      selected: 0,
      query: match.query,
      items: getCommandMatches(match.query),
    };
    menu.hidden = false;
    renderMenu();
    position();
  };

  const close = () => {
    state.active = false;
    menu.hidden = true;
  };

  const update = () => {
    const match = getSlashMatch();
    if (!match) {
      close();
      return;
    }
    open(match);
  };

  return {
    getState,
    isActive,
    updateSelection,
    executeCommand,
    position,
    close,
    update,
  };
};
