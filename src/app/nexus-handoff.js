import { downloadFile } from "./file-actions.js";

// Markdown can refer to images stored only in this browser. Send a readable
// placeholder in the copy while leaving the source document and its assets intact.
export const buildNexusHandoff = (markdown, readToken = () => null) => {
  let imagesOmitted = 0;
  const body = String(markdown || "")
    .replace(/!\[([^\]]*)\]\(mded-image:([a-z0-9-]+)\)/gi, (_match, alt) => {
      imagesOmitted += 1;
      return `[Imagen no transferida: ${alt.trim() || "imagen"}]`;
    })
    .replace(/mded-link:([a-z0-9-]+)/gi, (_match, id) => {
      const url = readToken("link", id);
      return typeof url === "string" && /^(https?:\/\/|mailto:|tel:|#)/i.test(url) ? url : "#";
    });
  return { body, imagesOmitted };
};

export const sendToNexus = async ({ markdown, title, readToken, slugify }) => {
  const cleanTitle = String(title || "Documento").trim().slice(0, 180) || "Documento";
  const { body, imagesOmitted } = buildNexusHandoff(markdown, readToken);
  if (!body.trim()) throw new Error("No hay contenido para enviar.");

  // Call Web Share before yielding so Android still sees the originating user
  // gesture. Android receives this as ACTION_SEND/EXTRA_TEXT.
  if (typeof navigator.share === "function" && body.length <= 60_000) {
    try {
      await navigator.share({ title: cleanTitle, text: body });
      return { status: "shared", imagesOmitted };
    } catch (error) {
      if (error?.name === "AbortError") return { status: "canceled", imagesOmitted };
      throw error;
    }
  }

  const filename = (slugify(cleanTitle) || "documento") + ".md";
  downloadFile({ filename, content: body, type: "text/markdown;charset=utf-8" });
  return { status: "downloaded", imagesOmitted };
};
