import { proxyRequest } from "@/lib/api/proxy";

export async function GET() {
  return proxyRequest("get", "/notifications");
}
