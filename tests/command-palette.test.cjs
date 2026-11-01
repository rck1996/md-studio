const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const moduleSource = fs.readFileSync(path.join(root, "src/app/command-palette.js"), "utf8");
const filterSource = moduleSource
  .replace("export const filterPaletteItems", "const filterPaletteItems")
  .replace(/export const createCommandPalette[\s\S]*$/, "") + "\nthis.filterPaletteItems = filterPaletteItems;";
const sandbox = {};
vm.runInNewContext(filterSource, sandbox);

test("palette search matches commands, categories, and document text without accents", () => {
  const items = [
    { title: "Vista previa", category: "Vista", hint: "Documento renderizado" },
    { title: "Reunión semanal", category: "Documentos", hint: "Ideas para el equipo" },
    { title: "Exportar Markdown", category: "Exportar", hint: "Archivo .md" },
  ];
  assert.deepEqual([...sandbox.filterPaletteItems(items, "reunion")], [items[1]]);
  assert.deepEqual([...sandbox.filterPaletteItems(items, "vista")], [items[0]]);
  assert.deepEqual([...sandbox.filterPaletteItems(items, "  ")], items);
  assert.deepEqual([...sandbox.filterPaletteItems(items, "sin resultados")], []);
});

test("palette exposes accessible dialog controls and delegates Ctrl/Cmd+K", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const bindings = fs.readFileSync(path.join(root, "src/app/bindings.js"), "utf8");
  assert.match(html, /id="command-palette-overlay"[^>]*hidden/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /id="command-palette-results" role="listbox"/);
  assert.match(bindings, /event\.key\.toLowerCase\(\) === "k"[\s\S]*?commandPalette\?\.open\(\)/);
  assert.match(bindings, /event\.key\.toLowerCase\(\) === "f"/);
});
