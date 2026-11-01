/**
 * Studio 2.1 regression: visual writing, workspace backup/restore and Studio transitions.
 */
import { chromium } from "playwright";
import JSZip from "jszip";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const base = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173";
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  hasTouch: true, isMobile: true, acceptDownloads: true });
const page = await context.newPage();
const issues = [];
let passed = 0;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(9000);
const check = async (name, fn) => {
  try { await fn(); passed++; console.log("PASS " + name); }
  catch (e) { issues.push(name + ": " + e.message); console.error("FAIL " + name + "\n" + e.stack); }
};
const go = (name) => page.locator('[data-studio-go="' + name + '"]').click();
const readMarkdown = () => page.locator(".cm-content").first().innerText();
let backupBuffer = null;
let initialText = "";

try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".cm-content").first().waitFor({ state: "attached" });
  initialText = await readMarkdown();

  await check("Pocket: modo visual muestra documento Markdown", async () => {
    await page.locator("#studio-v2-pocket-compose").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "compose");
    assert.equal(await page.locator(".studio-compose-panel").isVisible(), true);
    assert.ok(await page.locator(".studio-compose-block").count() >= 3);
    assert.ok(await page.locator(".studio-compose-inline").count() >= 2);
  });

  await check("Pocket: editar título visual actualiza CodeMirror sin transformación HTML", async () => {
    const title = page.locator(".studio-compose-inline").first();
    await title.fill("Sol desde Pocket");
    // The compact Pocket layout intentionally hides the redundant heading.
    // Blur the contenteditable to commit exactly as when changing focus.
    await title.evaluate((element) => element.blur());
    await page.waitForTimeout(450);
    const markdown = await readMarkdown();
    assert.match(markdown, /^# Sol desde Pocket/m);
    assert.match(markdown, /## Idea lírica/);
    assert.ok(!markdown.includes("<h1>"));
  });

  await check("Pocket: checklist visual modifica token en Markdown", async () => {
    const checkbox = page.locator(".studio-compose-block-content input[type=checkbox]").first();
    await checkbox.waitFor({ state: "visible" });
    const wasChecked = await checkbox.isChecked();
    await checkbox.click();
    const markdown = await readMarkdown();
    assert.match(markdown, wasChecked ? /- \[ \] Definir concepto central/ : /- \[x\] Definir concepto central/);
  });

  await check("Pocket: bloque complejo conduce al código fuente", async () => {
    const fallback = page.locator(".studio-compose-list .studio-compose-block-actions button").first();
    await fallback.waitFor({ state: "visible" });
    await fallback.click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "editor");
    assert.equal(await page.locator(".editor-panel").isVisible(), true);
  });

  await check("Pocket: volver a modo visual recupera cambios", async () => {
    await page.locator("#studio-v2-pocket-compose").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "compose");
    assert.equal(await page.locator(".studio-compose-inline").first().innerText(), "Sol desde Pocket");
  });

  await check("Pocket: editor visual persiste al recargar", async () => {
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".cm-content").first().waitFor({ state: "attached" });
    assert.match(await readMarkdown(), /^# Sol desde Pocket/m);
  });

  await check("Pocket: respaldo ZIP incluye documento, carpetas e imágenes", async () => {
    await go("tools");
    await page.locator('[data-studio-tool="backup"]').click();
    assert.equal(await page.locator(".studio-backup-overlay").isVisible(), true);
    const dl = page.waitForEvent("download");
    await page.locator("#studio-backup-download").click();
    const archive = await dl;
    assert.match(archive.suggestedFilename(), /^markeddown-workspace-\d{4}-\d\d-\d\d\.zip$/);
    backupBuffer = await readFile(await archive.path());
    const zip = await JSZip.loadAsync(backupBuffer);
    const json = JSON.parse(await zip.file("workspace.json").async("string"));
    assert.equal(json.format, "markeddown-workspace");
    const docs = JSON.parse(json.keys["mded.documents"]);
    assert.ok(docs.some((doc) => doc.markdown.includes("# Sol desde Pocket")));
    assert.ok(Object.hasOwn(json.keys, "mded.folders"));
  });

  await check("Pocket: ZIP no válido se rechaza sin modificar datos", async () => {
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({ format: "markeddown-workspace",
      version: 1, keys: { "evil.script": "payload" } }));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await page.locator("#studio-backup-file").setInputFiles({ name:"invalido.zip",mimeType:"application/zip",buffer });
    await page.waitForFunction(() => /no válido/i.test(document.getElementById("studio-backup-status")?.textContent || ""));
    assert.match(await page.locator("#studio-backup-status").innerText(), /no válido/i);
    assert.equal(await page.locator("#studio-backup-confirm").isVisible(), false);
    assert.match(await readMarkdown(), /^# Sol desde Pocket/m);
  });

  await check("Pocket: restaurar ZIP recupera estado y versiones", async () => {
    await page.locator("#studio-backup-file").setInputFiles({
      name:"espacio-copia.zip", mimeType:"application/zip", buffer:backupBuffer,
    });
    await page.locator("#studio-backup-confirm").waitFor({ state: "visible" });
    assert.equal(await page.locator("#studio-backup-confirm").isVisible(), true);
    await page.locator("[data-backup-close]").click();
    await page.locator('[data-studio-go="editor"]').click();
    await page.locator(".cm-content").first().click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.insertText("\n\nTemporary change that should disappear");
    await page.waitForTimeout(500);
    assert.match(await readMarkdown(), /Temporary change/);
    await go("tools");
    await page.locator('[data-studio-tool="backup"]').click();
    await page.locator("#studio-backup-file").setInputFiles({ name:"espacio-copia.zip",mimeType:"application/zip",buffer:backupBuffer });
    await page.locator("#studio-backup-confirm").waitFor({ state: "visible" });
    page.once("dialog", (dialog) => dialog.accept());
    await Promise.all([
      page.waitForEvent("load"),
      page.locator("#studio-backup-confirm").click(),
    ]);
    await page.locator(".cm-content").first().waitFor({ state:"attached" });
    const markdown = await readMarkdown();
    assert.match(markdown, /^# Sol desde Pocket/m);
    assert.doesNotMatch(markdown, /Temporary change/);
  });

  await check("Escritorio: volver del grafo no deja el editor oculto", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("#studio-v2-graph").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "graph");
    await page.locator("#studio-v2-editor").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "editor");
    assert.equal(await page.locator(".editor-panel").isVisible(), true);
    const visible = await page.locator(".editor-panel").evaluate((el) => getComputedStyle(el).visibility);
    assert.equal(visible, "visible");
  });

  await check("Escritorio: composer usa el mismo documento y volver al código", async () => {
    await page.locator("#studio-v2-compose").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "compose");
    assert.equal(await page.locator(".studio-compose-panel").isVisible(), true);
    assert.equal(await page.locator(".studio-compose-inline").first().innerText(), "Sol desde Pocket");
    await page.locator('[data-compose-action="source"]').click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "editor");
  });

  await check("Composer: selección contextual inserta Markdown sin HTML", async () => {
    await page.locator("#studio-v2-compose").click();
    const item = page.locator(".studio-compose-inline").first();
    await item.focus();
    await item.evaluate((element) => {
      const text = element.firstChild;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 3);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await page.locator(".studio-compose-selection-tools").waitFor({ state: "visible" });
    await page.locator('[data-compose-format="bold"]').click();
    const markdown = await readMarkdown();
    assert.match(markdown, /^# \*\*Sol\*\* desde Pocket/m);
    assert.ok(!markdown.includes("<strong>"));
    await page.locator('[data-compose-action="source"]').click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "editor");
  });

  await check("Composer: enlace contextual solicita URL y conserva Markdown", async () => {
    await page.locator("#studio-v2-compose").click();
    const field = page.locator(".studio-compose-inline").filter({ hasText: "Idea lírica" }).first();
    await field.waitFor({ state: "visible" });
    await field.focus();
    await field.evaluate((element) => {
      const node = element.firstChild;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, Math.min(node.length, 10));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await page.locator(".studio-compose-selection-tools").waitFor({ state: "visible" });
    page.once("dialog", (dialog) => {
      console.log("Context link URL dialog:", dialog.message());
      dialog.accept("https://example.org/reference");
    });
    await page.locator('[data-compose-format="link"]').click();
    // CodeMirror's rich link decoration displays "Enlace: ...", hiding the
    // literal URL in innerText. Assert the raw Markdown source, not its DOM.
    assert.match(await page.locator("#markdown-input").inputValue(), /## \[Idea líric\]\(https:\/\/example\.org\/reference\)a/m);
  });
} finally {
  await context.close();
  await browser.close();
}
if (errors.length) issues.push("Excepciones JavaScript: " + errors.join(" | "));
console.log("STUDIO 2.1 AUDIT: " + passed + " passed, " + issues.length + " failed");
issues.forEach((issue) => console.error("STUDIO 2.1 FAIL: " + issue));
if (issues.length) process.exitCode = 1;
