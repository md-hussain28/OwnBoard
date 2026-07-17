import { proxyRequest } from "@/lib/api/proxy";

export async function POST() {
  return proxyRequest("post", "/notifications/read-all");
}
