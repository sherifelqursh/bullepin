const PALETTE = [
  "#F9DCC4",
  "#F2C77E",
  "#BFD9E8",
  "#D9D2CB",
  "#F1C7B6",
  "#E8B4BC",
  "#A8C4A2",
  "#C9B6E4",
];

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function resolveImageUrl(url: string | null | undefined) {
  if (!url) return null;
  // Cloud Storage download URLs are fully-qualified https URLs already,
  // so we just pass them through (and any data: previews).
  return url;
}
