import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = request.nextUrl.searchParams.get("file_path") ?? "";
  return proxyRequest("get", `/repos/${id}/experts`, { params: { file_path: filePath } });
}
