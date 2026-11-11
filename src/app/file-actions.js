const setButtonCopiedState = (button) => {
  const previous = button.textContent;
  button.textContent = "Copiado";
  setTimeout(() => {
    button.textContent = previous;
  }, 900);
};

export const copyTextWithFeedback = async ({ value, button }) => {
  await navigator.clipboard.writeText(value);
  setButtonCopiedState(button);
};

export const downloadFile = ({ filename, content, type }) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Mobile browsers may start consuming the blob only after the click task.
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
};

export const exportAssetsArchive = async ({ entries, filename = "markeddown-assets.zip" }) => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  entries.forEach(({ id, dataUrl, name }) => {
    if (!dataUrl) return;
    const [, mime = "image/png", data = ""] = dataUrl.match(/^data:([^;]+);base64,(.+)$/) || [];
    const extension = mime.split("/")[1] || "png";
    zip.file(`${name || id}.${extension}`, data, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  downloadFile({ filename, content: blob, type: "application/zip" });
};

export const bindFileActionButtons = ({
  copyMarkdownButton,
  copyHtmlButton,
  copyConfluenceButton,
  downloadMarkdownButton,
  exportHtmlButton,
  exportAssetsButton,
  getMarkdown,
  getPreviewHtml,
  getExportHtml,
  getAssetEntries,
  expandMarkdownTokens,
  slugify,
  onComplete,
}) => {
  const runAction = async (action, successMessage, errorMessage) => {
    try {
      await action();
      onComplete?.({ message: successMessage, tone: "success" });
    } catch (error) {
      console.error(error);
      onComplete?.({ message: errorMessage, tone: "error" });
    }
  };

  copyMarkdownButton.addEventListener("click", () =>
    runAction(
      () => copyTextWithFeedback({ value: expandMarkdownTokens(getMarkdown()), button: copyMarkdownButton }),
      "Markdown copiado",
      "No se pudo copiar Markdown",
    ),
  );

  copyHtmlButton.addEventListener("click", () =>
    runAction(
      () => copyTextWithFeedback({ value: getPreviewHtml(), button: copyHtmlButton }),
      "HTML copiado",
      "No se pudo copiar HTML",
    ),
  );

  copyConfluenceButton.addEventListener("click", () =>
    runAction(
      () => copyTextWithFeedback({ value: getPreviewHtml(), button: copyConfluenceButton }),
      "Contenido para Confluence copiado",
      "No se pudo copiar para Confluence",
    ),
  );

  downloadMarkdownButton.addEventListener("click", () =>
    runAction(() => {
      const title = slugify(getMarkdown().match(/^#\s+(.+)$/m)?.[1] || "documento") || "documento";
      downloadFile({
        filename: `${title}.md`,
        content: expandMarkdownTokens(getMarkdown()),
        type: "text/markdown;charset=utf-8",
      });
    }, "Markdown descargado", "No se pudo descargar Markdown"),
  );

  exportHtmlButton.addEventListener("click", () =>
    runAction(() => {
      const title = getMarkdown().match(/^#\s+(.+)$/m)?.[1] || "MD.studio";
      downloadFile({
        filename: `${slugify(title)}.html`,
        content: getExportHtml(title),
        type: "text/html;charset=utf-8",
      });
    }, "HTML exportado", "No se pudo exportar HTML"),
  );

  exportAssetsButton.addEventListener("click", () =>
    runAction(
      () => exportAssetsArchive({ entries: getAssetEntries() }),
      "Assets exportados",
      "No se pudieron exportar los assets",
    ),
  );
};
