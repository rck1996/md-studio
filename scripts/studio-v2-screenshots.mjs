import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173";
const destination = "artifacts/studio-v2";
await mkdir(destination, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrorCapture = (page, label) =>
  page.on("pageerror", (error) => errors.push(label + ": " + error.message));

const waitForApp = async (page) => {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("#editor-host .cm-editor").waitFor({ state: "attached", timeout: 20000 });
  await page.locator(".workspace.studio-v2").waitFor({ state: "attached" });
};

const capture = async (page, name) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: destination + "/" + name + ".png", animations: "disabled" });
  console.log("Captured " + name);
};

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light"
  });
  const desktop = await desktopContext.newPage();
  attachErrorCapture(desktop, "desktop");
  await waitForApp(desktop);
  assert.equal(await desktop.locator(".workspace").getAttribute("data-studio-space"), "editor");
  await desktop.evaluate(() => {
    if (document.querySelector(".workspace")?.dataset.theme !== "light") document.getElementById("theme-toggle")?.click();
  });
  assert.equal(await desktop.locator(".workspace").getAttribute("data-theme"), "light");
  await capture(desktop, "desktop-01-editor-light");

  await desktop.locator("#side-tab-home").click();
  assert.equal(await desktop.locator(".workspace").getAttribute("data-studio-space"), "home");
  await capture(desktop, "desktop-02-dashboard");

  await desktop.locator("#studio-v2-library").click();
  assert.equal(await desktop.locator(".workspace").getAttribute("data-studio-space"), "library");
  await capture(desktop, "desktop-03-library");

  await desktop.locator("#studio-v2-graph").click();
  assert.equal(await desktop.locator(".workspace").getAttribute("data-studio-space"), "graph");
  await capture(desktop, "desktop-04-graph");

  await desktop.locator("#studio-v2-editor").click();
  await desktop.evaluate(() => {
    if (document.querySelector(".workspace")?.dataset.theme !== "dark") document.getElementById("theme-toggle")?.click();
  });
  assert.equal(await desktop.locator(".workspace").getAttribute("data-theme"), "dark");
  await capture(desktop, "desktop-05-editor-dark");
  await desktop.locator("#studio-v2-compose").click();
  await capture(desktop, "desktop-06-visual-composition");
  await desktop.locator("#studio-v2-backup").click();
  await capture(desktop, "desktop-07-workspace-backup");
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light"
  });
  const mobile = await mobileContext.newPage();
  attachErrorCapture(mobile, "mobile");
  await waitForApp(mobile);
  assert.equal(await mobile.locator(".workspace").getAttribute("data-studio-space"), "home");
  await mobile.evaluate(() => {
    if (document.querySelector(".workspace")?.dataset.theme !== "light") document.getElementById("theme-toggle")?.click();
  });
  const heroInfo = await mobile.evaluate(() => {
    const hero = document.querySelector(".studio-v2-home-hero");
    const parent = hero?.parentElement;
    return { exists: Boolean(hero), display: hero ? getComputedStyle(hero).display : null,
      rectHeight: hero?.getBoundingClientRect().height || 0, parentHeight: parent?.getBoundingClientRect().height || 0,
      parentScrollTop: parent?.scrollTop || 0, parentScrollHeight: parent?.scrollHeight || 0 };
  });
  console.log("Pocket hero diagnostics", JSON.stringify(heroInfo));
  await capture(mobile, "pocket-01-home");
  await mobile.locator("#studio-v2-pocket-search").click();
  await capture(mobile, "pocket-10-global-search");
  await mobile.keyboard.press("Escape");

  await mobile.locator('[data-studio-go="library"]').click();
  assert.equal(await mobile.locator(".workspace").getAttribute("data-studio-space"), "library");
  await capture(mobile, "pocket-02-documents");

  await mobile.locator('[data-studio-go="editor"]').click();
  assert.equal(await mobile.locator(".workspace").getAttribute("data-studio-space"), "editor");
  await capture(mobile, "pocket-03-markdown-editor");
  await mobile.locator("#studio-v2-pocket-compose").click();
  await capture(mobile, "pocket-11-visual-composition");
  await mobile.locator("#studio-v2-pocket-compose").click();

  // A real editor mutation, not a mock screen. It must survive reload.
  const cm = mobile.locator(".cm-content").first();
  await cm.click();
  await mobile.keyboard.press("ControlOrMeta+End");
  await mobile.keyboard.insertText("\n\n## Pocket QA\n\nEdición desde el navegador móvil.");
  await mobile.waitForTimeout(700);
  assert.match(await mobile.locator(".cm-content").innerText(), /Pocket QA/);
  await capture(mobile, "pocket-04-editor-changed");

  await mobile.locator("#studio-v2-pocket-preview").click();
  assert.equal(await mobile.locator(".workspace").getAttribute("data-studio-space"), "preview");
  await mobile.locator("#markdown-preview").getByText("Pocket QA").waitFor();
  await capture(mobile, "pocket-05-reading-preview");

  await mobile.locator('[data-studio-go="tools"]').click();
  await mobile.locator('.studio-v2-tools-veil:not([hidden])').waitFor();
  await capture(mobile, "pocket-06-tools-sheet");
  await mobile.locator('[data-studio-tool="export"]').click();
  await capture(mobile, "pocket-09-export-options");
  await mobile.locator("#studio-v2-tools-back").click();
  await mobile.locator('[data-studio-tool="outline"]').click();
  await capture(mobile, "pocket-07-outline");
  await mobile.locator('[data-studio-go="tools"]').click();
  await mobile.locator('[data-studio-tool="backup"]').click();
  await capture(mobile, "pocket-12-workspace-backup");
  await mobile.locator("[data-backup-close]").click();

  await mobile.evaluate(() => {
    if (document.querySelector(".workspace")?.dataset.theme !== "dark") document.getElementById("theme-toggle")?.click();
  });
  await mobile.locator('[data-studio-go="home"]').click();
  await capture(mobile, "pocket-08-home-dark");

  await mobile.reload({ waitUntil: "domcontentloaded" });
  await mobile.locator("#editor-host .cm-editor").waitFor({ state: "attached" });
  const persisted = await mobile.locator(".cm-content").innerText();
  assert.match(persisted, /Pocket QA/, "local document should persist after reload");
  console.log("PASS: Pocket edit and local persistence.");
  await mobile.goto(base + "/?share_title=" + encodeURIComponent("Artículo compartido") +
    "&share_text=" + encodeURIComponent("Una idea que quiero guardar y conectar en mi biblioteca.") +
    "&share_url=" + encodeURIComponent("https://example.com/lectura"), { waitUntil: "domcontentloaded" });
  await mobile.locator(".studio-share-overlay").waitFor({ state: "visible" });
  await capture(mobile, "pocket-13-share-capture");
  await mobile.locator("#studio-share-cancel").click();
  await mobileContext.close();
} finally {
  await browser.close();
}
if (errors.length) {
  console.error("Browser errors:\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS: No uncaught browser exceptions.");
}
