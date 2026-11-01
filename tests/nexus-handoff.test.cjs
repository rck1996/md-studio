const test = require("node:test");
const assert = require("node:assert/strict");

test("NEXUS handoff keeps Markdown and rewrites only private asset references", async () => {
  const { buildNexusHandoff } = await import("../src/app/nexus-handoff.js");
  const original = "# Mi nota\n\n**Hola**\n\n![captura](mded-image:abc-123)\n\n[Visita](mded-link:link-3)\n\n[[Otra nota]]";
  const { body, imagesOmitted } = buildNexusHandoff(original,
    (kind, id) => kind === "link" && id === "link-3" ? "https://ejemplo.cl" : null);
  assert.match(body, /\*\*Hola\*\*/);
  assert.match(body, /\[Imagen no transferida: captura\]/);
  assert.match(body, /\[Visita\]\(https:\/\/ejemplo.cl\)/);
  assert.match(body, /\[\[Otra nota\]\]/);
  assert.equal(imagesOmitted, 1);
  assert.match(original, /mded-image:abc-123/); // no edits to the source
});

test("NEXUS handoff does not leak invalid stored links or copy local image IDs", async () => {
  const { buildNexusHandoff } = await import("../src/app/nexus-handoff.js");
  const { body } = buildNexusHandoff("![a](mded-image:id-42)\n[x](mded-link:unknown)", () => "javascript:alert(1)");
  assert.equal(body.includes("mded-image:"), false);
  assert.equal(body.includes("javascript:"), false);
  assert.match(body, /\[x\]\(#\)/);
});
