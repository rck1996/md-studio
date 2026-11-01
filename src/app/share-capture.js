/**
 * Android PWA share-target: preview external content before local persistence.
 * Handles only same-origin GET query parameters and never makes network calls.
 */
const params = new URLSearchParams(location.search);
const capture = {
  title: (params.get("share_title") || "").slice(0,180),
  text: (params.get("share_text") || "").slice(0,14000),
  url: (params.get("share_url") || "").slice(0,3000),
};
const hasCapture = Boolean(capture.title.trim() || capture.text.trim() || capture.url.trim());

if (hasCapture) {
  const overlay = document.createElement("div");
  overlay.className = "studio-share-overlay";
  overlay.innerHTML = [
    '<section class="studio-share-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-share-title">',
    '<div class="studio-share-heading"><div><span class="studio-v2-kicker">CAPTURA RÁPIDA / ANDROID</span>',
    '<h2 id="studio-share-title">Guardar en MarkEDdown</h2></div>',
    '<button type="button" id="studio-share-close" aria-label="Cancelar captura">×</button></div>',
    '<p>Recibiste contenido desde otra aplicación. Revísalo antes de guardarlo como documento local.</p>',
    '<label for="studio-share-name">Nombre del documento</label>',
    '<input id="studio-share-name" maxlength="180" type="text" />',
    '<label for="studio-share-body">Contenido</label>',
    '<textarea id="studio-share-body" rows="7" maxlength="18000"></textarea>',
    '<p class="studio-share-status" id="studio-share-status" aria-live="polite"></p>',
    '<div class="studio-share-actions"><button type="button" id="studio-share-cancel">Cancelar</button>',
    '<button type="button" id="studio-share-save">Guardar captura</button></div>',
    '</section>',
  ].join("");
  document.querySelector(".workspace")?.append(overlay);
  const byId = (id) => document.getElementById(id);
  const title = byId("studio-share-name");
  const body = byId("studio-share-body");
  const safeUrl = /^https?:\/\/\S{2,}/i.test(capture.url.trim()) ? capture.url.trim() : "";
  title.value = capture.title.trim() || (safeUrl ? "Enlace compartido" : "Nota compartida");
  body.value = [capture.text.trim(), safeUrl].filter(Boolean).join("\n\n");
  const discardParams = () => history.replaceState(null, "", location.pathname + location.hash);
  const close = () => { overlay.remove(); discardParams(); };
  byId("studio-share-close")?.addEventListener("click", close);
  byId("studio-share-cancel")?.addEventListener("click", close);
  byId("studio-share-save")?.addEventListener("click", () => {
    const text = body.value.trim();
    const name = title.value.trim() || "Nota compartida";
    if (!text && !name) return;
    // Preserve content as plain Markdown; no HTML injection or automatic
    // navigation to an external URL. The owner explicitly approves creation.
    const markdown = "# " + name.replace(/[\r\n#]+/g, " ").trim() + "\n\n" + text;
    document.dispatchEvent(new CustomEvent("markeddown:create-shared-document", {
      detail: { title: name, markdown },
    }));
    close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key !== "Tab") return;
    const items = [...overlay.querySelectorAll("input,textarea,button")];
    const first = items[0],last=items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.requestAnimationFrame(() => title.focus());
}
