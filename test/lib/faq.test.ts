import { describe, it, expect } from "vitest";
import { extractFaqItems, markdownToText, buildFaqPage } from "@/lib/faq";

describe("faq/extractFaqItems", () => {
  it("pairs each `## Question?` with the answer below it", () => {
    const items = extractFaqItems(
      "## Do you ship?\n\nYes, **across Nepal**.\n\n## How do I pay?\n\nCash on delivery.",
    );
    expect(items.map((i) => i.question)).toEqual(["Do you ship?", "How do I pay?"]);
    expect(items[0].answerMarkdown).toBe("Yes, **across Nepal**.");
    expect(items[0].answerText).toBe("Yes, across Nepal.");
  });

  it("ignores intro text and headings that aren't questions", () => {
    const items = extractFaqItems(
      "Intro paragraph.\n\n## Shipping\n\nWe ship.\n\n## Do you ship abroad?\n\nBy request.\n\n### Notes\n\nNot part of the answer.",
    );
    expect(items).toHaveLength(1);
    expect(items[0].question).toBe("Do you ship abroad?");
    expect(items[0].answerText).toBe("By request.");
  });

  it("accepts the full-width question mark and skips empty answers", () => {
    const items = extractFaqItems("## सोध्न सकिन्छ？\n\nसकिन्छ।\n\n## Empty?\n\n");
    expect(items.map((i) => i.question)).toEqual(["सोध्न सकिन्छ？"]);
  });
});

describe("faq/markdownToText", () => {
  it("drops links, emphasis and list markers but keeps the words", () => {
    expect(
      markdownToText("See the [Exchange Policy](/pages/exchange).\n\n- **Thamel** — Mandala St\n- Gongabu"),
    ).toBe("See the Exchange Policy. Thamel — Mandala St. Gongabu.");
  });
});

describe("faq/buildFaqPage", () => {
  it("emits schema.org Question/Answer pairs", () => {
    const ld = buildFaqPage(extractFaqItems("## A?\n\nB"));
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "A?",
      acceptedAnswer: { "@type": "Answer", text: "B" },
    });
  });
});
