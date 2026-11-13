import { basicSetup, EditorView } from "codemirror";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { codeFolding, defaultHighlightStyle, foldGutter, foldKeymap, foldService, syntaxHighlighting } from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState, Prec } from "@codemirror/state";
import { Decoration, ViewPlugin, WidgetType, keymap, placeholder } from "@codemirror/view";

class InlineTokenWidget extends WidgetType {
  constructor(kind, label, editRange = null) {
    super();
    this.kind = kind;
    this.label = label;
    this.editRange = editRange;
  }

  eq(other) {
    return other.kind === this.kind &&
      other.label === this.label &&
      other.editRange?.from === this.editRange?.from &&
      other.editRange?.to === this.editRange?.to;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-inline-token cm-inline-token-${this.kind}`;
    span.textContent = this.label;
    span.title = this.label;
    if (this.kind === "link" && this.editRange) {
      span.tabIndex = 0;
      span.setAttribute("role", "button");
      span.setAttribute("aria-label", `Editar enlace: ${this.label}`);
      const revealMarkdown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.editRange.view.dispatch({
          selection: { anchor: this.editRange.from, head: this.editRange.to },
          scrollIntoView: true,
        });
        this.editRange.view.focus();
      };
      span.addEventListener("pointerdown", revealMarkdown);
      span.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") revealMarkdown(event);
      });
    }
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

// Inline preview is only a widget: the Markdown token remains unchanged in
// CodeMirror's document. The reader still owns the full-size image view.
class InlineImageWidget extends WidgetType {
  constructor(label, imageUrl) {
    super();
    this.label = label;
    this.imageUrl = imageUrl;
  }

  eq(other) {
    return other.label === this.label && other.imageUrl === this.imageUrl;
  }

  toDOM(view) {
    const card = document.createElement("span");
    card.className = "cm-inline-image-preview";
    card.setAttribute("aria-label", this.label);

    const image = document.createElement("img");
    image.src = this.imageUrl;
    image.alt = this.label;
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    image.addEventListener("load", () => view.requestMeasure(), { once: true });
    image.addEventListener("error", () => {
      card.classList.add("cm-inline-image-failed");
      image.hidden = true;
      view.requestMeasure();
    }, { once: true });

    const caption = document.createElement("span");
    caption.className = "cm-inline-image-caption";
    caption.textContent = this.label;
    card.append(image, caption);
    return card;
  }

  ignoreEvent() {
    return false;
  }
}

const createInlineTokenDecorations = ({ getImageTokenLabel, getImageTokenSource, getLinkTokenLabel }) =>
  ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.buildDecorations(view);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) this.decorations = this.buildDecorations(update.view);
      }

      buildDecorations(view) {
        const decorations = [];
        const imagePattern = /!\[([^\]]*)\]\((mded-image:[^)]+|data:image\/[^)]+)\)/g;
        const linkPattern = /\[([^\]]+)\]\((mded-link:[^)]+|https?:\/\/[^)\s]+)\)/g;
        const fullText = view.state.doc.toString();

        for (const match of fullText.matchAll(imagePattern)) {
          const start = match.index;
          const end = start + match[0].length;
          const label = getImageTokenLabel(match[1], match[2]);
          const imageUrl = getImageTokenSource(match[2]);
          decorations.push(
            Decoration.replace({
              widget: imageUrl ? new InlineImageWidget(label, imageUrl) : new InlineTokenWidget("image", label),
              inclusive: false,
            }).range(start, end),
          );
        }

        for (const match of fullText.matchAll(linkPattern)) {
          const start = match.index;
          const end = start + match[0].length;
          const selectionTouchesLink = view.state.selection.ranges.some((range) =>
            range.empty
              ? range.from >= start && range.from <= end
              : range.from < end && range.to > start,
          );
          if (selectionTouchesLink) continue;
          decorations.push(
            Decoration.replace({
              widget: new InlineTokenWidget("link", getLinkTokenLabel(match[1], match[2]), {
                view,
                from: start + 1,
                to: start + 1 + match[1].length,
              }),
              inclusive: false,
            }).range(start, end),
          );
        }

        return Decoration.set(decorations, true);
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );

const markdownHeadingFoldService = (getHeadingFoldRange) =>
  foldService.of((state, lineStart, lineEnd) => {
    const line = state.doc.lineAt(lineStart);
    if (line.from !== lineStart || line.to !== lineEnd) return null;
    return getHeadingFoldRange(state, lineStart);
  });

const editorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "15px" },
  ".cm-scroller": { fontFamily: '"Cascadia Code", Consolas, monospace', lineHeight: "1.65" },
  ".cm-content": { padding: "20px", minHeight: "100%" },
  ".cm-gutters": { borderRight: "1px solid var(--border)" },
  ".cm-foldGutter .cm-gutterElement": {
    color: "var(--muted)",
    fontSize: "11px",
  },
  ".cm-inline-token": {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    minHeight: "24px",
    margin: "0 2px",
    padding: "0 10px",
    border: "1px solid var(--border)",
    borderRadius: "999px",
    backgroundColor: "var(--surface-muted)",
    color: "var(--text)",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "12px",
    fontWeight: "600",
    lineHeight: "1.2",
    verticalAlign: "middle",
  },
  ".cm-inline-token-image": {
    borderColor: "color-mix(in srgb, var(--accent) 28%, var(--border))",
    backgroundColor: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
  },
  ".cm-inline-token-link": {
    borderColor: "color-mix(in srgb, #4f8cff 24%, var(--border))",
    backgroundColor: "color-mix(in srgb, #4f8cff 8%, var(--surface))",
    cursor: "pointer",
    outlineOffset: "2px",
  },
  ".cm-inline-token-link:focus-visible": { outline: "2px solid var(--accent)" },
});

// Android IMEs can send a picture through DataTransfer on beforeinput rather
// than through a ClipboardEvent. Some Chromium/Samsung combinations do not
// expose rich keyboard media to websites at all; the gallery button remains
// the reliable fallback.
const clipboardImageFile = (transfer) => {
  if (!transfer) return null;
  const direct = [...(transfer.files || [])].find((file) => file.type.startsWith("image/")) ||
    [...(transfer.items || [])]
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .find(Boolean);
  if (direct) return direct;

  // Some keyboard clipboard providers expose a data-image only as text/html.
  const html = transfer.getData?.("text/html") || "";
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["'](data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+))["']/i);
  if (!match || match[3].length > 5_000_000) return null;
  try {
    const binary = atob(match[3]);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new File([bytes], "imagen-portapapeles." + (match[2] === "jpeg" ? "jpg" : match[2]), { type: "image/" + match[2] });
  } catch {
    return null;
  }
};

const createEditorListeners = ({
  isModKey,
  runFormatShortcut,
  isSlashActive,
  getSlashSelection,
  updateSlashSelection,
  executeSlashCommand,
  closeSlashMenu,
  updateSlashMenu,
  insertPastedImage,
  insertPastedLink,
  onEditorScroll,
  getEditorInstance,
}) =>
  EditorView.domEventHandlers({
    keydown(event) {
      if (isModKey(event) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "b") {
          event.preventDefault();
          runFormatShortcut("bold");
          return true;
        }
        if (key === "i") {
          event.preventDefault();
          runFormatShortcut("italic");
          return true;
        }
        if (key === "k") {
          event.preventDefault();
          runFormatShortcut("link");
          return true;
        }
      }

      if (isSlashActive()) {
        const slash = getSlashSelection();
        if (event.key === "ArrowDown") {
          event.preventDefault();
          updateSlashSelection(Math.min(slash.selected + 1, slash.items.length - 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          updateSlashSelection(Math.max(slash.selected - 1, 0));
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          executeSlashCommand();
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSlashMenu();
          return true;
        }
      }
      return false;
    },
    keyup(event) {
      if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) updateSlashMenu();
    },
    beforeinput(event) {
      if (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromDrop") return false;
      const image = clipboardImageFile(event.dataTransfer);
      if (!image) return false;
      event.preventDefault();
      void insertPastedImage(image);
      return true;
    },
    paste(event) {
      const clipboard = event.clipboardData;
      const image = clipboardImageFile(clipboard);
      if (image) {
        event.preventDefault();
        void insertPastedImage(image);
        return true;
      }
      const text = clipboard?.getData("text/plain")?.trim() || "";
      if (/^https?:\/\/\S+$/i.test(text)) {
        event.preventDefault();
        insertPastedLink(text);
        return true;
      }
      return false;
    },
    drop(event) {
      const image = [...event.dataTransfer.files].find((file) => file.type.startsWith("image/"));
      if (!image) return false;
      event.preventDefault();
      const editor = getEditorInstance();
      const coords = editor.posAtCoords({ x: event.clientX, y: event.clientY });
      if (coords !== null) editor.dispatch({ selection: { anchor: coords } });
      insertPastedImage(image);
      return true;
    },
    scroll() {
      onEditorScroll();
    },
  });

export const createCodeMirrorEditor = ({
  markdownText,
  parent,
  themeCompartment,
  wrapCompartment,
  initialThemeExtension,
  initialWrapExtension,
  getHeadingFoldRange,
  getImageTokenLabel,
  getImageTokenSource,
  getLinkTokenLabel,
  isModKey,
  runFormatShortcut,
  isSlashActive,
  getSlashSelection,
  updateSlashSelection,
  executeSlashCommand,
  closeSlashMenu,
  updateSlashMenu,
  insertPastedImage,
  insertPastedLink,
  onEditorScroll,
  onDocChange,
  onOutlineChange,
  getEditorInstance,
}) =>
  new EditorView({
    parent,
    state: EditorState.create({
      doc: markdownText,
      extensions: [
        basicSetup,
        history(),
        markdown(),
        placeholder("Empieza a escribir Markdown…"),
        search({ top: true }),
        syntaxHighlighting(defaultHighlightStyle),
        codeFolding({ placeholderText: "…" }),
        foldGutter({
          openText: "−",
          closedText: "+",
        }),
        editorTheme,
        createInlineTokenDecorations({ getImageTokenLabel, getImageTokenSource, getLinkTokenLabel }),
        markdownHeadingFoldService(getHeadingFoldRange),
        themeCompartment.of(initialThemeExtension),
        wrapCompartment.of(initialWrapExtension),
        createEditorListeners({
          isModKey,
          runFormatShortcut,
          isSlashActive,
          getSlashSelection,
          updateSlashSelection,
          executeSlashCommand,
          closeSlashMenu,
          updateSlashMenu,
          insertPastedImage,
          insertPastedLink,
          onEditorScroll,
          getEditorInstance,
        }),
        Prec.highest(keymap.of([indentWithTab, ...searchKeymap, ...foldKeymap, ...defaultKeymap, ...historyKeymap])),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onDocChange();
          if (update.docChanged || update.selectionSet || update.viewportChanged) onOutlineChange(update.state.doc.toString());
        }),
      ],
    }),
  });
