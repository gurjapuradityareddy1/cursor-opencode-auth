export function parseModelList(output: string): string[] {
  // Cursor CLI output format is not guaranteed; keep this permissive.
  // Common cases:
  // - one model per line
  // - bullet lists
  const lines = output
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s+/, ""))
    .filter(Boolean);

  const looksLikeModelID = (s: string) => /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(s);

  return lines.filter(looksLikeModelID);
}
