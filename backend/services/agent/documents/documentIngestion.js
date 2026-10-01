import { PDFParse } from "pdf-parse";

const MAX_PAGES = 300;
const MAX_EXTRACTED_CHARACTERS = 3_000_000;
const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 180;

const splitPage = (text, pageNumber, fileName) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks = [];
  const stride = CHUNK_SIZE - CHUNK_OVERLAP;
  for (let start = 0; start < normalized.length; start += stride) {
    const content = normalized.slice(start, start + CHUNK_SIZE).trim();
    if (content.length >= 40) chunks.push({ fileName, pageNumber, content });
    if (start + CHUNK_SIZE >= normalized.length) break;
  }
  return chunks;
};

export const extractDocument = async (file) => {
  const extension = file.originalname.toLowerCase().split(".").pop();
  const fileName = file.originalname.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "document";
  let pages;
  let mimeType;

  if (extension === "pdf") {
    if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("This file does not appear to be a valid PDF.");
    }

    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      if (parsed.total > MAX_PAGES) throw new Error(`PDFs are limited to ${MAX_PAGES} pages.`);
      pages = parsed.pages.map((page) => ({ pageNumber: page.num, text: page.text }));
    } finally {
      await parser.destroy();
    }
    mimeType = "application/pdf";
  } else if (["txt", "md", "markdown"].includes(extension)) {
    if (file.buffer.includes(0)) throw new Error("The selected text file contains binary data.");
    pages = [{ pageNumber: 1, text: file.buffer.toString("utf8") }];
    mimeType = extension === "txt" ? "text/plain" : "text/markdown";
  } else {
    throw new Error("Supported files are PDF, TXT, and Markdown.");
  }

  const extractedLength = pages.reduce((total, page) => total + page.text.length, 0);
  if (extractedLength > MAX_EXTRACTED_CHARACTERS) throw new Error("This document contains too much extracted text to index.");

  const chunks = pages.flatMap(({ pageNumber, text }) => splitPage(text, pageNumber, fileName));
  if (chunks.length === 0) throw new Error("No readable text was found. Scanned PDFs need OCR, which is not available yet.");
  if (chunks.length > 5000) throw new Error("This document creates too many text sections to index.");

  return { fileName, mimeType, pageCount: pages.length, chunks };
};
