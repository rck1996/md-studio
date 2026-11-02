const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../src/app/file-actions.js"), "utf8")
  .replaceAll("export const ", "const ") + "\nglobalThis.downloadFile = downloadFile;";

test("downloads attach the link and keep the object URL alive after the click", () => {
  const events = [];
  const pendingTimers = [];
  const children = new Set();
  const link = {
    href: "",
    download: "",
    click() { events.push(["click", children.has(this)]); },
    remove() { children.delete(this); events.push(["remove", children.has(this)]); },
  };
  const context = {
    Blob: class MockBlob {
      constructor(parts, options) { this.parts = parts; this.options = options; }
    },
    URL: {
      createObjectURL(blob) {
        events.push(["create", blob.parts[0], blob.options.type]);
        return "blob:test";
      },
      revokeObjectURL(url) { events.push(["revoke", url]); },
    },
    document: {
      createElement: () => link,
      body: { appendChild(element) { children.add(element); events.push(["append"]); } },
    },
    setTimeout(callback, delay) { pendingTimers.push({ callback, delay }); },
  };
  vm.runInNewContext(source, context);

  context.downloadFile({ filename: "nota.md", content: "# Nota", type: "text/markdown" });

  assert.equal(link.href, "blob:test");
  assert.equal(link.download, "nota.md");
  assert.deepEqual(events.slice(1), [["append"], ["click", true], ["remove", false]]);
  assert.equal(pendingTimers.length, 1);
  assert.equal(pendingTimers[0].delay, 1200);
  assert.equal(events.some(([name]) => name === "revoke"), false);
  pendingTimers[0].callback();
  assert.deepEqual(events.at(-1), ["revoke", "blob:test"]);
});
