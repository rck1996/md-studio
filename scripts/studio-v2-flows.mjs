/**
 * Studio 2 end-to-end flow audit against the running Vite application.
 * These tests do not mock the app's document store or renderer.
 * Run: npm run dev -- --host 127.0.0.1
 *      node scripts/studio-v2-flows.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const failures = [];
const errors = [];
let count = 0;

async function test(label, task) {
  try {
    await task();
    count += 1;
    console.log("PASS " + label);
  } catch (error) {
    failures.push(label + " — " + error.message);
    console.error("FAIL " + label + ": " + error.stack);
  }
}

const getSpace = (page) => page.locator(".workspace").getAttribute("data-studio-space");
const route = async (page, destination) => {
  await page.locator('[data-studio-go="' + destination + '"]').click();
  assert.equal(await getSpace(page), destination);
};
const closeDialog = async (page, closeId) => {
  await page.locator(closeId).click();
};
const tools = async (page, action) => {
  await page.locator('[data-studio-go="tools"]').click();
  const dialog = page.locator(".studio-v2-tools-veil:not([hidden])");
  await dialog.waitFor({ state: "visible" });
  if (action) await dialog.locator('[data-studio-tool="' + action + '"]').click();
};
const readMarkdown = (page) => page.locator(".cm-content").first().innerText();
const ensureReady = async (page) => {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".workspace.studio-v2").waitFor();
  await page.locator(".cm-content").first().waitFor({ state: "attached" });
};
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 }, colorScheme: "light", acceptDownloads: true,
});
const desktop = await desktopContext.newPage();
desktop.on("pageerror", (error) => errors.push("desktop: " + error.message));
const phoneContext = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 2, colorScheme: "light", acceptDownloads: true,
});
const phone = await phoneContext.newPage();
phone.on("pageerror", (error) => errors.push("phone: " + error.message));

try {
  await ensureReady(desktop);
  await ensureReady(phone);

  await test("Desktop: Inicio -> abrir reciente -> Editor", async () => {
    await desktop.locator("#side-tab-home").click();
    assert.equal(await getSpace(desktop), "home");
    await desktop.locator("#home-recent .home-recent-item").first().click();
    assert.equal(await getSpace(desktop), "editor");
    assert.equal(await desktop.locator(".editor-panel").isVisible(), true);
  });
  await test("Desktop: Biblioteca -> abrir archivo -> Editor", async () => {
    await desktop.locator("#studio-v2-library").click();
    assert.equal(await getSpace(desktop), "library");
    await desktop.locator("#document-list .document-item").first().click();
    assert.equal(await getSpace(desktop), "editor");
  });
  await test("Desktop: Conexiones -> abrir nodo -> Editor", async () => {
    await desktop.locator("#studio-v2-graph").click();
    assert.equal(await getSpace(desktop), "graph");
    await desktop.locator("#graph-panel .graph-node").first().click();
    assert.equal(await getSpace(desktop), "editor");
  });
  await test("Desktop: Inicio -> nuevo proyecto -> Biblioteca", async () => {
    await desktop.evaluate(() => { window.prompt = () => "Proyecto QA"; });
    await desktop.locator("#side-tab-home").click();
    await desktop.locator("#home-new-project").click();
    assert.equal(await getSpace(desktop), "library");
  });
  await test("Desktop: Editor claro y oscuro", async () => {
    await desktop.locator("#studio-v2-editor").click();
    await desktop.evaluate(() => document.getElementById("theme-toggle").click());
    const theme = await desktop.locator(".workspace").getAttribute("data-theme");
    assert.ok(["light", "dark"].includes(theme));
    await desktop.evaluate(() => document.getElementById("theme-toggle").click());
    assert.notEqual(await desktop.locator(".workspace").getAttribute("data-theme"), theme);
  });

  await test("Pocket: inicio -> reciente -> editor", async () => {
    await route(phone, "home");
    await phone.locator("#home-recent .home-recent-item").first().click();
    assert.equal(await getSpace(phone), "editor");
    assert.equal(await phone.locator(".editor-panel").isVisible(), true);
  });
  await test("Pocket: biblioteca -> documento -> editor", async () => {
    await route(phone, "library");
    await phone.locator("#document-list .document-item").first().click();
    assert.equal(await getSpace(phone), "editor");
  });
  await test("Pocket: pantalla de Inicio -> biblioteca", async () => {
    await route(phone, "home");
    await phone.locator("#home-show-documents").click();
    assert.equal(await getSpace(phone), "library");
  });
  await test("Pocket: plantilla -> editor real", async () => {
    await route(phone, "home");
    await phone.locator("#home-new-document").click();
    assert.equal(await phone.locator("#template-overlay").isVisible(), true);
    await phone.locator("#template-grid .template-card").first().click();
    assert.equal(await getSpace(phone), "editor");
    assert.equal(await phone.locator(".editor-panel").isVisible(), true);
  });
  await test("Pocket: formato -> mutación Markdown", async () => {
    await route(phone, "editor");
    const before = await readMarkdown(phone);
    await phone.locator('[data-pocket-format="bold"]').click();
    const after = await readMarkdown(phone);
    assert.notEqual(before, after);
    assert.match(after, /\*\*texto importante\*\*/);
  });
  await test("Pocket: herramientas -> insertar bloque -> editor", async () => {
    await tools(phone, "insert");
    assert.equal(await getSpace(phone), "insert");
    const before = await readMarkdown(phone);
    await phone.locator('#insert-panel [data-format="h2"]').first().click();
    assert.equal(await getSpace(phone), "editor");
    assert.notEqual(await readMarkdown(phone), before);
  });
  await test("Pocket: grafo -> abrir documento", async () => {
    await tools(phone, "graph");
    assert.equal(await getSpace(phone), "graph");
    await phone.locator("#graph-panel .graph-node").first().click();
    assert.equal(await getSpace(phone), "editor");
  });
  await test("Pocket: historial y restauración disponible", async () => {
    await tools(phone, "history");
    assert.equal(await phone.locator("#history-overlay").isVisible(), true);
    await closeDialog(phone, "#close-history");
  });
  await test("Pocket: preferencias accesibles", async () => {
    await tools(phone, "preferences");
    assert.equal(await phone.locator("#preferences-overlay").isVisible(), true);
    await phone.locator("#preference-width").selectOption("wide");
    assert.equal(await phone.locator("#preference-width").inputValue(), "wide");
    await closeDialog(phone, "#close-preferences");
  });
  await test("Pocket: buscador global", async () => {
    await phone.locator("#studio-v2-pocket-search").click();
    assert.equal(await phone.locator("#command-palette-overlay").isVisible(), true);
    await phone.keyboard.press("Escape");
  });
  await test("Pocket: exportación visible y descarga real", async () => {
    await tools(phone, "export");
    assert.equal(await phone.locator(".studio-v2-export-options").isVisible(), true);
    assert.equal(await phone.locator("#studio-v2-tools-back").isVisible(), true);
    const downloadPromise = phone.waitForEvent("download", { timeout: 10000 });
    await phone.locator('[data-studio-pocket-export="download-markdown"]').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.md$/);
    assert.equal(await phone.locator(".studio-v2-tools-veil").isVisible(), false);
  });
  await test("Pocket: exportación tiene retorno accesible", async () => {
    await tools(phone, "export");
    await phone.locator("#studio-v2-tools-back").click();
    assert.equal(await phone.locator(".studio-v2-tools-grid").isVisible(), true);
    await phone.keyboard.press("Escape");
    assert.equal(await phone.locator(".studio-v2-tools-veil").isVisible(), false);
  });
  await test("Pocket: modo foco regresa al editor", async () => {
    await route(phone, "home");
    await tools(phone, "focus");
    assert.equal(await getSpace(phone), "editor");
    assert.equal(await phone.locator(".workspace").getAttribute("data-focus"), "true");
    await phone.locator("#focus-exit").click();
    assert.equal(await phone.locator(".workspace").getAttribute("data-focus"), "false");
  });
  await test("Pocket: vista previa ↔ Markdown", async () => {
    await route(phone, "editor");
    await phone.locator("#studio-v2-pocket-preview").click();
    assert.equal(await getSpace(phone), "preview");
    assert.equal(await phone.locator(".preview-panel").isVisible(), true);
    await phone.locator("#studio-v2-pocket-preview").click();
    assert.equal(await getSpace(phone), "editor");
  });
  await test("Pocket: impresión accesible desde cualquier pantalla", async () => {
    await route(phone, "home");
    await phone.emulateMedia({ media: "print" });
    assert.equal(await phone.locator(".preview-panel").isVisible(), true);
    assert.equal(await phone.locator(".topbar").isVisible(), false);
    await phone.emulateMedia({ media: "screen" });
  });
  await test("Pocket: sin desbordamiento horizontal en 320px", async () => {
    await phone.setViewportSize({ width: 320, height: 740 });
    await route(phone, "home");
    const metrics = await phone.evaluate(() => ({
      width: document.documentElement.scrollWidth, viewport: window.innerWidth,
      heading: document.getElementById("studio-v2-pocket-title")?.getBoundingClientRect().right
    }));
    assert.ok(metrics.width <= metrics.viewport + 2, JSON.stringify(metrics));
  });

  await test("Pocket: fallo de almacenamiento revela estado sin guardar", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
    await context.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "mded.documents") throw new DOMException("Quota exceeded", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push("quota: " + error.message));
    await ensureReady(page);
    assert.equal(await page.locator("#save-status").getAttribute("data-state"), "error");
    assert.equal(await page.locator(".studio-v2-storage-alert").isVisible(), true);
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
    await page.locator("#studio-v2-emergency-export").click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.md$/);
    await context.close();
  });

  await test("Pocket: persistencia después de recarga", async () => {
    await phone.setViewportSize({ width: 390, height: 844 });
    await route(phone, "editor");
    await phone.locator(".cm-content").first().click();
    await phone.keyboard.press("ControlOrMeta+End");
    const token = "Audit-flow-persistence-2026";
    await phone.keyboard.insertText("\n\n" + token);
    await phone.waitForTimeout(500);
    await phone.reload({ waitUntil: "domcontentloaded" });
    await phone.locator(".cm-content").first().waitFor({ state: "attached" });
    assert.match(await readMarkdown(phone), /Audit-flow-persistence-2026/);
  });
} finally {
  await desktopContext.close();
  await phoneContext.close();
  await browser.close();
}
if (errors.length) failures.push("Uncaught browser exceptions: " + errors.join(" | "));
console.log("FLOW AUDIT " + count + " passed; " + failures.length + " failed");
if (failures.length) {
  failures.forEach((failure) => console.error("AUDIT FAIL: " + failure));
  process.exitCode = 1;
}
