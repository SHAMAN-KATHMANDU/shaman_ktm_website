// Throwaway smoke test: registers the product tools on an in-memory MCP
// server and lists/calls them through a real client. Run: pnpm tsx scripts/mcp-smoke.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../lib/mcp/server";

async function main() {
  const server = createMcpServer({
    tokenId: "smoke",
    tokenName: "smoke-test",
    role: "owner",
    actor: "mcp:smoke-test",
  });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: "smoke", version: "0.0.0" });
  await client.connect(clientT);

  const tools = await client.listTools();
  console.log(`tools: ${tools.tools.length}`);
  for (const t of tools.tools) console.log(" -", t.name);

  const res = await client.callTool({ name: "list_products", arguments: {} });
  const text = (res.content as { type: string; text: string }[])[0]?.text ?? "";
  console.log("list_products →", text.slice(0, 200));
  process.exit(0);
}

main().catch((e) => {
  console.error("SMOKE FAIL", e);
  process.exit(1);
});
