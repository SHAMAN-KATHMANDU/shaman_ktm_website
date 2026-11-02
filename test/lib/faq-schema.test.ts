import { describe, it, expect } from "vitest";
import { FaqSchema } from "@/lib/validation/schemas";
import { renderMarkdown } from "@/lib/markdown";

describe("FaqSchema", () => {
  it("fills placement defaults so a bare question lands on /pages/faq", () => {
    const d = FaqSchema.parse({ question: "Do you ship?", answer: "Yes." });
    expect(d).toMatchObject({
      topic: "general",
      showOnHome: false,
      published: true,
      position: 0,
    });
    expect(d.categoryId).toBeUndefined();
  });

  it("rejects a topic outside FAQ_TOPICS and blank questions", () => {
    expect(FaqSchema.safeParse({ question: "Q?", answer: "A", topic: "misc" }).success).toBe(false);
    expect(FaqSchema.safeParse({ question: "   ", answer: "A" }).success).toBe(false);
  });
});

// FAQ answers link to internal pages ("see our [Exchange Policy](/pages/exchange)").
describe("renderMarkdown links", () => {
  it("keeps site-relative links, in the same tab", () => {
    const html = renderMarkdown("See [our policy](/pages/exchange).");
    expect(html).toContain('<a href="/pages/exchange"');
    expect(html).not.toContain('target="_blank"');
  });

  it("opens external links in a new tab", () => {
    expect(renderMarkdown("[WhatsApp](https://wa.me/9779820151135)")).toContain(
      'href="https://wa.me/9779820151135" target="_blank"',
    );
  });

  it("neutralises protocol-relative and script URLs", () => {
    expect(renderMarkdown("[x](//evil.example)")).toContain('href="#"');
    expect(renderMarkdown("[x](javascript:alert(1))")).toContain('href="#"');
  });
});
