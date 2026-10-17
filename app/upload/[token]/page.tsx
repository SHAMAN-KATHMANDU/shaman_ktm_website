export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { resolveUploadSession, hashUploadToken } from "@/lib/upload-sessions";
import { toUploadSessionView } from "@/lib/upload-sessions";
import { rateLimit, clientIp } from "@/lib/oauth/rate-limit";
import { Uploader } from "./uploader";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

// Every failure (unknown, expired, cancelled, rate-limited) looks the same, so
// a link can't be probed — and the person holding a stale link from chat gets
// a plain next step instead of the storefront 404.
function ExpiredLink() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-medium text-ink mb-2">This upload link has expired</h1>
        <p className="text-sm text-ink/70">
          Upload links last 12 hours. Ask the assistant in chat for a new one.
        </p>
      </div>
    </div>
  );
}

export default async function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Rate limit by token hash prefix + IP (same as API routes)
  const tokenHash = hashUploadToken(token);
  const req = new Request(new URL("http://localhost"), {
    headers: await headers(),
  });
  const ip = clientIp(req);
  // Own bucket: sharing the API's would make a reload after a big batch 404.
  const rateLimitKey = `page:${tokenHash.slice(0, 16)}:${ip}`;
  const allowed = rateLimit(rateLimitKey, 120, 60_000);
  if (!allowed) return <ExpiredLink />;

  const session = await resolveUploadSession(token);
  if (!session) return <ExpiredLink />;

  const view = toUploadSessionView(session);

  return (
    <div className="min-h-screen flex flex-col">
      <Uploader token={token} initialSession={view} />
    </div>
  );
}
