/**
 * Second-pass audit: project/document lifecycle + command palette + restoration.
 * Uses a fresh, isolated browser storage profile.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  deviceScaleFactor: 2, acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(7000); // Fail fast and report all broken journeys.
page.setDefaultNavigationTimeout(15000);
const errors = [];
const failures = [];
let passed = 0;
page.on("pageerror", (error) => errors.push(error.message));
const sleep = (ms = 350) => page.waitForTimeout(ms);
const space = () => page.locator(".workspace").getAttribute("data-studio-space");
const go = async (dest) => {
  await page.locator('[data-studio-go="' + dest + '"]').click();
  assert.equal(await space(), dest);
};
const row = (title) => page.locator("#document-list .document-row").filter({ hasText: title }).first();
const doMenu = async (title, action) => {
  const item = row(title);
  await item.locator("summary").click();
  await item.locator(".document-menu-content button", { hasText: action }).first().click();
};
const tools = async (action) => {
  await page.locator('[data-studio-go="tools"]').click();
  await page.locator('.studio-v2-tools-veil:not([hidden]) [data-studio-tool="' + action + '"]').click();
};
const run = async (label, fn) => {
  try { await fn(); passed++; console.log("PASS "+label); }
  catch (e) { failures.push(label+": "+e.message); console.error("FAIL "+label+"\n"+e.stack); }
};
const palette = async (query, text) => {
  await page.locator("#studio-v2-pocket-search").click();
  await page.locator("#command-palette-input").fill(query);
  const opt = page.locator("#command-palette-results [role=option]").filter({ hasText: text }).first();
  await opt.click();
};

try {
  await page.goto(process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173", {waitUntil:"domcontentloaded"});
  await page.locator(".cm-content").waitFor({state:"attached"});

  await run("Búsqueda global abre archivo y actualiza ruta", async () => {
    await go("home");
    await palette("README.md", "README.md");
    assert.equal(await space(), "editor");
    assert.match(await page.locator("#studio-active-file").innerText(), /README\.md/);
  });
  await run("Paleta: cambiar a Vista previa desde Inicio", async () => {
    await go("home");
    await palette("Cambiar a Vista previa", "Cambiar a Vista previa");
    assert.equal(await space(), "preview");
    assert.equal(await page.locator(".preview-panel").isVisible(), true);
  });
  await run("Paleta: atajo a favoritos abre biblioteca", async () => {
    await go("home");
    await palette("Ver favoritos", "Ver favoritos");
    assert.equal(await space(), "library");
    assert.equal(await page.locator('#documents-panel [data-explorer-filter="favorites"]').first().getAttribute("aria-pressed"), "true");
  });
  await run("Paleta: nueva carpeta dirige a biblioteca", async () => {
    await go("library");
    await page.locator('#documents-panel [data-explorer-filter="all"]').first().click();
    await page.evaluate(() => { window.prompt = () => "QA_Project_Audit"; });
    await go("home");
    await palette("Crear carpeta", "Crear carpeta");
    assert.equal(await space(), "library");
    assert.ok(await page.locator(".folder-label").filter({ hasText: "QA_Project_Audit" }).count() >= 1);
  });
  await run("Duplicar conserva documento y abre editor", async () => {
    await page.locator('#documents-panel [data-explorer-filter="all"]').first().click();
    const sourceRow = page.locator("#document-list .document-row").first();
    const original = await sourceRow.locator(".document-title").innerText();
    await doMenu(original, "Duplicar");
    assert.equal(await space(), "editor");
    assert.match(await page.locator("#studio-active-file").innerText(), /copia/);
    const docs = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents") || "[]"));
    assert.ok(docs.some((doc) => doc.title === original + " copia"));
  });

  // Subsequent CRUD tests always locate the copy by its uniquely modified title.
  await run("Renombrar desde biblioteca", async () => {
    await go("library");
    const copiedRow = page.locator("#document-list .document-row").filter({ hasText: "copia" }).first();
    await copiedRow.locator("summary").click();
    await copiedRow.locator(".document-menu-content button", { hasText: "Renombrar" }).click();
    const input = page.locator("#document-list .inline-rename input").first();
    await input.fill("QA_Renamed_Document");
    await page.locator("#document-list .inline-rename button[type=submit]").first().click();
    assert.ok(await row("QA_Renamed_Document").count() >= 1);
  });
  await run("Marcar favorito y filtrar", async () => {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents")||"[]")
      .find(d=>d.title==="QA_Renamed_Document")?.favorite);
    if (before) await doMenu("QA_Renamed_Document", "Quitar de favoritos");
    await doMenu("QA_Renamed_Document", "Marcar favorito");
    await page.locator('#documents-panel [data-explorer-filter="favorites"]').first().click();
    assert.ok(await row("QA_Renamed_Document").count() >= 1);
    await page.locator('#documents-panel [data-explorer-filter="all"]').first().click();
  });
  await run("Mover documento a carpeta", async () => {
    await doMenu("QA_Renamed_Document", "QA_Project_Audit");
    const folderId = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.folders")||"[]").find(f=>f.name==="QA_Project_Audit")?.id);
    const moved = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents")||"[]").find(d=>d.title==="QA_Renamed_Document"));
    assert.equal(moved?.folderId, folderId);
  });
  await run("Archivar y abrir restaura documento", async () => {
    await doMenu("QA_Renamed_Document", "Archivar");
    const archived = page.locator(".archive-group .trash-row").filter({ hasText:"QA_Renamed_Document" });
    assert.equal(await archived.count(),1);
    await archived.getByRole("button", { name:"Abrir", exact:true }).click();
    assert.equal(await space(), "editor");
    const doc = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents")||"[]").find(d=>d.title==="QA_Renamed_Document"));
    assert.equal(doc?.archivedAt,null);
  });
  await run("Archivar y restaurar sin abrir", async () => {
    await go("library");
    await doMenu("QA_Renamed_Document","Archivar");
    await page.locator(".archive-group .trash-row").filter({hasText:"QA_Renamed_Document"})
      .getByRole("button",{name:"Restaurar", exact:true}).click();
    assert.ok(await row("QA_Renamed_Document").count() >= 1);
  });
  await run("Eliminar y recuperar desde papelera", async () => {
    await doMenu("QA_Renamed_Document","Eliminar");
    assert.equal(await row("QA_Renamed_Document").count(),0);
    const trash = page.locator(".trash-group:not(.archive-group) .trash-row").filter({hasText:"QA_Renamed_Document"});
    assert.equal(await trash.count(),1);
    await trash.getByRole("button",{name:"Restaurar",exact:true}).click();
    assert.ok(await row("QA_Renamed_Document").count() >= 1);
  });
  await run("Historial restaura contenido anterior", async () => {
    await row("QA_Renamed_Document").locator(".document-item").click();
    assert.equal(await space(),"editor");
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.insertText("\n\n## Audit_Transient_Heading");
    await sleep(500);
    assert.match(await page.locator(".cm-content").innerText(), /Audit_Transient_Heading/);
    await tools("history");
    await page.locator("#history-list .history-item").last().click();
    const preview = await page.locator("#history-preview .history-preview-code").innerText();
    assert.doesNotMatch(preview,/Audit_Transient_Heading/);
    await page.locator("#history-preview button", {hasText:"Restaurar"}).click();
    await page.locator("#close-history").click();
    assert.doesNotMatch(await page.locator(".cm-content").innerText(), /Audit_Transient_Heading/);
  });
  await run("Exportar HTML real", async () => {
    await tools("export");
    const nextDownload = page.waitForEvent("download",{timeout:10000});
    await page.locator('[data-studio-pocket-export="export-html"]').click();
    const downloaded = await nextDownload;
    assert.match(downloaded.suggestedFilename(),/\.html$/);
  });
  await run("Exportar ZIP real", async () => {
    await tools("export");
    const nextDownload = page.waitForEvent("download",{timeout:10000});
    await page.locator('[data-studio-pocket-export="export-assets"]').click();
    const downloaded = await nextDownload;
    assert.match(downloaded.suggestedFilename(),/\.zip$/);
  });
  await run("UI y documento sobreviven a recarga", async () => {
    const docsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents")||"[]"));
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".cm-content").waitFor({state:"attached"});
    const docsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents")||"[]"));
    assert.equal(docsAfter.length,docsBefore.length);
    assert.ok(docsAfter.some(d=>d.title==="QA_Renamed_Document"&&!d.deletedAt&&!d.archivedAt));
  });
} finally {
  await context.close();
  await browser.close();
}
if(errors.length) failures.push("Browser exceptions: "+errors.join(" | "));
console.log("CRUD AUDIT: "+passed+" passed, "+failures.length+" failed");
for(const problem of failures)console.error("CRUD FAIL: "+problem);
if(failures.length)process.exitCode=1;
