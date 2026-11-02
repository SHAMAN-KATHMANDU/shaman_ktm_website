// deploy/prod/nginx.conf must not be able to downgrade production.
//
// The live host serves HTTPS with a 25m body cap. The version of this file
// that shipped before the reconciliation had NO TLS at all and a 1m cap, plus
// a 16m cap on /api/mcp — so installing it would have taken the site off HTTPS
// and started rejecting uploads that work today. `nginx -t` would have passed
// on it, which is exactly why a config test has to exist: validity is not the
// property we care about, parity with live behaviour is.
//
// These assertions are deliberately written against the LIVE behaviour
// recorded in deploy/prod/RECONCILIATION-2026-08-21.md, not against whatever
// the file happens to say. If a future edit removes TLS or lowers a cap, this
// fails rather than shipping quietly.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const conf = readFileSync(path.join(root, "deploy/prod/nginx.conf"), "utf8");
const bootstrap = readFileSync(
  path.join(root, "deploy/prod/nginx-bootstrap.conf"),
  "utf8",
);
const script = readFileSync(
  path.join(root, "deploy/prod/setup-nginx.sh"),
  "utf8",
);

/** Body caps as written, in declaration order. */
const bodyCaps = (s: string): string[] =>
  [...s.matchAll(/client_max_body_size\s+(\S+?);/g)].map((m) => m[1]);

describe("nginx.conf carries the live TLS termination", () => {
  it("listens on 443 with ssl for both server names", () => {
    expect(conf.match(/listen\s+443 ssl;/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("names the certificate and key", () => {
    expect(conf).toMatch(/ssl_certificate\s+\/etc\/letsencrypt\/live\//);
    expect(conf).toMatch(/ssl_certificate_key\s+\/etc\/letsencrypt\/live\//);
  });

  it("keeps the certbot ssl options and dhparam", () => {
    expect(conf).toMatch(/include\s+\/etc\/letsencrypt\/options-ssl-nginx\.conf;/);
    expect(conf).toMatch(/ssl_dhparam\s+\/etc\/letsencrypt\/ssl-dhparams\.pem;/);
  });

  it("still redirects plain HTTP to HTTPS", () => {
    expect(conf).toMatch(/listen\s+80;/);
    expect(conf).toMatch(/return 301 https:\/\/www\.shamankathmandu\.com\$request_uri;/);
  });
});

describe("no body cap is ever below the 25m the box already serves", () => {
  it("declares at least one cap", () => {
    expect(bodyCaps(conf).length).toBeGreaterThan(0);
  });

  it("sets every cap to 25m", () => {
    expect(bodyCaps(conf)).toEqual(bodyCaps(conf).map(() => "25m"));
  });

  it("does not reintroduce the 16m cap on /api/mcp — that would be a CUT from 25m", () => {
    expect(conf).not.toMatch(/client_max_body_size\s+16m;/);
  });

  it("does not reintroduce the 1m default cap", () => {
    expect(conf).not.toMatch(/client_max_body_size\s+1m;/);
  });
});

describe("the two timeout blocks the reconciliation adopted", () => {
  it("gives the product export 120s", () => {
    const block = conf.match(
      /location = \/api\/sysuser\/products\/export \{[\s\S]*?\}/,
    )?.[0];
    expect(block, "export location block is missing").toBeTruthy();
    expect(block).toMatch(/proxy_read_timeout 120s;/);
  });

  it("gives /api/mcp 60s", () => {
    const block = conf.match(/location = \/api\/mcp \{[\s\S]*?\}/)?.[0];
    expect(block, "/api/mcp location block is missing").toBeTruthy();
    expect(block).toMatch(/proxy_read_timeout 60s;/);
  });
});

describe("the bootstrap config exists and stays http-only", () => {
  it("has no TLS directives — it runs on a box with no certificates", () => {
    expect(bootstrap).not.toMatch(/listen\s+443/);
    expect(bootstrap).not.toMatch(/ssl_certificate/);
  });

  it("still serves the ACME challenge, or certbot can never succeed", () => {
    expect(bootstrap).toMatch(/location \/\.well-known\/acme-challenge\//);
  });

  it("matches the reconciled caps, so promoting the box changes nothing else", () => {
    expect(bodyCaps(bootstrap)).toEqual(bodyCaps(bootstrap).map(() => "25m"));
  });
});

describe("setup-nginx.sh refuses before it writes", () => {
  it("puts the regular-file refusal ahead of the copy", () => {
    const refusal = script.indexOf("is a regular file, not a symlink");
    const copy = script.indexOf('cp "$SITE_SOURCE"');
    expect(refusal, "refusal text not found").toBeGreaterThan(-1);
    expect(copy, "copy not found").toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(copy);
  });

  it("no longer tells the operator to symlink over the live file", () => {
    expect(script).not.toMatch(/rm \$\{NGINX_ENABLED\} && sudo ln -s/);
    expect(script).toMatch(/RECONCILIATION-2026-08-21\.md/);
  });

  it("chooses the bootstrap config when no certificate directory exists", () => {
    expect(script).toMatch(/-d "\/etc\/letsencrypt\/live\/\$\{WWW_DOMAIN\}"/);
    expect(script).toMatch(/nginx-bootstrap\.conf/);
  });
});
