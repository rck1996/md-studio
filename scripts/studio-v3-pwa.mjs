/**
 * Production-only offline smoke test: Vite preview, never dev transforms.
 * Ensures a previously visited local-first workspace opens without network.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const url = process.env.STUDIO_PWA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true,
  hasTouch: true, deviceScaleFactor: 2, serviceWorkers: "allow" });
const page = await context.newPage();
const errors = [];
const requestsFailed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) => requestsFailed.push(r.url() + " :: " + r.failure()?.errorText));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
try {
  await page.goto(url, { waitUntil: "load" });
  await page.locator(".workspace.studio-v2").waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 25000 });
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    if (!keys.some((key) => key.startsWith("markeddown-shell-v3-"))) return false;
    const cached = await caches.match("/");
    if (!cached) return false;
    const html = await cached.clone().text();
    const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
    return scripts.length > 0 && (await Promise.all(scripts.map((path) => caches.match(path)))).every(Boolean);
  }, null, { timeout: 25000 });
  console.log("PASS: PWA shell and Vite entry bundles cached");

  // The optional online module chunks are requested before disabling network.
  await page.locator('#studio-v2-pocket-compose').click();
  await page.locator(".studio-compose-panel").waitFor({ state:"visible" });
  await page.locator('[data-studio-go="editor"]').click();
  await context.setOffline(true);
  await page.reload({ waitUntil:"domcontentloaded", timeout:20000 });
  try {
    await page.locator(".cm-content").first().waitFor({ state:"attached", timeout:15000 });
  } catch (error) {
    const diag = await page.evaluate(async () => ({
      url:location.href,
      body:document.body.innerText.slice(0,350),
      scripts:[...document.scripts].map(x=>x.src),
      cacheKeys:await caches.keys(),
      cacheAssets:(await (await caches.open((await caches.keys()).find(k=>k.startsWith("markeddown-shell-"))||"bad")).keys()).map(x=>x.url.slice(x.url.lastIndexOf("/") + 1)),
    }));
    console.error("OFFLINE DIAGNOSTICS",JSON.stringify({diag,requestsFailed,errors}));
    throw error;
  }
  assert.equal(await page.locator(".workspace.studio-v2").count(),1);
  await page.locator("#studio-v2-pocket-compose").click();
  assert.equal(await page.locator(".studio-compose-panel").isVisible(),true);
  console.log("PASS: Offline reload restores CodeMirror and visual composition");
  const cm = page.locator(".cm-content").first();
  await page.locator('[data-studio-go="editor"]').click();
  await cm.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\n\n## Nota offline QA");
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator(".cm-content").first().waitFor({ state:"attached", timeout:15000 });
  assert.match(await page.locator(".cm-content").first().innerText(), /Nota offline QA/);
  console.log("PASS: Offline text edit persists after reload");
} finally {
  await context.close();
  await browser.close();
}
if (errors.length) {
  console.error("Offline browser exceptions:", errors.join(" | "));
  process.exitCode = 1;
}
