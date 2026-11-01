/**
 * Composer block operations regression: reorder, insert and preserve raw Markdown.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({viewport:{width:1280,height:820},colorScheme:"light"});
const page = await context.newPage();
page.setDefaultTimeout(9000);
let passed=0;
const failures=[];
const browserErrors=[];
page.on("pageerror", e=>browserErrors.push(e.message));
const test = async (name,fn)=>{
  try { await fn();passed++;console.log("PASS "+name); }
  catch(error){failures.push(name+": "+error.message);console.error("FAIL "+name+"\n"+error.stack);}
};
const sourceText=()=>page.locator("#markdown-input").inputValue();
const block=(text)=>page.locator(".studio-compose-block").filter({hasText:text}).first();
try {
  await page.goto(process.env.STUDIO_BASE_URL||"http://127.0.0.1:5173",{waitUntil:"domcontentloaded"});
  await page.locator(".cm-content").first().waitFor({state:"attached"});
  await test("Editor: preparar documento con párrafos, lista y código",async()=>{
    await page.locator("#studio-v2-editor").click();
    await page.locator(".cm-content").first().click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText("# A\n\nPrimer párrafo.\n\n## B\n\nSegundo párrafo.\n\n~~~js\nconst value = 42;\n~~~\n");
    await page.waitForTimeout(370);
    const text=await sourceText();
    assert.match(text,/# A\n\nPrimer párrafo\./);
    assert.match(text,/~~~js\nconst value = 42;\n~~~/);
  });
  await test("Visual: menú de bloque incluye mover e insertar",async()=>{
    await page.locator("#studio-v2-compose").click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"),"compose");
    await block("Primer párrafo.").locator(".studio-compose-more").click();
    const menu=page.locator(".studio-compose-block-menu");
    assert.equal(await menu.isVisible(),true);
    assert.equal(await menu.getByText("Subir bloque").count(),1);
    assert.equal(await menu.getByText("Bajar bloque").count(),1);
    assert.equal(await menu.getByText("Insertar debajo").count(),1);
  });
  await test("Visual: mover párrafo tras encabezado conserva bytes del código",async()=>{
    await page.locator(".studio-compose-block-menu").getByText("Bajar bloque").click();
    const text=await sourceText();
    assert.ok(text.indexOf("## B") < text.indexOf("Primer párrafo."),text);
    assert.match(text,/~~~js\nconst value = 42;\n~~~/);
    assert.equal(await page.locator(".studio-compose-block-menu").count(),0);
  });
  await test("Visual: insertar tabla luego de un encabezado",async()=>{
    await page.locator(".studio-compose-block").first().locator(".studio-compose-more").click();
    await page.locator(".studio-compose-block-menu").getByText("Insertar debajo").click();
    assert.equal(await page.locator(".studio-compose-insert-tray").isVisible(),true);
    await page.locator('[data-compose-template="table"]').click();
    const text=await sourceText();
    assert.match(text,/\| Columna \| Detalle \|\n\| --- \| --- \|/);
    assert.ok(text.indexOf("# A") < text.indexOf("| Columna") && text.indexOf("| Columna") < text.indexOf("## B"));
  });
  await test("Visual: añadir tarea al final conserva la tabla",async()=>{
    await page.locator(".studio-compose-add-last").click();
    assert.equal(await page.locator(".studio-compose-insert-tray").isVisible(),true);
    await page.locator('[data-compose-template="task"]').click();
    const text=await sourceText();
    assert.match(text,/^- \[ \] Nueva tarea/m);
    assert.match(text,/\| Columna \| Detalle \|/);
    assert.match(text,/~~~js\nconst value = 42;\n~~~/);
  });
  await test("Visual: menús accesibles se cierran con Escape",async()=>{
    await block("Primer párrafo.").locator(".studio-compose-more").click();
    assert.equal(await page.locator(".studio-compose-block-menu").isVisible(),true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".studio-compose-block-menu").count(),0);
    await page.locator(".studio-compose-add-last").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".studio-compose-insert-tray").isVisible(),false);
  });
  await test("Visual: código avanzado conserva retorno exacto a CodeMirror",async()=>{
    await block("const value = 42").locator(".studio-compose-block-actions button").first().click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"),"editor");
    assert.match(await sourceText(),/~~~js\nconst value = 42;\n~~~/);
  });
  await test("Pocket: menú sigue operativo sin desbordamiento",async()=>{
    await page.setViewportSize({width:390,height:844});
    await page.locator("#studio-v2-pocket-compose").click();
    await block("Primer párrafo.").locator(".studio-compose-more").click();
    assert.equal(await page.locator(".studio-compose-block-menu").isVisible(),true);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=window.innerWidth+2,"Horizontal overflow "+width);
  });
} finally {
  await context.close();
  await browser.close();
}
if(browserErrors.length)failures.push("Browser exceptions: "+browserErrors.join(" | "));
console.log("BLOCK ACTIONS AUDIT: "+passed+" passed, "+failures.length+" failed");
for(const item of failures)console.error("BLOCK AUDIT FAIL: "+item);
if(failures.length)process.exitCode=1;
