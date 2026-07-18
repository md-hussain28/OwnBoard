import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isAxiosError } from "axios";
import { NextResponse } from "next/server";
import { getBackendClient } from "./backend-client";

export async function proxyRequest(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  options: {
    data?: unknown;
    params?: Record<string, string>;
    /** Extra headers; set a key to null to drop an instance default (e.g. Content-Type for FormData). */
    headers?: Record<string, string | null>;
    /** Override the 15s default for slow endpoints (file upload, LLM generation). */
    timeout?: number;
  } = {},
) {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const client = getBackendClient();
    const response = await client.request({
      method,
      url: path,
      data: options.data,
      params: options.params,
      timeout: options.timeout,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    // Backend DELETEs return 204 with an empty body. NextResponse.json(undefined/"" )
    // throws or invents a body, which surfaces as a 500 to the browser.
    if (response.status === 204 || response.data === "" || response.data == null) {
      return new NextResponse(null, { status: response.status });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        return NextResponse.json(error.response.data ?? { error: error.message }, {
          status: error.response.status,
        });
      }
      return NextResponse.json(
        { error: "Backend unreachable", detail: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unexpected proxy error" }, { status: 500 });
  }
}
