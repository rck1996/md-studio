/* Progressive enhancement: installation is optional, and never gates the editor. */
const installable = "serviceWorker" in navigator && window.isSecureContext;
if (installable) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const warmResources = () => {
        const urls = performance.getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => {
            try { return new URL(url).origin === location.origin && new URL(url).pathname.startsWith("/assets/"); }
            catch { return false; }
          });
        navigator.serviceWorker.controller?.postMessage({ type: "MARKEDDOWN_CACHE_RESOURCES", urls });
      };
      warmResources();
      navigator.serviceWorker.addEventListener("controllerchange", warmResources, { once: true });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "activated") warmResources();
        });
      });
    } catch (error) {
      console.warn("MarkEDdown: offline shell could not be registered", error);
    }
  });
}

let deferredInstall = null;
const installButtons = () => [...document.querySelectorAll("[data-studio-install]")];
const refreshInstallButtons = () => {
  installButtons().forEach((button) => { button.hidden = !deferredInstall; });
};
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
  refreshInstallButtons();
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-studio-install]");
  if (!target || !deferredInstall) return;
  const prompt = deferredInstall;
  deferredInstall = null;
  refreshInstallButtons();
  try { await prompt.prompt(); await prompt.userChoice; }
  catch (error) { console.warn("MarkEDdown: installation declined/unavailable", error); }
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  refreshInstallButtons();
});
refreshInstallButtons();
