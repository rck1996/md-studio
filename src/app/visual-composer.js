/**
 * Visual composition of ordinary Markdown blocks.
 * CodeMirror remains the single source of truth. Complex Markdown is rendered
 * read-only with a one-tap source fallback instead of lossy HTML round-trips.
 */
import { marked } from "marked";
import { setSafeHtml } from "../domain/markdown.js";

export const createVisualComposer = ({ root, bridge, onOpenSource, onOpenPreview }) => {
  const panel = document.createElement("section");
  panel.className = "studio-compose-panel";
  panel.id = "studio-compose-panel";
  panel.setAttribute("aria-label", "Editor visual del documento");
  panel.innerHTML = [
    '<header class="studio-compose-header">',
    '<div><span class="studio-v2-kicker">MODO VISUAL / MARKDOWN ORIGINAL</span>',
    '<h2 id="studio-compose-title">Documento</h2>',
    '<p id="studio-compose-intro">Toca un párrafo o título para editar directamente. Los bloques avanzados mantienen su código original.</p></div>',
    '<div class="studio-compose-actions">',
    '<button type="button" data-compose-action="source">Código</button>',
    '<button type="button" data-compose-action="preview">Leer</button>',
    '</div></header>',
    '<div class="studio-compose-scroll"><article class="studio-compose-paper" id="studio-compose-blocks"></article>',
    '<p class="studio-compose-footnote">Tus cambios se guardan en Markdown · sin convertir el documento a otro formato.</p></div>',
  ].join("");
  root.querySelector(".layout")?.append(panel);
  const container = panel.querySelector("#studio-compose-blocks");
  const title = panel.querySelector("#studio-compose-title");
  const selectionTools = document.createElement("div");
  selectionTools.className = "studio-compose-selection-tools";
  selectionTools.hidden = true;
  selectionTools.setAttribute("role", "toolbar");
  selectionTools.setAttribute("aria-label", "Formato del texto seleccionado");
  selectionTools.innerHTML =
    '<span>SELECCIÓN</span><button type="button" data-compose-format="bold" aria-label="Negrita"><strong>B</strong></button>' +
    '<button type="button" data-compose-format="italic" aria-label="Cursiva"><em>I</em></button>' +
    '<button type="button" data-compose-format="link" aria-label="Insertar enlace">↗ Enlace</button>';
  panel.querySelector(".studio-compose-header").after(selectionTools);
  const editableStates = new WeakMap();
  let selectionContext = null;
  let currentDocument = "";
  let activeEditor = null;
  let blocks = [];

  const openSourceAt = (block) => {
    onOpenSource();
    bridge.focusRange(block.start, block.end);
  };

  const ends = (raw) => {
    const match = raw.match(/\n*$/);
    return match ? match[0] : "";
  };
  const simple = (text) => {
    // Markdown structures and syntax require source editing to preserve exactly.
    // Basic prose and plain headings can be edited as visible text.
    if (text.includes(String.fromCharCode(96))) return false;
    return !/[\[\]<>\\*_~|{}!]/.test(text) && !/^\s*(?:>|[-*+] |\d+\. )/.test(text);
  };
  const editableDescriptor = (token) => {
    if (!["heading", "paragraph"].includes(token.type)) return null;
    const raw = token.raw;
    const tail = ends(raw);
    const body = raw.slice(0, raw.length - tail.length);
    if (token.type === "heading") {
      const match = body.match(/^(#{1,6})([ \t]+)([^\n]*)$/);
      if (!match || !simple(match[3])) return null;
      return { prefix: match[1] + match[2], value: match[3], tail, heading: match[1].length };
    }
    if (body.includes("\n") || !simple(body)) return null;
    return { prefix: "", value: body, tail, heading: 0 };
  };

  const makeButton = (label, title, callback, className = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", callback);
    return button;
  };

  const inline = (block, descriptor, body) => {
    const tag = descriptor.heading ? "h" + descriptor.heading : "p";
    const field = document.createElement(tag);
    field.className = "studio-compose-inline";
    field.contentEditable = "plaintext-only";
    // Browsers that do not support plaintext-only fall back to text-only
    // input handling. HTML pasted from other apps is never written to Markdown.
    field.spellcheck = true;
    field.setAttribute("role", "textbox");
    field.setAttribute("aria-multiline", "false");
    field.setAttribute("aria-label", descriptor.heading ? "Editar título" : "Editar párrafo");
    field.textContent = descriptor.value;
    const state = { from: block.start, to: block.end, raw: block.raw };
    editableStates.set(field, { state, descriptor });
    const commit = () => {
      let value = field.innerText.replace(/\r/g, "").replace(/\n+$/g, "");
      if (descriptor.heading) value = value.replace(/\n/g, " ");
      else value = value.replace(/\n/g, " ");
      const next = descriptor.prefix + value + descriptor.tail;
      if (next === state.raw) return;
      if (!bridge.replaceRange(state.from, state.to, next, state.raw)) {
        field.blur();
        render();
        return;
      }
      state.raw = next;
      state.to = state.from + next.length;
    };
    field.addEventListener("beforeinput", (event) => {
      // Keep one Markdown paragraph per editable block.
      if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") {
        event.preventDefault();
        field.blur();
      }
    });
    field.addEventListener("input", commit);
    field.addEventListener("blur", () => {
      activeEditor = null;
      selectionContext = null;
      selectionTools.hidden = true;
      commit();
      // Defer replacing the DOM until the click on another block/action lands.
      window.requestAnimationFrame(() => { if (!activeEditor) render(); });
    });
    field.addEventListener("focus", () => { activeEditor = field; body.classList.add("is-editing"); });
    return field;
  };

  const textOffset = (field, containerNode, offset) => {
    const range = document.createRange();
    range.selectNodeContents(field);
    range.setEnd(containerNode, offset);
    return range.toString().length;
  };
  const updateSelectionTools = () => {
    selectionTools.hidden = true;
    selectionContext = null;
    if (!activeEditor || root.dataset.studioSpace !== "compose") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1 || selection.isCollapsed ||
        !activeEditor.contains(selection.anchorNode) ||
        !activeEditor.contains(selection.focusNode)) return;
    const a = textOffset(activeEditor, selection.anchorNode, selection.anchorOffset);
    const b = textOffset(activeEditor, selection.focusNode, selection.focusOffset);
    const from = Math.min(a, b), to = Math.max(a, b);
    if (to <= from || !editableStates.has(activeEditor)) return;
    selectionContext = { field: activeEditor, from, to };
    selectionTools.hidden = false;
  };
  // Prevent text selection from collapsing when pressing a format control.
  selectionTools.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  selectionTools.addEventListener("click", (event) => {
    const button = event.target.closest("[data-compose-format]");
    if (!button || !selectionContext) return;
    const { field, from, to } = selectionContext;
    const entry = editableStates.get(field);
    if (!entry || !field.isConnected) return;
    const value = field.textContent || "";
    const selected = value.slice(from, to);
    if (!selected) return;
    let insertion;
    switch (button.dataset.composeFormat) {
      case "bold": insertion = "**" + selected + "**"; break;
      case "italic": insertion = "*" + selected + "*"; break;
      case "link": {
        const entered = window.prompt("Dirección del enlace (https:// o mailto:)", "https://");
        if (entered === null) return;
        const url = entered.trim();
        if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\r\n]/.test(url)) {
          window.alert("Usa un enlace http, https o mailto válido.");
          return;
        }
        insertion = "[" + selected + "](" + url.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20") + ")";
        break;
      }
      default: return;
    }
    const next = entry.descriptor.prefix + value.slice(0, from) + insertion + value.slice(to) + entry.descriptor.tail;
    if (!bridge.replaceRange(entry.state.from, entry.state.to, next, entry.state.raw)) {
      selectionContext = null;
      selectionTools.hidden = true;
      field.blur();
      render();
      return;
    }
    selectionContext = null;
    selectionTools.hidden = true;
    activeEditor = null;
    field.blur();
    render();
  });
  document.addEventListener("selectionchange", updateSelectionTools);

  const makeToken = (token, start) => ({
    type: token.type,
    raw: token.raw,
    start,
    end: start + token.raw.length,
  });

  const render = () => {
    if (activeEditor) return; // Never replace focused contenteditable nodes.
    const markdown = bridge.readMarkdown();
    selectionContext = null;
    selectionTools.hidden = true;
    currentDocument = bridge.getDocumentId();
    title.textContent = document.getElementById("studio-active-file")?.textContent?.trim() || "Documento";
    const tokens = marked.lexer(markdown);
    container.replaceChildren();
    blocks = [];
    let offset = 0;

    for (const token of tokens) {
      const raw = token.raw || "";
      const block = makeToken(token, offset);
      offset += raw.length;
      if (token.type === "space" || !raw) continue;
      blocks.push(block);
      const item = document.createElement("section");
      item.className = "studio-compose-block studio-compose-" + token.type;
      item.dataset.blockStart = String(block.start);
      const body = document.createElement("div");
      body.className = "studio-compose-block-content";
      const descriptor = editableDescriptor(token);
      if (descriptor) {
        body.appendChild(inline(block, descriptor, body));
        item.classList.add("studio-compose-editable");
      } else {
        setSafeHtml(body, marked.parse(bridge.preprocess(raw)));
        if (token.type === "list") {
          const lines = raw.split("\n");
          const tasks = lines.map((line, lineIndex) => ({
            lineIndex, match: line.match(/^(\s*(?:[-*+]|\d+\.)\s+\[)([ xX])(\])/),
          })).filter((task) => task.match);
          body.querySelectorAll('input[type="checkbox"]').forEach((checkbox, taskIndex) => {
            const task = tasks[taskIndex];
            if (!task) return;
            checkbox.removeAttribute("disabled");
            checkbox.setAttribute("aria-label", "Completar tarea Markdown");
            checkbox.addEventListener("change", () => {
              const nextLines = [...lines];
              const original = nextLines[task.lineIndex];
              nextLines[task.lineIndex] = original.replace(
                /^(\s*(?:[-*+]|\d+\.)\s+\[)[ xX](\])/,
                "$1" + (checkbox.checked ? "x" : " ") + "$2",
              );
              if (bridge.replaceRange(block.start, block.end, nextLines.join("\n"), block.raw)) render();
            });
          });
        }
      }

      const actions = document.createElement("div");
      actions.className = "studio-compose-block-actions";
      actions.append(makeButton("↗", "Editar este bloque como Markdown", () => openSourceAt(block)));
      // Ordinary text is already directly editable on tap; adding a second
      // pencil control wastes screen space and duplicates the interaction.
      item.append(actions, body);
      container.appendChild(item);
    }

    if (offset !== markdown.length) {
      // Guardrail: a lexer mismatch must never hide unparsed Markdown.
      const fallback = document.createElement("button");
      fallback.className = "studio-compose-fallback";
      fallback.textContent = "El documento contiene sintaxis avanzada. Abrir Markdown completo.";
      fallback.addEventListener("click", onOpenSource);
      container.appendChild(fallback);
    }
    if (!blocks.length) {
      const blank = document.createElement("button");
      blank.className = "studio-compose-empty";
      blank.textContent = "+ Comienza a escribir en Markdown";
      blank.addEventListener("click", onOpenSource);
      container.appendChild(blank);
    }
  };

  panel.querySelector('[data-compose-action="source"]').addEventListener("click", onOpenSource);
  panel.querySelector('[data-compose-action="preview"]').addEventListener("click", onOpenPreview);
  window.addEventListener("markeddown:document-opened", () => {
    if (root.dataset.studioSpace === "compose") render();
  });
  return { panel, render, getBlockCount: () => blocks.length };
};
