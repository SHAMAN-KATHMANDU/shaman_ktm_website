// Typed error thrown by lib/cms/* services. REST routes map it to a
// NextResponse (cmsErrorResponse); MCP tools map it to an isError tool result
// (lib/mcp/respond.ts). `availableOptions` carries the valid ids/slugs when a
// reference check fails so AI clients can self-correct.

import { NextResponse } from "next/server";

interface CmsErrorOpts {
  statusCode?: number;
  availableOptions?: string[];
  referenceKind?: string;
}

export class CmsError extends Error {
  statusCode: number;
  availableOptions?: string[];
  referenceKind?: string;

  constructor(message: string, opts: CmsErrorOpts = {}) {
    super(message);
    this.name = "CmsError";
    this.statusCode = opts.statusCode ?? 400;
    this.availableOptions = opts.availableOptions;
    this.referenceKind = opts.referenceKind;
  }
}

export function cmsErrorResponse(err: CmsError): NextResponse {
  return NextResponse.json(
    {
      message: err.message,
      ...(err.availableOptions ? { availableOptions: err.availableOptions } : {}),
    },
    { status: err.statusCode },
  );
}
