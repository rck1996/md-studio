import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({viewport:{width:1440,height:900}});
const page = await context.newPage();
const errors=[];
page.on("pageerror", e => errors.push(e.message));
let passed=0,failed=[];
async function test(title,fn){try{await fn();passed++;console.log("PASS "+title)}catch(e){failed.push(title+": "+e.message);console.error("FAIL "+title+"\n"+e.stack)}}
try {
  await page.goto(process.env.STUDIO_BASE_URL||"http://127.0.0.1:5173",{waitUntil:"domcontentloaded"});
  await page.locator(".cm-content").first().waitFor({state:"attached"});
  await test("Grafo: más de 24 documentos siguen disponibles",async()=>{
    await page.evaluate(()=>{
      const key="mded.documents";
      const documents=JSON.parse(localStorage.getItem(key)||"[]");
      const sample=documents.find(doc=>!doc.deletedAt&&!doc.archivedAt);
      const base=documents.length;
      for(let i=0;i<36;i++){
        documents.push({...sample,id:"audit-graph-"+i,title:"QA Grafo "+i,
          markdown:"# QA Grafo "+i+"\n\nConecta [[QA Grafo "+((i+1)%36)+"]]\n",titleManual:true,
          favorite:false,history:[],createdAt:Date.now(),updatedAt:Date.now(),order:base+i,
          deletedAt:null,archivedAt:null});
      }
      localStorage.setItem(key,JSON.stringify(documents));
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#studio-v2-graph").click();
    const nodes=await page.locator("#graph-canvas .graph-node").count();
    assert.ok(nodes>24,"Expected >24 graph nodes, got "+nodes);
    assert.match(await page.locator("#graph-count").innerText(),/de \d+ documentos/);
  });
  await test("Grafo: búsqueda filtra mapa y lista",async()=>{
    const search=page.locator("#studio-graph-search");
    try {
      await search.fill("QA Grafo 35");
      const found = await page.locator("#graph-canvas .graph-node").count();
      assert.ok(found >= 1 && found <= 3, "Expected a small searchable subset, found "+found);
      assert.equal(await page.locator("#graph-document-list .graph-list-item").count(),found);
      assert.ok(await page.locator("#graph-document-list .graph-list-item").filter({hasText:"QA Grafo 35"}).count()>=1);
    } finally { await search.fill(""); }
  });
  await test("Grafo: zoom accesible y restablecible",async()=>{
    await page.locator("#studio-graph-zoom-in").click();
    assert.equal(await page.locator("#studio-graph-zoom-reset").innerText(),"125%");
    await page.locator("#studio-graph-zoom-reset").click();
    assert.equal(await page.locator("#studio-graph-zoom-reset").innerText(),"100%");
  });
  await test("Grafo: filtra relaciones directas",async()=>{
    await page.locator("#studio-graph-search").fill("");
    await page.locator("#studio-graph-focus").click();
    assert.equal(await page.locator("#studio-graph-focus").getAttribute("aria-pressed"),"true");
    const shown=await page.locator("#graph-canvas .graph-node").count();
    assert.ok(shown>=1&&shown<36,"Expected focused graph subset: "+shown);
    await page.locator("#studio-graph-focus").click();
  });
  await test("Grafo: abrir nodo lleva a editor",async()=>{
    await page.locator("#graph-document-list .graph-list-item").filter({hasText:"QA Grafo 3"}).first().click();
    assert.equal(await page.locator(".workspace").getAttribute("data-studio-space"),"editor");
    assert.match(await page.locator("#studio-active-file").innerText(),/QA Grafo 3/);
  });
}finally{
  await context.close();await browser.close();
}
if(errors.length)failed.push("Browser errors: "+errors.join(" | "));
console.log("GRAPH AUDIT: "+passed+" passed, "+failed.length+" failed");
failed.forEach(x=>console.error("GRAPH FAIL: "+x));
if(failed.length)process.exitCode=1;
