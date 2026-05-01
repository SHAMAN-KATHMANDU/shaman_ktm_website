// Tiny markdown renderer.
// Goals:
// - Render product `description` and blog `bodyMarkdown` without pulling in
//   a 200kB markdown library at this stage of the build.
// - Allow-list a handful of safe iframe providers for video stories.
// - Split a product description into named tabs by H2 headings.
//
// Limitations:
// - Supports paragraphs, H1-H3, bold, italic, links, ordered/unordered lists,
//   and a single line of HTML iframe (must be on its own line).
// - No tables, no images, no nested lists. We can swap in a real parser
//   later if the CMS authors push past these limits.

export interface ProductTabs {
  about: string;
  howToUse: string | null;
  elementStory: string | null;
}

const IFRAME_ALLOW = [
  /^https:\/\/(www\.)?youtube\.com\/embed\//,
  /^https:\/\/(www\.)?youtube-nocookie\.com\/embed\//,
  /^https:\/\/player\.vimeo\.com\/video\//,
  /^https:\/\/(www\.)?instagram\.com\/(reel|p)\//,
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(line: string): string {
  let out = escapeHtml(line);
  // links: [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text: string, url: string) => {
      const safeUrl = /^https?:\/\//.test(url) ? url : "#";
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-gold underline-offset-4 hover:underline">${text}</a>`;
    },
  );
  // bold **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic _x_ or *x*
  out = out.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?=[^*]|$)/g, "$1<em>$2</em>");
  return out;
}

function isAllowedIframe(line: string): string | null {
  const m = line.match(/^<iframe\s+[^>]*src="([^"]+)"[^>]*>\s*<\/iframe>\s*$/i);
  if (!m) return null;
  const src = m[1];
  if (!IFRAME_ALLOW.some((re) => re.test(src))) return null;
  return `<div class="aspect-video w-full overflow-hidden border border-[var(--color-border)]"><iframe src="${escapeHtml(src)}" class="w-full h-full" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}

/** Render a markdown string to a safe HTML string. */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p class="mb-4 leading-relaxed">${para.map(renderInline).join(" ")}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.type;
      const items = list.items
        .map((i) => `<li class="mb-1">${renderInline(i)}</li>`)
        .join("");
      out.push(
        `<${tag} class="mb-4 ml-5 ${tag === "ul" ? "list-disc" : "list-decimal"}">${items}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushPara();
      flushList();
      continue;
    }
    const iframe = isAllowedIframe(line);
    if (iframe) {
      flushPara();
      flushList();
      out.push(iframe);
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^###\s+(.*)$/))) {
      flushPara();
      flushList();
      out.push(
        `<h3 class="font-display text-2xl mt-6 mb-3">${renderInline(m[1])}</h3>`,
      );
      continue;
    }
    if ((m = line.match(/^##\s+(.*)$/))) {
      flushPara();
      flushList();
      out.push(
        `<h2 class="font-display text-3xl mt-8 mb-4">${renderInline(m[1])}</h2>`,
      );
      continue;
    }
    if ((m = line.match(/^#\s+(.*)$/))) {
      flushPara();
      flushList();
      out.push(
        `<h1 class="font-display text-4xl mt-8 mb-4">${renderInline(m[1])}</h1>`,
      );
      continue;
    }
    if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      flushPara();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join("\n");
}

/**
 * Split a product description into About / How to Use / Element Story by
 * H2 headings. Anything before the first H2 is About.
 */
export function parseProductTabs(description: string): ProductTabs {
  const HEADINGS = ["how to use", "element story"] as const;
  const lines = description.replace(/\r\n/g, "\n").split("\n");
  const sections: { name: "about" | "howToUse" | "elementStory"; lines: string[] }[] = [
    { name: "about", lines: [] },
  ];
  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      const heading = m[1].trim().toLowerCase();
      if (heading.startsWith("how to use")) {
        sections.push({ name: "howToUse", lines: [] });
        continue;
      }
      if (heading.startsWith("element story")) {
        sections.push({ name: "elementStory", lines: [] });
        continue;
      }
      // Unknown H2 — keep in current section as-is
    }
    sections[sections.length - 1].lines.push(line);
    void HEADINGS;
  }
  const lookup = (name: "about" | "howToUse" | "elementStory") => {
    const s = sections.find((x) => x.name === name);
    if (!s) return null;
    const text = s.lines.join("\n").trim();
    return text || null;
  };
  return {
    about: lookup("about") ?? "",
    howToUse: lookup("howToUse"),
    elementStory: lookup("elementStory"),
  };
}
