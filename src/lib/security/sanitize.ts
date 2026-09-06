const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function sanitizeFilename(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const base = trimmed.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(UNSAFE_CHARS, "_").replace(/^\.+/, "").slice(0, 180);
  const name = cleaned || "file";
  const stem = name.replace(/\.[^.]+$/, "");
  if (WINDOWS_RESERVED.test(stem)) {
    return `_${name}`;
  }
  return name;
}

export function sanitizeSearchQuery(input: string): string {
  return input.trim().slice(0, 200);
}
