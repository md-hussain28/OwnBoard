import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAxiosError } from "axios";
import { getBackendClient } from "@/lib/api/backend-client";

export async function proxyRequest(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  options: { data?: unknown; params?: Record<string, string> } = {},
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
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
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
