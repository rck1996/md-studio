/**
 * Pocket regression: software keyboard, image picker, clipboard read and paste.
 * Run against the live local Vite instance with Playwright installed.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7wAAAABJRU5ErkJggg==", "base64");
const imageCount = () => page.evaluate(() =>
  Object.keys(JSON.parse(localStorage.getItem("mded.images") || "{}")).length);
const waitForImages = (expected) => page.waitForFunction((n) =>
  Object.keys(JSON.parse(localStorage.getItem("mded.images") || "{}")).length >= n,
  expected);

try {
  await page.goto(process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.locator('[data-studio-go="editor"]').click();
  await page.locator(".cm-content").click();

  // Simulate Chrome Android visual viewport shrinking under an on-screen IME.
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) throw new Error("VisualViewport API is required");
    Object.defineProperty(viewport, "height", {
      configurable: true,
      get: () => window.innerHeight - 300,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(() => document.querySelector(".workspace")?.dataset.studioKeyboard === "true");
  await page.keyboard.insertText("\n".repeat(35) + "Última línea visible");
  await page.waitForTimeout(200);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector(".workspace").getBoundingClientRect();
    const caret = document.querySelector(".cm-cursor-primary")?.getBoundingClientRect();
    const rail = document.querySelector(".studio-v2-keyboard-bar").getBoundingClientRect();
    return { rootHeight: root.height, visibleBottom: window.visualViewport.height +
      window.visualViewport.offsetTop, caretBottom: caret?.bottom, railTop: rail.top };
  });
  assert.ok(Math.abs(geometry.rootHeight - geometry.visibleBottom) < 35, JSON.stringify(geometry));
  assert.ok(geometry.caretBottom <= geometry.railTop + 2, JSON.stringify(geometry));
  console.log("PASS Pocket caret stays above IME rail", geometry);

  // Image toolbar should launch the native file picker instead of inserting a URL placeholder.
  const initial = await imageCount();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.locator('[data-pocket-image="gallery"]').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "galeria.png", mimeType: "image/png", buffer: png });
  await waitForImages(initial + 1);
  assert.match(await page.locator("#markdown-input").inputValue(), /mded-image:/);
  const inlinePhoto = page.locator(".cm-inline-image-preview img").first();
  await inlinePhoto.waitFor({ state: "visible" });
  const inlinePhotoDimensions = await inlinePhoto.evaluate(async (img) => {
    await img.decode();
    const rect = img.getBoundingClientRect();
    return { width: img.naturalWidth, height: img.naturalHeight, renderedWidth: rect.width };
  });
  assert.ok(inlinePhotoDimensions.width > 0 && inlinePhotoDimensions.renderedWidth > 0,
    JSON.stringify(inlinePhotoDimensions));
  assert.equal(await page.locator(".cm-inline-token-image").count(), 0,
    "A stored image must render as a thumbnail, not only a token label");
  console.log("PASS Pocket gallery image displays a real preview in CodeMirror");

  // Reader must show the same image at full width without altering the source.
  await page.locator("#studio-v2-pocket-preview").click();
  const readerPhoto = page.locator("#markdown-preview img.mded-local-image").first();
  await readerPhoto.waitFor({ state: "visible" });
  const readerImage = await readerPhoto.evaluate(async (img) => {
    await img.decode();
    return { width: img.naturalWidth, source: img.getAttribute("src") };
  });
  assert.ok(readerImage.width > 0, "Reader displays a decoded image");
  assert.match(readerImage.source, /^data:image\/(?:png|jpe?g|webp|gif);base64,/);
  assert.ok(readerImage.source.length > 100, "Reader contains the real saved image, not a placeholder");
  await page.locator("#studio-v2-pocket-preview").click();
  console.log("PASS Pocket reader hydrates the stored image after Markdown parsing");

  // Android image clipboard can be read explicitly even if Gboard omits the paste event.
  await page.evaluate(() => {
    const raw = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7wAAAABJRU5ErkJggg=="),
      (char) => char.charCodeAt(0));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      read: async () => [{ types: ["image/png"], getType: async () => new Blob([raw], { type: "image/png" }) }],
    } });
  });
  await page.locator('[data-pocket-image="clipboard"]').click();
  await waitForImages(initial + 2);
  console.log("PASS Pocket clipboard image inserted");

  // Native paste handler must also accept image data in clipboardData.items.
  await page.locator(".cm-content").click();
  await page.evaluate((bytes) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], "pegada.png", { type: "image/png" }));
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data });
    document.querySelector(".cm-content").dispatchEvent(event);
  }, [...png]);
  await waitForImages(initial + 3);
  console.log("PASS Native image paste inserted");

  // Samsung Keyboard / Android IMEs may deliver a rich paste as beforeinput,
  // without a ClipboardEvent.
  await page.locator(".cm-content").click();
  await page.evaluate((bytes) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], "teclado.png", { type: "image/png" }));
    const event = new InputEvent("beforeinput", {
      bubbles: true, cancelable: true, inputType: "insertFromPaste", dataTransfer: data,
    });
    document.querySelector(".cm-content").dispatchEvent(event);
  }, [...png]);
  await waitForImages(initial + 4);
  console.log("PASS Android IME image beforeinput inserted");

  await page.locator(".cm-content").click();
  await page.evaluate((encoded) => {
    const data = new DataTransfer();
    data.setData("text/html", '<img src="data:image/png;base64,' + encoded + '">');
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data });
    document.querySelector(".cm-content").dispatchEvent(event);
  }, png.toString("base64"));
  await waitForImages(initial + 5);
  console.log("PASS HTML clipboard image inserted");

  // Persistence: both stored assets and their Markdown references survive reload.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-studio-go="editor"]').click();
  await page.locator("#studio-v2-pocket-preview").click();
  await page.locator("#markdown-preview img.mded-local-image").first().waitFor();
  assert.ok(await page.locator("#markdown-preview img.mded-local-image").first()
    .evaluate(async (img) => { await img.decode(); return img.naturalWidth > 0; }));
  console.log("PASS Reader image survives reload");

  assert.deepEqual(errors, [], "No browser runtime errors");
} finally {
  await browser.close();
}
