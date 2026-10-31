/**
 * Editorial workspace affordances.
 * Connects the new navigation to the application's existing, tested commands.
 * Never reads or writes document storage or overrides application state.
 */
const workspace = document.querySelector(".workspace");
const actionsMenu = document.querySelector(".actions-menu");
const exportButton = document.querySelector("#studio-export");
const searchButton = document.querySelector("#studio-search");
const newButton = document.querySelector("#studio-new");
const stats = document.querySelector("#document-stats");
const saveStatus = document.querySelector("#save-status");
const studioStatus = document.querySelector("#studio-live-status");
const themeColor = document.querySelector('meta[name="theme-color"]');

function activateExistingAction(id) {
  const target = document.getElementById(id);
  if (target && !target.disabled) target.click();
}

newButton?.addEventListener("click", () => activateExistingAction("new-document"));
searchButton?.addEventListener("click", () => activateExistingAction("open-search"));

exportButton?.addEventListener("click", (event) => {
  event.stopPropagation(); // existing outside-click listener would otherwise close it
  if (!actionsMenu) return;
  actionsMenu.open = !actionsMenu.open;
  exportButton.setAttribute("aria-expanded", String(actionsMenu.open));
  if (actionsMenu.open) {
    const download = actionsMenu.querySelector("#download-markdown");
    requestAnimationFrame(() => download?.focus());
  }
});

actionsMenu?.addEventListener("toggle", () => {
  exportButton?.setAttribute("aria-expanded", String(actionsMenu.open));
});

function syncWorkspaceStatus() {
  if (!studioStatus) return;
  const saved = saveStatus?.textContent?.trim() || "Listo";
  const count = stats?.textContent?.trim() || "";
  studioStatus.textContent = [saved, count].filter(Boolean).join(" · ");
}

if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver(syncWorkspaceStatus);
  if (saveStatus) observer.observe(saveStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  if (stats) observer.observe(stats, { childList: true, characterData: true, subtree: true });
  if (workspace && themeColor) {
    const themeObserver = new MutationObserver(() => {
      themeColor.content = workspace.dataset.theme === "dark" ? "#020b1b" : "#e9e4da";
    });
    themeObserver.observe(workspace, { attributes: true, attributeFilter: ["data-theme"] });
    themeColor.content = workspace.dataset.theme === "dark" ? "#020b1b" : "#e9e4da";
  }
}
syncWorkspaceStatus();
