/**
 * Android share-to-MarkEDdown flow, using browser navigation the way
 * the PWA Web Share Target (GET) launches the app.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  hasTouch: true, isMobile: true,
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const exceptions = [];
let passed = 0;
const failures = [];
page.on("pageerror", (error) => exceptions.push(error.message));
const run = async (label, fn) => {
  try { await fn(); passed += 1; console.log("PASS " + label); }
  catch (error) { failures.push(label + ": " + error.message); console.error("FAIL " + label + "\n" + error.stack); }
};
const makeUrl = (data) => {
  const url = new URL(base);
  Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.href;
};
const docs = () => page.evaluate(() => JSON.parse(localStorage.getItem("mded.documents") || "[]"));
try {
  await run("PWA manifest declares Android text and URL share target", async () => {
    const manifest = await (await page.request.get(base + "/manifest.webmanifest")).json();
    assert.equal(manifest.share_target.method, "GET");
    assert.equal(manifest.share_target.action, "/");
    assert.equal(manifest.share_target.params.text, "share_text");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  });
  await run("Share Target opens an editable review before saving", async () => {
    await page.goto(makeUrl({
      share_title: "Lectura de prueba",
      share_text: "Texto compartido desde Android",
      share_url: "https://example.com/post/123",
    }), { waitUntil: "domcontentloaded" });
    await page.locator(".cm-content").first().waitFor({ state: "attached" });
    await page.locator(".studio-share-overlay").waitFor({ state: "visible" });
    assert.equal(await page.locator("#studio-share-name").inputValue(), "Lectura de prueba");
    assert.match(await page.locator("#studio-share-body").inputValue(), /example\.com\/post\/123/);
    assert.equal((await docs()).filter((doc) => doc.title === "Lectura de prueba").length, 0);
  });
  await run("Cancel keeps local documents unchanged and clears URL query", async () => {
    const count = (await docs()).length;
    await page.locator("#studio-share-cancel").click();
    assert.equal(await page.locator(".studio-share-overlay").count(), 0);
    assert.equal((await docs()).length, count);
    assert.equal(new URL(page.url()).search, "");
  });
  await run("Confirmed capture creates a real persistent Markdown document", async () => {
    await page.goto(makeUrl({
      share_title: "Nota recibida",
      share_text: "Contenido local aprobado",
      share_url: "https://example.org/referencia",
    }), { waitUntil: "domcontentloaded" });
    await page.locator(".studio-share-overlay").waitFor({ state: "visible" });
    await page.locator("#studio-share-name").fill("Captura auditada");
    await page.locator("#studio-share-save").click();
    assert.equal(await page.locator(".studio-share-overlay").count(), 0);
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"), "editor");
    assert.equal(await page.locator("#studio-active-file").innerText(), "Captura auditada");
    const content = await page.locator(".cm-content").innerText();
    assert.match(content, /Contenido local aprobado/);
    assert.match(content, /https:\/\/example\.org\/referencia/);
    const saved = (await docs()).find((doc) => doc.title === "Captura auditada");
    assert.ok(saved?.id, "Missing persisted document ID");
    assert.match(saved.markdown, /^# Captura auditada/m);
  });
  await run("Confirmed document survives reload without creating another note", async () => {
    const countBefore = (await docs()).length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".cm-content").waitFor({ state: "attached" });
    assert.match(await page.locator(".cm-content").innerText(), /Contenido local aprobado/);
    assert.equal((await docs()).length, countBefore);
  });
  await run("Reject unsafe URL schemes and retain only approved text", async () => {
    await page.goto(makeUrl({
      share_title: "URL de prueba",
      share_text: "No abrir enlaces peligrosos",
      share_url: "javascript:alert(1)",
    }), { waitUntil: "domcontentloaded" });
    await page.locator(".studio-share-overlay").waitFor({ state: "visible" });
    const capture = await page.locator("#studio-share-body").inputValue();
    assert.doesNotMatch(capture, /javascript:/i);
    assert.match(capture, /No abrir enlaces peligrosos/);
    await page.locator("#studio-share-close").click();
  });
} finally {
  await context.close();
  await browser.close();
}
if (exceptions.length) failures.push("Browser exceptions: " + exceptions.join(" | "));
console.log("SHARE TARGET AUDIT: " + passed + " passed, " + failures.length + " failed");
failures.forEach((error) => console.error("SHARE FAIL: " + error));
if (failures.length) process.exitCode = 1;
