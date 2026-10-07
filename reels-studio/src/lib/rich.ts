export type Token = {text: string; accent: boolean};

// Акцент в тексте: **слова** красятся в синий (accent).
export const parseRich = (s: string): Token[] => {
  const out: Token[] = [];
  s.split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
    if (!part) return;
    const accent = part.length > 4 && part.startsWith("**") && part.endsWith("**");
    const clean = accent ? part.slice(2, -2) : part;
    clean
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => out.push({text: w, accent}));
  });
  return out;
};
