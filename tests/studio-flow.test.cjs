const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/app/studio-flow.js"), "utf8");

function makeElement(id, opts = {}) {
  const listeners = new Map();
  const el = {
    id,
    disabled: false,
    hidden: opts.hidden ?? false,
    open: false,
    dataset: { ...opts.dataset },
    attributes: {},
    textContent: opts.textContent || "",
    clicks: 0,
    focusCount: 0,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    emit(type, event = {}) {
      for (const cb of listeners.get(type) || []) {
        cb({ type, target: this, stopPropagation() {}, preventDefault() {}, ...event });
      }
    },
    click() {
      this.clicks += 1;
      this.emit("click");
    },
    focus() {
      this.focusCount += 1;
    },
    contains(target) {
      return target === this;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  return el;
}

function setup() {
  const ids = [
    "studio-export", "studio-export-menu", "studio-search", "studio-new",
    "document-stats", "save-status", "studio-live-status",
    "new-document", "open-search", "download-markdown", "export-html",
    "export-assets", "copy-markdown", "copy-html",
  ];
  const elements = new Map(ids.map((id) => [id, makeElement(id)]));
  const actionsMenu = makeElement("actions");
  const workspace = makeElement("workspace", { dataset: { theme: "dark" } });
  const themeColor = { content: "" };
  const exportMenu = elements.get("studio-export-menu");
  exportMenu.hidden = true;
  const targets = ["download-markdown", "share-nexusos", "export-html", "export-assets", "copy-markdown", "copy-html"];
  const items = targets.map((id) => makeElement("proxy-" + id, { dataset: { studioExportAction: id } }));
  exportMenu.querySelectorAll = () => items;
  exportMenu.querySelector = () => items[0];

  const docListeners = new Map();
  const dispatched = [];
  const document = {
    querySelector(selector) {
      if (selector === ".workspace") return workspace;
      if (selector === ".actions-menu") return actionsMenu;
      if (selector === 'meta[name="theme-color"]') return themeColor;
      return elements.get(selector.replace(/^#/, "")) || null;
    },
    getElementById(id) { return elements.get(id) || null; },
    addEventListener(type, cb) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(cb);
    },
    dispatch(type, event = {}) {
      for (const cb of docListeners.get(type) || []) cb({ type, ...event });
    },
    dispatchEvent(event) { dispatched.push(event.type); },
  };
  const observers = [];
  class MockMutationObserver {
    constructor(cb) {
      this.cb = cb;
      this.targets = [];
      observers.push(this);
    }
    observe(target) { this.targets.push(target); }
    notify() { this.cb(); }
  }
  vm.runInNewContext(source, {
    document,
    Event: class Event { constructor(type) { this.type = type; } },
    MutationObserver: MockMutationObserver,
    requestAnimationFrame: (cb) => cb(),
  }, { filename: "src/app/studio-flow.js" });
  return { elements, actionsMenu, workspace, themeColor, exportMenu, items, document, observers, dispatched };
}

test("new reuses its app action and global search opens the command palette", () => {
  const { elements, dispatched } = setup();
  elements.get("studio-new").click();
  elements.get("studio-search").click();
  assert.equal(elements.get("new-document").clicks, 1);
  assert.deepEqual(dispatched, ["markeddown:open-command-palette"]);
});

test("export opens its own popover, delegates to the real action, and closes", () => {
  const { elements, exportMenu, items, actionsMenu } = setup();
  elements.get("studio-export").click();
  assert.equal(exportMenu.hidden, false);
  assert.equal(elements.get("studio-export").attributes["aria-expanded"], "true");
  assert.equal(items[0].focusCount, 1);
  assert.equal(actionsMenu.open, false);
  items[0].click();
  assert.equal(elements.get("download-markdown").clicks, 1);
  assert.equal(exportMenu.hidden, true);
  assert.equal(elements.get("studio-export").attributes["aria-expanded"], "false");
  assert.equal(elements.get("studio-export").focusCount, 1);
});

test("every export option dispatches to its existing handler", () => {
  const { elements, items, dispatched } = setup();
  const targets = ["download-markdown", "share-nexusos", "export-html", "export-assets", "copy-markdown", "copy-html"];
  for (let i = 0; i < targets.length; i++) {
    elements.get("studio-export").click();
    items[i].click();
    if (targets[i] === "share-nexusos") {
      assert.equal(dispatched.at(-1), "markeddown:send-to-nexus");
      continue;
    }
    assert.equal(elements.get(targets[i]).clicks, 1);
  }
});

test("Pocket export menu exposes NexusOS and dispatches through the same share action", () => {
  const html = fs.readFileSync(path.join(root, "src/app/studio-v2.js"), "utf8");
  assert.match(html, /data-studio-pocket-export="share-nexusos"/);
  assert.match(html, /markeddown:send-to-nexus/);
});

test("Escape, outside click, and the original Más menu dismiss export", () => {
  const { elements, exportMenu, document, actionsMenu } = setup();
  elements.get("studio-export").click();
  let prevented = false;
  document.dispatch("keydown", { key: "Escape", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(exportMenu.hidden, true);
  elements.get("studio-export").click();
  document.dispatch("click", { target: makeElement("outside") });
  assert.equal(exportMenu.hidden, true);
  elements.get("studio-export").click();
  actionsMenu.open = true;
  actionsMenu.emit("toggle");
  assert.equal(exportMenu.hidden, true);
});

test("status and theme color reflect real app elements without changing storage", () => {
  const { elements, workspace, themeColor, observers } = setup();
  const stats = elements.get("document-stats");
  const saveStatus = elements.get("save-status");
  const output = elements.get("studio-live-status");
  stats.textContent = "46 palabras";
  saveStatus.textContent = "Guardando";
  saveStatus.dataset.state = "saving";
  observers[0].notify();
  assert.equal(output.textContent, "Guardando · 46 palabras");
  assert.equal(output.dataset.state, "saving");
  assert.equal(themeColor.content, "#020b1b");
  workspace.dataset.theme = "light";
  observers[1].notify();
  assert.equal(themeColor.content, "#e9e4da");
});

test("source keeps a single DOM id per control and dedicated status region", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate HTML id detected");
  for (const id of ["studio-export-menu", "document-stats", "save-status", "studio-live-status", "inspector-toggle", "studio-active-file"]) {
    assert.ok(ids.includes(id), "Missing " + id);
  }
  assert.match(html, /id="save-status" role="status" aria-live="polite"/);
  assert.match(html, /data-writing-action="share-nexusos" data-writing-mobile-only/);
});
