// Input guard: length, PII masking, normalization/hash for caching (docs/14 §8). Port of guard.py.

export const MAX_CHARS = 1000;

const PII: [RegExp, string][] = [
  [/(?<![\p{L}\p{N}_])(?:\+62|62|0)8\d{7,11}(?![\p{L}\p{N}_])/gu, "[nomor HP]"],
  [/[\p{L}\p{N}_.+-]+@[\p{L}\p{N}_-]+\.[\p{L}\p{N}_.]+/gu, "[email]"],
  [/(?<![\p{L}\p{N}_])\d{16}(?![\p{L}\p{N}_])/gu, "[NIK]"],
  [/(?<![\p{L}\p{N}_])\d{10}(?![\p{L}\p{N}_])/gu, "[NISN]"],
  [/(?<![\p{L}\p{N}_])(?:jl|jalan)\.?\s+[^\n,.]{3,40}/giu, "[alamat]"],
];
const BLOCKLIST = ["anjing lo", "bangsat", "kontol", "memek", "ngentot"];

export function maskPii(text: string): string {
  for (const [pattern, repl] of PII) text = text.replace(pattern, repl);
  return text;
}

export function normalizeText(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

export async function textHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeText(text).toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasBlockedWords(text: string): boolean {
  const low = text.toLowerCase();
  return BLOCKLIST.some((w) => low.includes(w));
}
