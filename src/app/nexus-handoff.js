import { downloadFile } from "./file-actions.js";

// Plain-text handoff v1: NEXUS OS stores Markdown in NoteEntity.body.
// Browser-local image IDs cannot be opened by another Android application.
// Keep the original document unchanged; explain omitted assets in the copy.
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
  // A text/plain Web Share arrives as ACTION_SEND/EXTRA_TEXT on Android.
  // Keep size conservative: direct-share IPC should not carry huge payloads.
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
