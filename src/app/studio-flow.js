/**
 * RCK1996 Studio affordances for markEDdown.
 *
 * The UI delegates to the existing commands. This module does not own
 * documents, mutate localStorage, or implement another export engine.
 */
const workspace = document.querySelector(".workspace");
const actionsMenu = document.querySelector(".actions-menu");
const exportButton = document.querySelector("#studio-export");
const exportMenu = document.querySelector("#studio-export-menu");
const searchButton = document.querySelector("#studio-search");
const newButton = document.querySelector("#studio-new");
const stats = document.querySelector("#document-stats");
const saveStatus = document.querySelector("#save-status");
const studioStatus = document.querySelector("#studio-live-status");
const themeColor = document.querySelector('meta[name="theme-color"]');

function activateExistingAction(id) {
  const button = document.getElementById(id);
  if (!button || button.disabled) return false;
  button.click();
  return true;
}

function setExportOpen(open) {
  if (!exportMenu || !exportButton) return;
  exportMenu.hidden = !open;
  exportButton.setAttribute("aria-expanded", String(open));
}

newButton?.addEventListener("click", () => activateExistingAction("new-document"));
searchButton?.addEventListener("click", () => activateExistingAction("open-search"));

exportButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!exportMenu) return;
  const opening = exportMenu.hidden;
  if (opening && actionsMenu) actionsMenu.open = false;
  setExportOpen(opening);
  if (opening) requestAnimationFrame(() => exportMenu.querySelector("button")?.focus());
});

exportMenu?.querySelectorAll("[data-studio-export-action]").forEach((button) => {
  button.addEventListener("click", () => {
    setExportOpen(false);
    const action = button.dataset.studioExportAction;
    if (action) activateExistingAction(action);
    exportButton?.focus();
  });
});

document.addEventListener("click", (event) => {
  if (!exportMenu || exportMenu.hidden) return;
  if (!exportButton?.contains(event.target) && !exportMenu.contains(event.target)) {
    setExportOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !exportMenu || exportMenu.hidden) return;
  event.preventDefault();
  setExportOpen(false);
  exportButton?.focus();
});

actionsMenu?.addEventListener("toggle", () => {
  if (actionsMenu.open) setExportOpen(false);
});

function syncWorkspaceStatus() {
  if (!studioStatus) return;
  const saved = saveStatus?.textContent?.trim() || "Listo";
  const count = stats?.textContent?.trim() || "";
  studioStatus.textContent = [saved, count].filter(Boolean).join(" · ");
  studioStatus.dataset.state = saveStatus?.dataset.state || "saved";
}

if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver(syncWorkspaceStatus);
  if (saveStatus) {
    observer.observe(saveStatus, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }
  if (stats) {
    observer.observe(stats, { childList: true, characterData: true, subtree: true });
  }
  if (workspace && themeColor) {
    const themeObserver = new MutationObserver(() => {
      themeColor.content = workspace.dataset.theme === "dark" ? "#020b1b" : "#e9e4da";
    });
    themeObserver.observe(workspace, { attributes: true, attributeFilter: ["data-theme"] });
    themeColor.content = workspace.dataset.theme === "dark" ? "#020b1b" : "#e9e4da";
  }
}
syncWorkspaceStatus();
