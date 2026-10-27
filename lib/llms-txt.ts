// Builds /llms.txt (llmstxt.org format): a plain-text map of the site for AI
// assistants. Every line comes from the database — no copy is invented here,
// so a missing fact is simply left out rather than guessed.

export interface LlmsTxtInput {
  origin: string;
  tagline?: string;
  contact: { phone?: string; email?: string };
  showrooms: { name: string; address: string }[];
  categories: { slug: string; name: string }[];
  services: { slug: string; name: string; duration?: string | null; pricePerSession?: number | null }[];
  pages: { slug: string; title: string }[];
  posts: { slug: string; title: string }[];
}

const npr = (n: number) => `NPR ${n.toLocaleString("en-US")}`;

export function buildLlmsTxt(d: LlmsTxtInput): string {
  const o = d.origin.replace(/\/+$/, "");
  const out: string[] = ["# Shaman Kathmandu", ""];

  const summary = [
    d.tagline?.trim(),
    d.showrooms.length
      ? `Shop and sound-healing studio with ${d.showrooms.length} showroom${d.showrooms.length === 1 ? "" : "s"} in the Kathmandu Valley, Nepal.`
      : undefined,
  ].filter(Boolean);
  if (summary.length) out.push(`> ${summary.join(" ")}`, "");

  if (d.showrooms.length || d.contact.phone || d.contact.email) {
    out.push("## Visit and contact");
    for (const s of d.showrooms) out.push(`- ${s.name}: ${s.address}`);
    if (d.contact.phone) out.push(`- Phone / WhatsApp: ${d.contact.phone}`);
    if (d.contact.email) out.push(`- Email: ${d.contact.email}`);
    out.push(`- [Showrooms and map](${o}/contact)`, "");
  }

  out.push("## Shop", `- [All products](${o}/products)`);
  for (const c of d.categories) out.push(`- [${c.name}](${o}/categories/${c.slug})`);
  out.push("");

  if (d.services.length) {
    out.push("## Sound healing", `- [All sessions](${o}/energy)`);
    for (const s of d.services) {
      const facts = [s.duration?.trim(), s.pricePerSession && s.pricePerSession > 0 ? npr(s.pricePerSession) : undefined]
        .filter(Boolean)
        .join(", ");
      out.push(`- [${s.name}](${o}/energy/${s.slug})${facts ? `: ${facts}` : ""}`);
    }
    out.push("");
  }

  out.push("## Help", `- [FAQ](${o}/pages/faq)`);
  for (const p of d.pages) out.push(`- [${p.title}](${o}/pages/${p.slug})`);
  out.push("");

  if (d.posts.length) {
    out.push("## Stories");
    for (const p of d.posts) out.push(`- [${p.title}](${o}/stories/${p.slug})`);
    out.push("");
  }

  return out.join("\n");
}
