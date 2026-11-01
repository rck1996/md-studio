/**
 * Studio 2.2 regression: desktop wayfinding, reader, outline and linked scroll.
 * Exercises the actual compiled JS actions via a live Vite server.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
  colorScheme: "light", acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(9000);
const errors = [];
const failed = [];
let passed = 0;
page.on("pageerror", error => errors.push(error.message));
const check = async (label, run) => {
  try { await run(); passed++; console.log("PASS " + label); }
  catch (error) { failed.push(label + ": " + error.message); console.error("FAIL " + label + "\n" + error.stack); }
};
const space = () => page.locator(".workspace").getAttribute("data-studio-space");
const readMarkdown = () => page.locator("#markdown-input").inputValue();

try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".cm-content").first().waitFor({ state: "attached" });

  await check("Escritorio: destinos coherentes y seleccionados", async () => {
    const links = page.locator(".studio-v4-destinations [data-studio-destination]");
    assert.equal(await links.count(), 6);
    assert.equal(await page.locator(".studio-v4-destinations").isVisible(), true);
    await page.locator("#studio-v4-home").click();
    assert.equal(await space(), "home");
    assert.equal(await page.locator("#studio-v4-home").getAttribute("aria-current"), "page");
    await page.locator("#studio-v2-library").click();
    assert.equal(await space(), "library");
    assert.equal(await page.locator("#studio-v2-library").getAttribute("aria-current"), "page");
    await page.locator("#studio-v2-editor").click();
    assert.equal(await space(), "editor");
  });

  await check("Lectura: espacio editorial con metadatos reales", async () => {
    // Reproduce the real route used by the screenshot run: graph -> reader.
    await page.locator("#studio-v2-graph").click();
    assert.equal(await space(), "graph");
    await page.locator("#studio-v4-preview").click();
    assert.equal(await space(), "preview");
    assert.equal(await page.locator(".preview-panel").isVisible(), true);
    assert.equal(await page.locator(".studio-v4-reader-toolbar").isVisible(), true);
    const geometry = await page.evaluate(() => {
      const get = (selector) => {
        const el = document.querySelector(selector), rect = el?.getBoundingClientRect();
        return {top:rect?.top, bottom:rect?.bottom, height:rect?.height,
          display:el ? getComputedStyle(el).display : null,
          scrollHeight:el?.scrollHeight, clientHeight:el?.clientHeight};
      };
      return {viewport:innerHeight,layout:get(".layout"),pane:get(".preview-panel"),
        bar:get(".studio-v4-reader-toolbar"),paper:get("#markdown-preview"),
        heading:get("#markdown-preview h1")};
    });
    console.log("READER GEOMETRY",JSON.stringify(geometry));
    assert.ok(geometry.bar.top >= 0 && geometry.bar.bottom < geometry.viewport,JSON.stringify(geometry));
    assert.ok(geometry.paper.top >= 0 && geometry.paper.top < geometry.viewport,JSON.stringify(geometry));
    assert.match(await page.locator("#studio-v4-reader-title").innerText(), /Sol|md/i);
    assert.match(await page.locator("#studio-v4-reader-meta").innerText(), /palabras/);
    assert.equal(await page.locator("#studio-v4-preview").getAttribute("aria-current"), "page");
  });

  await check("Lectura: presentación y salida conservan documento", async () => {
    await page.locator('[data-reader-action="present"]').click();
    assert.equal(await page.locator(".workspace").getAttribute("data-presentation"), "true");
    assert.equal(await page.locator(".studio-v4-reader-toolbar").isVisible(), false);
    assert.equal(await page.locator(".studio-v4-destinations").isVisible(), false);
    await page.locator("#presentation-exit").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-presentation"), "false");
    assert.equal(await space(), "preview");
  });

  await check("Lectura: exportar usa exportador ya implementado", async () => {
    await page.locator('[data-reader-action="export"]').click();
    assert.equal(await page.locator("#studio-export-menu").isVisible(), true);
    await page.locator("#studio-export").click();
    assert.equal(await page.locator("#studio-export-menu").isVisible(), false);
  });

  await check("Lectura: editar visual y volver al código", async () => {
    await page.locator('[data-reader-action="compose"]').click();
    assert.equal(await space(), "compose");
    assert.equal(await page.locator(".studio-compose-panel").isVisible(), true);
    await page.locator('[data-compose-action="source"]').click();
    assert.equal(await space(), "editor");
  });

  await check("Inspector: títulos y métricas del documento activo", async () => {
    await page.locator("#studio-v4-inspector-toggle").click();
    assert.equal(await page.locator("#studio-v4-inspector").isVisible(), true);
    assert.equal(await page.locator("#studio-v4-inspector-toggle").getAttribute("aria-expanded"), "true");
    const count = await page.locator(".studio-v4-outline-item").count();
    assert.ok(count >= 3, "Expected document headings, found " + count);
    assert.ok(Number((await page.locator("#studio-v4-words").innerText()).replace(/\./g, "")) > 10);
    assert.ok(Number(await page.locator("#studio-v4-headings").innerText()) >= 3);
  });

  await check("Inspector: salto a encabezado vuelve al editor", async () => {
    await page.locator(".studio-v4-outline-item").nth(1).click();
    assert.equal(await space(), "editor");
    assert.equal(await page.locator("#studio-v4-inspector").isVisible(), false);
    assert.equal(await page.locator("#studio-v4-inspector-toggle").getAttribute("aria-expanded"), "false");
  });

  await check("Inspector: Escape cierra y restaura foco", async () => {
    await page.locator("#studio-v4-inspector-toggle").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#studio-v4-inspector").isVisible(), false);
    assert.equal(await page.locator("#studio-v4-inspector-toggle").evaluate(e => e === document.activeElement), true);
  });

  await check("Split: scroll vinculado opcional funciona en ambos sentidos", async () => {
    await page.locator("#studio-v2-editor").click();
    if (await page.locator(".workspace").getAttribute("data-view") !== "split") {
      await page.locator('.workspace-controls [data-view="split"]').click();
    }
    const editor = page.locator(".cm-content").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.insertText("\n\n" + Array.from({ length: 150 }, (_, index) =>
      "Párrafo de prueba " + index + ": un texto extenso para verificar el desplazamiento sincronizado de Markdown y su vista previa.").join("\n\n"));
    await page.waitForTimeout(450);
    const toggle = page.locator("#studio-v4-scroll-sync");
    if (await toggle.getAttribute("aria-pressed") !== "true") await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    await page.locator(".cm-scroller").evaluate(el => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) * .55);
      el.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => {
      const root = document.querySelector(".workspace");
      const code = document.querySelector(".cm-scroller");
      const preview = document.getElementById("markdown-preview");
      return {
        space:root.dataset.studioSpace, view:root.dataset.view,
        sync:document.getElementById("studio-v4-scroll-sync")?.getAttribute("aria-pressed"),
        editorScroll:code?.scrollTop,editorHeight:code?.scrollHeight,editorClient:code?.clientHeight,
        previewScroll:preview?.scrollTop,previewHeight:preview?.scrollHeight,previewClient:preview?.clientHeight,
      };
    });
    console.log("SPLIT DIAGNOSTICS",JSON.stringify(metrics));
    assert.ok(metrics.previewScroll > 50, "Preview should follow editor: " + JSON.stringify(metrics));
    await toggle.click();
    const before = await page.locator("#markdown-preview").evaluate(el => el.scrollTop);
    await page.locator(".cm-scroller").evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event("scroll")); });
    await page.waitForTimeout(220);
    assert.equal(await page.locator("#markdown-preview").evaluate(el => el.scrollTop), before);
  });

  await check("1024px: navegación sin desbordamiento horizontal de página", async () => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth, viewport: window.innerWidth,
      nav: document.querySelector(".studio-v4-destinations")?.scrollWidth,
    }));
    assert.ok(metrics.document <= metrics.viewport + 2, JSON.stringify(metrics));
    assert.equal(await page.locator(".studio-v4-destinations").isVisible(), true);
  });

  await check("Pocket conserva navegación inferior y oculta barra de escritorio", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(160);
    assert.equal(await page.locator(".studio-v4-destinations").isVisible(), false);
    assert.equal(await page.locator(".studio-v2-mobile-nav").isVisible(), true);
    assert.equal(await page.locator("#studio-v4-inspector").isVisible(), false);
  });

} finally {
  await context.close();
  await browser.close();
}
if (errors.length) failed.push("Uncaught JavaScript errors: " + errors.join(" | "));
console.log("STUDIO 2.2 AUDIT " + passed + " passed, " + failed.length + " failed");
for (const item of failed) console.error("STUDIO 2.2 FAIL " + item);
if (failed.length) process.exitCode = 1;
