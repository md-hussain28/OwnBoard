import { type NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET() {
  return proxyRequest("get", "/domains");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyRequest("post", "/domains", { data: body });
}
