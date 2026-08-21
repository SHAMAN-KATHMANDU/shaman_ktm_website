// Guards behind the MCP `upload_media` tool: SSRF host checks, Google Drive
// link rewriting, content sniffing, base64 decoding/caps, remote fetch
// behaviour (with a stubbed fetch), and the request schemas.

import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { CmsError } from "@/lib/cms/errors";
import {
  assertPublicHost,
  isPrivateAddress,
  rewriteDriveUrl,
  sniffMedia,
  looksLikeText,
  MAX_BASE64_BYTES,
  MAX_FETCH_BYTES,
} from "@/lib/cms/media-guards";
import { decodeBase64Media, fetchRemoteMedia } from "@/lib/cms/media";
import {
  UploadMediaRequest,
  AddProductImagesRequest,
  SetEntityImageRequest,
  ReorderProductImagesRequest,
} from "@/lib/validation/schemas";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/s3", () => ({
  presignPut: vi.fn(),
  putObject: vi.fn(),
  s3PublicUrl: (k: string) => `https://cdn.test/${k}`,
  objectHead: vi.fn(),
}));

async function expectCms(p: Promise<unknown>, status: number, re?: RegExp) {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(CmsError);
    expect((err as CmsError).statusCode).toBe(status);
    if (re) expect((err as CmsError).message).toMatch(re);
    return;
  }
  throw new Error("expected a CmsError");
}

describe("SSRF guard", () => {
  it("classifies private / special addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:127.0.0.1",
      "not-an-ip",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "13.233.10.5", "2606:4700::1111"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("rejects loopback hostnames and literal private IPs without DNS", async () => {
    const resolver = vi.fn();
    await expectCms(assertPublicHost("localhost", resolver), 400, /loopback/);
    await expectCms(assertPublicHost("foo.localhost", resolver), 400);
    await expectCms(assertPublicHost("169.254.169.254", resolver), 400, /private/);
    await expectCms(assertPublicHost("[::1]", resolver), 400);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("rejects hostnames that resolve to private addresses (rebinding)", async () => {
    const resolver = vi.fn(async () => [
      { address: "13.233.10.5" },
      { address: "10.0.0.7" },
    ]);
    await expectCms(assertPublicHost("evil.example", resolver), 400, /10\.0\.0\.7/);
  });

  it("accepts public hosts and rejects unresolvable ones", async () => {
    await expect(
      assertPublicHost("cdn.example", async () => [{ address: "13.233.10.5" }]),
    ).resolves.toBeUndefined();
    await expectCms(
      assertPublicHost("nope.example", async () => {
        throw new Error("ENOTFOUND");
      }),
      400,
      /resolve/,
    );
    await expectCms(assertPublicHost("empty.example", async () => []), 400);
  });
});

describe("rewriteDriveUrl", () => {
  it("rewrites /file/d/<id>/view and open?id= share links", () => {
    expect(
      rewriteDriveUrl("https://drive.google.com/file/d/1AbC_d-9/view?usp=sharing"),
    ).toBe("https://drive.google.com/uc?export=download&id=1AbC_d-9");
    expect(rewriteDriveUrl("https://drive.google.com/open?id=XYZ")).toBe(
      "https://drive.google.com/uc?export=download&id=XYZ",
    );
  });
  it("leaves other URLs untouched", () => {
    const u = "https://example.com/photo.jpg";
    expect(rewriteDriveUrl(u)).toBe(u);
    expect(rewriteDriveUrl("https://drive.google.com/drive/folders/abc")).toBe(
      "https://drive.google.com/drive/folders/abc",
    );
    expect(rewriteDriveUrl("not a url")).toBe("not a url");
  });
});

describe("sniffMedia", () => {
  it("detects a real PNG regardless of declared type and returns dimensions", async () => {
    const png = await sharp({
      create: { width: 12, height: 7, channels: 3, background: "#f00" },
    })
      .png()
      .toBuffer();
    const r = await sniffMedia(png, "image/jpeg");
    expect(r).toEqual({ mime: "image/png", width: 12, height: 7 });
  });

  it("rejects HTML declared as an image", async () => {
    const html = Buffer.from("<!doctype html><html><body>login</body></html>");
    await expectCms(sniffMedia(html, "image/jpeg"), 422);
  });

  it("rejects SVG (recognised but not allowlisted)", async () => {
    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>',
    );
    await expectCms(sniffMedia(svg, "image/svg+xml"), 400, /svg/i);
  });

  it("trusts an allowlisted video type when bytes are binary", async () => {
    const fakeMp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from("ftypmp42"),
      Buffer.alloc(64, 0x9c),
    ]);
    await expect(sniffMedia(fakeMp4, "video/mp4")).resolves.toEqual({
      mime: "video/mp4",
    });
    await expectCms(sniffMedia(fakeMp4, "video/x-msvideo"), 422);
    await expectCms(sniffMedia(fakeMp4, null), 422);
    await expectCms(
      sniffMedia(Buffer.from("<html>nope</html>"), "video/mp4"),
      422,
    );
  });

  it("looksLikeText heuristics", () => {
    expect(looksLikeText(Buffer.from("  <!DOCTYPE html>"))).toBe(true);
    expect(looksLikeText(Buffer.from('{"error":"x"}'))).toBe(true);
    expect(looksLikeText(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2]))).toBe(false);
  });
});

describe("decodeBase64Media", () => {
  it("decodes raw and data: URL payloads", () => {
    const raw = Buffer.from("hello").toString("base64");
    expect(decodeBase64Media(raw).toString()).toBe("hello");
    expect(decodeBase64Media(`data:image/png;base64,${raw}`).toString()).toBe(
      "hello",
    );
    expect(decodeBase64Media(`aGVs\nbG8=`).toString()).toBe("hello");
  });
  it("rejects payloads over the cap before decoding, and junk", () => {
    const over = "A".repeat(Math.ceil((MAX_BASE64_BYTES + 1024) / 3) * 4);
    expect(() => decodeBase64Media(over)).toThrow(/cap is 10 MB/);
    expect(() => decodeBase64Media("!!!not base64!!!")).toThrow(/invalid/);
    expect(() => decodeBase64Media("   ")).toThrow(CmsError);
  });
});

describe("fetchRemoteMedia", () => {
  const png = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "#0f0" } })
      .png()
      .toBuffer();

  function stubFetch(map: Record<string, () => Response>) {
    return vi.fn(async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input.toString() : String(input);
      const make = map[url];
      if (!make) throw new Error(`unexpected fetch ${url}`);
      return make();
    }) as unknown as typeof fetch;
  }

  it("refuses non-https and private targets before fetching", async () => {
    const f = stubFetch({});
    await expectCms(fetchRemoteMedia("http://example.com/a.jpg", f), 400, /https/);
    await expectCms(fetchRemoteMedia("https://127.0.0.1/a.jpg", f), 400);
    await expectCms(fetchRemoteMedia("https://user:pw@example.com/a.jpg", f), 400);
    expect(f).not.toHaveBeenCalled();
  });

  it("follows redirects (re-checking hosts) and returns bytes + filename", async () => {
    const body = await png();
    const f = stubFetch({
      "https://8.8.8.8/start": () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://8.8.4.4/final/photo.png" },
        }),
      "https://8.8.4.4/final/photo.png": () =>
        new Response(body, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    });
    const r = await fetchRemoteMedia("https://8.8.8.8/start", f);
    expect(r.mime).toBe("image/png");
    expect(r.filename).toBe("photo.png");
    expect(Buffer.compare(r.buffer, body)).toBe(0);
  });

  it("rejects redirects into private space", async () => {
    const f = stubFetch({
      "https://8.8.8.8/x": () =>
        new Response(null, {
          status: 301,
          headers: { location: "https://169.254.169.254/latest/meta-data" },
        }),
    });
    await expectCms(fetchRemoteMedia("https://8.8.8.8/x", f), 400, /private/);
  });

  it("rejects HTML pages (private Drive links) with a hint", async () => {
    const f = stubFetch({
      "https://drive.google.com/uc?export=download&id=abc": () =>
        new Response("<!doctype html><html>Sign in</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    });
    await expectCms(
      fetchRemoteMedia("https://drive.google.com/file/d/abc/view", f),
      422,
      /anyone with the link/,
    );
  });

  it("enforces the size cap from content-length and while streaming", async () => {
    const f = stubFetch({
      "https://8.8.8.8/big": () =>
        new Response(new Uint8Array(16), {
          status: 200,
          headers: {
            "content-type": "video/mp4",
            "content-length": String(MAX_FETCH_BYTES + 1),
          },
        }),
      "https://8.8.8.8/stream": () =>
        new Response(
          new ReadableStream({
            start(c) {
              const chunk = new Uint8Array(1024 * 1024).fill(0x9c);
              for (let i = 0; i < 27; i++) c.enqueue(chunk);
              c.close();
            },
          }),
          { status: 200, headers: { "content-type": "video/mp4" } },
        ),
    });
    await expectCms(fetchRemoteMedia("https://8.8.8.8/big", f), 413);
    await expectCms(fetchRemoteMedia("https://8.8.8.8/stream", f), 413);
  });

  it("surfaces non-2xx statuses", async () => {
    const f = stubFetch({
      "https://8.8.8.8/gone": () => new Response("nope", { status: 404 }),
    });
    await expectCms(fetchRemoteMedia("https://8.8.8.8/gone", f), 422, /404/);
  });
});

describe("request schemas", () => {
  it("UploadMediaRequest is a plain object schema usable as MCP inputSchema", () => {
    expect(Object.keys(UploadMediaRequest.shape)).toEqual([
      "sourceUrl",
      "base64",
      "contentType",
      "filename",
      "alt",
    ]);
    expect(
      UploadMediaRequest.safeParse({ sourceUrl: "https://x.test/a.jpg" }).success,
    ).toBe(true);
    expect(
      UploadMediaRequest.safeParse({ base64: "AAAA", contentType: "image/svg+xml" })
        .success,
    ).toBe(false);
  });

  it("attach schemas validate references", () => {
    expect(
      AddProductImagesRequest.safeParse({
        productId: "p1",
        images: [{ url: "https://cdn.test/a.jpg", alt: "x" }],
      }).success,
    ).toBe(true);
    expect(
      AddProductImagesRequest.safeParse({ productId: "p1", images: [] }).success,
    ).toBe(false);
    expect(
      AddProductImagesRequest.safeParse({
        productId: "p1",
        images: [{ url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
    expect(
      ReorderProductImagesRequest.safeParse({ productId: "p1", imageIds: [] })
        .success,
    ).toBe(false);
    expect(
      SetEntityImageRequest.safeParse({
        target: "collection.heroImageUrl",
        entityId: "c1",
        url: null,
      }).success,
    ).toBe(true);
    expect(
      SetEntityImageRequest.safeParse({
        target: "showroom.thumbnailUrl",
        entityId: "x",
        url: "/a.jpg",
      }).success,
    ).toBe(false);
  });
});
