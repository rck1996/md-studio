/**
 * Real-content Pocket smoke test: lengthy Markdown, large Android photo,
 * edit/read/navigation/reload roundtrip, and NEXUS OS share payload.
 * This complements the 1px image and synthetic clipboard regression.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const expectLocalPhoto = async () => {
  const image = page.locator("#markdown-preview img.mded-local-image").last();
  await image.waitFor({ state: "visible" });
  const result = await image.evaluate(async (img) => {
    await img.decode();
    return { width: img.naturalWidth, length: img.src.length, className: img.className };
  });
  assert.ok(result.width >= 800 && result.length > 20000, JSON.stringify(result));
  return result;
};

try {
  await page.goto(process.env.STUDIO_BASE_URL || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.locator('[data-studio-go="editor"]').click();
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  const heading = "## Auditoría real de escritura";
  const section = "\n\n" + heading + "\n\n" +
    Array.from({ length: 65 }, (_, i) => "- [ ] Paso " + i + " **importante** y [enlace](https://ejemplo.cl)").join("\n") +
    "\n\n| Campo | Valor |\n| --- | --- |\n| Uno | Dos |\n";
  await page.keyboard.insertText(section);
  await page.waitForFunction((text) => document.querySelector("#markdown-input")?.value.includes(text), heading);
  console.log("PASS long Markdown editing persists in CodeMirror");

  // Generate a deterministic noisy photo, unlike 1x1 fixture PNGs.
  const photoBytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 900;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 20261101;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      pixels.data[i] = seed & 255;
      pixels.data[i+1] = (seed >>> 8) & 255;
      pixels.data[i+2] = (seed >>> 16) & 255;
      pixels.data[i+3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "fotografia-real.png", { type: "image/png" });
    document.dispatchEvent(new CustomEvent("markeddown:insert-image-file", { detail: { file } }));
    return blob.size;
  });
  assert.ok(photoBytes > 300000, "Test needs a realistic image, not a tiny fixture");
  await page.waitForFunction(() => (document.querySelector("#markdown-input")?.value || "").includes("mded-image:"));
  await page.locator(".cm-inline-image-preview img").last().waitFor({ state: "attached" });
  console.log("PASS substantial image imported and displayed in editor", photoBytes);

  await page.locator("#studio-v2-pocket-preview").click();
  const photo = await expectLocalPhoto();
  const tableVisible = await page.locator("#markdown-preview table").count();
  assert.ok(tableVisible >= 1, "Reader displays a Markdown table");
  console.log("PASS image and table render in reader", photo.width);

  await page.locator('[data-studio-go="library"]').click();
  await page.locator('[data-studio-go="editor"]').click();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\n\nTexto posterior al cambio de pantalla.");
  await page.locator("#studio-v2-pocket-preview").click();
  assert.match(await page.locator("#markdown-preview").innerText(), /Texto posterior al cambio de pantalla/);
  await expectLocalPhoto();
  console.log("PASS editing after library navigation does not lose existing images");

  // Web Share API sends text to Android; private browser asset tokens never leave the browser.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async payload => {
      window.__lastNexusShare = payload;
    } });
  });
  await page.locator('[data-studio-go="tools"]').click();
  await page.locator('[data-studio-tool="export"]').click();
  await page.locator('[data-studio-pocket-export="send-to-nexus"]').click();
  await page.waitForFunction(() => Boolean(window.__lastNexusShare));
  const shared = await page.evaluate(() => window.__lastNexusShare);
  assert.match(shared.text, /Auditoría real de escritura/);
  assert.doesNotMatch(shared.text, /mded-image:/);
  assert.match(shared.text, /Imagen no transferida/);
  console.log("PASS NEXUS shares sanitized Markdown and warns of nonportable photos");

  // Images and document content survive reload: no delayed-save race.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-studio-go="editor"]').click();
  await page.locator("#studio-v2-pocket-preview").click();
  assert.match(await page.locator("#markdown-preview").innerText(), /Texto posterior al cambio de pantalla/);
  await expectLocalPhoto();
  console.log("PASS reader images and edited Markdown survive reload");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
