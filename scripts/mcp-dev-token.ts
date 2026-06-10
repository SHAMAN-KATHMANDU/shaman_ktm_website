// Dev helper: mint an MCP token directly in the DB (bypasses the admin UI).
// Run: pnpm tsx scripts/mcp-dev-token.ts [name] [role]

import { prisma } from "../lib/db";
import { generateMcpToken } from "../lib/mcp/auth";

async function main() {
  const name = process.argv[2] ?? "dev-cli";
  const role = process.argv[3] ?? "owner";
  const { token, tokenHash } = generateMcpToken();
  await prisma.mcpToken.create({
    data: { name, tokenHash, role, createdBy: "dev-script" },
  });
  console.log(token);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
