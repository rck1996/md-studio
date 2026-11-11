/**
 * Portable local workspace archive. Never uploads data to a server.
 */
import JSZip from "jszip";

const FORMAT = "markeddown-workspace";
const VERSION = 1;
const MAX_ZIP = 35 * 1024 * 1024;
const MAX_JSON = 75 * 1024 * 1024;
const allowedKey = (key) => /^mded\.[a-zA-Z0-9._-]{1,110}$/.test(key)
  || key === "mdv-simple.document" || key === "markeddown.noticeDismissed";

const snapshot = () => {
  const keys = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && allowedKey(key)) keys[key] = localStorage.getItem(key);
  }
  return keys;
};

export const validateWorkspaceBackup = (data) => {
  if (!data || data.format !== FORMAT || data.version !== VERSION ||
      !data.keys || typeof data.keys !== "object" || Array.isArray(data.keys)) {
    throw new Error("Formato de respaldo no reconocido");
  }
  const entries = Object.entries(data.keys);
  if (!entries.length || entries.length > 200) throw new Error("Respaldo vacío o con demasiadas claves");
  for (const [key, value] of entries) {
    if (!allowedKey(key) || typeof value !== "string") throw new Error("Clave no válida en el respaldo");
  }
  if (data.keys["mded.documents"] !== undefined) {
    const documents = JSON.parse(data.keys["mded.documents"]);
    if (!Array.isArray(documents) || !documents.every((item) =>
      typeof item?.id === "string" && typeof item?.markdown === "string")) {
      throw new Error("Documentos dañados en el respaldo");
    }
  }
  return entries;
};

export const createWorkspaceBackup = async () => {
  const zip = new JSZip();
  zip.file("workspace.json", JSON.stringify({
    format: FORMAT, version: VERSION, createdAt: new Date().toISOString(), keys: snapshot(),
  }));
  zip.file("LEEME.txt", "MD.studio / respaldo local\nImporta desde Más > Respaldo del espacio.\nContiene documentos, carpetas, versiones e imágenes.\nNo se envía a la nube.\n");
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 5 } });
};

export const parseWorkspaceBackup = async (file) => {
  if (!file || file.size > MAX_ZIP) throw new Error("El ZIP excede 35 MB");
  const zip = await JSZip.loadAsync(file);
  const manifest = zip.file("workspace.json");
  if (!manifest) throw new Error("Falta workspace.json");
  const raw = await manifest.async("string");
  if (raw.length > MAX_JSON) throw new Error("Respaldo demasiado grande");
  const data = JSON.parse(raw);
  validateWorkspaceBackup(data);
  return data;
};

export const restoreWorkspaceBackup = (data) => {
  const incoming = validateWorkspaceBackup(data);
  const previous = snapshot();
  try {
    for (const [key, value] of incoming) localStorage.setItem(key, value);
    for (const key of Object.keys(previous)) {
      if (!Object.hasOwn(data.keys, key)) localStorage.removeItem(key);
    }
  } catch {
    let rollback = true;
    try {
      for (const key of Object.keys(snapshot())) {
        if (!Object.hasOwn(previous, key)) localStorage.removeItem(key);
      }
      for (const [key, value] of Object.entries(previous)) localStorage.setItem(key, value);
    } catch { rollback = false; }
    throw new Error(rollback
      ? "No se pudo restaurar. Se conservaron los datos anteriores."
      : "Falló la restauración y la reversión automática. Exporta el documento actual antes de salir.");
  }
};

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
};

const root = document.querySelector(".workspace");
if (root) {
  const overlay = document.createElement("div");
  overlay.className = "studio-backup-overlay";
  overlay.hidden = true;
  overlay.innerHTML = [
    '<section class="studio-backup-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-backup-title">',
    '<header class="studio-backup-heading"><div><span class="studio-v2-kicker">ARCHIVO PERSONAL / SIN NUBE</span>',
    '<h2 id="studio-backup-title">Respaldo del espacio</h2></div>',
    '<button type="button" data-backup-close aria-label="Cerrar respaldo">×</button></header>',
    '<p>Protege tus documentos, carpetas, imágenes e historial en un único ZIP. El archivo permanece en tu dispositivo.</p>',
    '<div class="studio-backup-options">',
    '<button type="button" id="studio-backup-download"><span aria-hidden="true">↓</span>',
    '<strong>Descargar respaldo completo</strong><small>Documentos, proyectos, imágenes y versiones</small></button>',
    '<button type="button" id="studio-backup-choose"><span aria-hidden="true">↑</span>',
    '<strong>Restaurar desde un ZIP</strong><small>Reemplaza los datos locales después de confirmar</small></button></div>',
    '<input type="file" id="studio-backup-file" accept=".zip,application/zip" hidden />',
    '<div class="studio-backup-review" hidden><strong id="studio-backup-file-label"></strong>',
    '<p>La restauración sustituirá todos los datos de MD.studio en este navegador. Descarga primero una copia del espacio actual.</p>',
    '<div class="studio-backup-footer"><button type="button" id="studio-backup-cancel">Cancelar</button>',
    '<button type="button" id="studio-backup-confirm">Confirmar restauración</button></div></div>',
    '<p class="studio-backup-status" id="studio-backup-status" role="status" aria-live="polite"></p>',
    '</section>',
  ].join("");
  root.appendChild(overlay);
  const byId = (id) => document.getElementById(id);
  const status = byId("studio-backup-status");
  const input = byId("studio-backup-file");
  const review = overlay.querySelector(".studio-backup-review");
  let pending = null;
  let returnFocus = null;
  const report = (message, tone = "normal") => { status.textContent = message; status.dataset.tone = tone; };
  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    pending = null;
    review.hidden = true;
    returnFocus?.focus?.();
  };
  const open = () => {
    returnFocus = document.activeElement;
    pending = null;
    review.hidden = true;
    input.value = "";
    report("");
    overlay.hidden = false;
    byId("studio-backup-download").focus();
  };
  window.addEventListener("markeddown:open-backup", open);
  overlay.querySelector("[data-backup-close]").addEventListener("click", close);
  overlay.addEventListener("pointerdown", (event) => { if (event.target === overlay) close(); });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...overlay.querySelectorAll("button:not([disabled])")].filter((el) => el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  byId("studio-backup-download").addEventListener("click", async () => {
    const button = byId("studio-backup-download");
    button.disabled = true;
    report("Preparando respaldo local…");
    try {
      const blob = await createWorkspaceBackup();
      download(blob, "markeddown-workspace-" + new Date().toISOString().slice(0, 10) + ".zip");
      report("Respaldo preparado. Guarda el ZIP en un lugar seguro.", "success");
    } catch (error) { report("Error al exportar: " + error.message, "error"); }
    finally { button.disabled = false; }
  });
  byId("studio-backup-choose").addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    pending = null;
    review.hidden = true;
    if (!input.files?.[0]) return;
    report("Verificando archivo…");
    try {
      pending = await parseWorkspaceBackup(input.files[0]);
      const count = JSON.parse(pending.keys["mded.documents"] || "[]").length;
      byId("studio-backup-file-label").textContent = input.files[0].name + " · " + count + " documentos";
      review.hidden = false;
      report("Respaldo válido. Confirma si quieres reemplazar el espacio actual.");
      byId("studio-backup-confirm").focus();
    } catch (error) { report("Archivo no válido: " + error.message, "error"); }
  });
  byId("studio-backup-cancel").addEventListener("click", () => {
    pending = null; review.hidden = true; input.value = ""; report("");
  });
  byId("studio-backup-confirm").addEventListener("click", () => {
    if (!pending) return;
    if (!window.confirm("¿Reemplazar los documentos actuales por el contenido del ZIP? Guarda una copia antes de continuar.")) return;
    try {
      restoreWorkspaceBackup(pending);
      report("Restaurado correctamente. Recargando…", "success");
      window.location.reload();
    } catch (error) { report(error.message, "error"); }
  });
}
